-- Run against a disposable database after migrations through 023.
-- Behavioral fixtures run inside a rollback.
\set ON_ERROR_STOP on

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'remove_organization_member'
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'remove_organization_member lacks secure configuration';
  end if;

  if has_function_privilege(
       'anon',
       'public.remove_organization_member(uuid)',
       'execute'
     )
     or not has_function_privilege(
       'authenticated',
       'public.remove_organization_member(uuid)',
       'execute'
     ) then
    raise exception 'remove_organization_member grants are incorrect';
  end if;
end;
$$;

begin;

create function pg_temp.reject_member_removed_history()
returns trigger
language plpgsql
as $$
begin
  if new.reason_code = 'member_removed' then
    raise exception 'forced assignment-history failure';
  end if;
  return new;
end;
$$;

do $$
declare
  v_owner uuid := '02300000-0000-4000-8000-000000000001';
  v_admin uuid := '02300000-0000-4000-8000-000000000002';
  v_member uuid := '02300000-0000-4000-8000-000000000003';
  v_other_owner uuid := '02300000-0000-4000-8000-000000000004';
  v_outsider uuid := '02300000-0000-4000-8000-000000000005';
  v_atomic_member uuid := '02300000-0000-4000-8000-000000000006';
  v_org uuid := '02300000-0000-4000-8000-000000000101';
  v_other_org uuid := '02300000-0000-4000-8000-000000000102';
  v_member_id uuid := '02300000-0000-4000-8000-000000000201';
  v_owner_member_id uuid := '02300000-0000-4000-8000-000000000202';
  v_atomic_member_id uuid := '02300000-0000-4000-8000-000000000203';
  v_opportunity_one uuid := '02300000-0000-4000-8000-000000000301';
  v_opportunity_two uuid := '02300000-0000-4000-8000-000000000302';
  v_terminal_opportunity uuid := '02300000-0000-4000-8000-000000000305';
  v_other_opportunity uuid := '02300000-0000-4000-8000-000000000303';
  v_atomic_opportunity uuid := '02300000-0000-4000-8000-000000000304';
  v_prior_history uuid := '02300000-0000-4000-8000-000000000401';
begin
  insert into auth.users (id, email)
  values
    (v_owner, 'pr43b4-owner@example.invalid'),
    (v_admin, 'pr43b4-admin@example.invalid'),
    (v_member, 'pr43b4-member@example.invalid'),
    (v_other_owner, 'pr43b4-other-owner@example.invalid'),
    (v_outsider, 'pr43b4-outsider@example.invalid'),
    (v_atomic_member, 'pr43b4-atomic@example.invalid');

  insert into public.organizations (id, name)
  values
    (v_org, 'PR4.3B4 removal validation'),
    (v_other_org, 'PR4.3B4 unrelated organization');

  insert into public.organization_members (
    id,
    organization_id,
    user_id,
    role
  )
  values
    (v_owner_member_id, v_org, v_owner, 'owner'),
    ('02300000-0000-4000-8000-000000000204', v_org, v_admin, 'admin'),
    (v_member_id, v_org, v_member, 'member'),
    (v_atomic_member_id, v_org, v_atomic_member, 'member'),
    ('02300000-0000-4000-8000-000000000205',
      v_other_org, v_other_owner, 'owner'),
    ('02300000-0000-4000-8000-000000000206',
      v_other_org, v_member, 'member');

  insert into public.opportunities (
    id,
    organization_id,
    user_id,
    origin,
    status,
    service_type,
    summary,
    assigned_user_id
  )
  values
    (v_opportunity_one, v_org, v_owner, 'direct', 'new',
      'hvac', 'Removal one', v_member),
    (v_opportunity_two, v_org, v_owner, 'direct', 'quoted',
      'hvac', 'Removal two', v_member),
    (v_terminal_opportunity, v_org, v_owner, 'direct', 'won',
      'hvac', 'Completed assignment remains historical', v_member),
    (v_other_opportunity, v_other_org, v_other_owner, 'direct', 'opened',
      'hvac', 'Unrelated', v_member),
    (v_atomic_opportunity, v_org, v_owner, 'direct', 'quoted',
      'hvac', 'Atomic rollback', v_atomic_member);

  insert into public.opportunity_assignment_history (
    id,
    opportunity_id,
    previous_assigned_user_id,
    new_assigned_user_id,
    actor_user_id,
    source_system,
    reason_code
  )
  values (
    v_prior_history,
    v_opportunity_one,
    null,
    v_member,
    v_owner,
    'vendor_os',
    'initial_assignment'
  );

  -- Unauthorized removal remains denied and changes nothing.
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  begin
    perform public.remove_organization_member(v_member_id);
    raise exception 'unauthorized removal unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'unauthorized removal unexpectedly succeeded' then
      raise;
    end if;
  end;
  if not exists (
    select 1 from public.organization_members where id = v_member_id
  ) or (
    select count(*) from public.opportunities
    where organization_id = v_org and assigned_user_id = v_member
  ) <> 3 then
    raise exception 'unauthorized removal changed assignment state';
  end if;

  -- An owner cannot be removed by another authorized member.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  begin
    perform public.remove_organization_member(v_owner_member_id);
    raise exception 'owner removal unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'owner removal unexpectedly succeeded' then
      raise;
    end if;
  end;

  -- Admin removal clears every current assignment and records exact history.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform public.remove_organization_member(v_member_id);

  if exists (
    select 1 from public.organization_members where id = v_member_id
  ) then
    raise exception 'member was not removed';
  end if;
  if exists (
    select 1 from public.opportunities
    where organization_id = v_org
      and assigned_user_id = v_member
      and status in ('new', 'opened', 'quoting', 'quoted')
  ) then
    raise exception 'active member assignments were not cleared';
  end if;
  if (
    select count(*)
    from public.opportunity_assignment_history
    where opportunity_id in (v_opportunity_one, v_opportunity_two)
      and previous_assigned_user_id = v_member
      and new_assigned_user_id is null
      and actor_user_id = v_admin
      and source_system = 'vendor_os'
      and reason_code = 'member_removed'
  ) <> 2 then
    raise exception 'member-removal assignment history is incomplete';
  end if;
  if not exists (
    select 1
    from public.opportunity_assignment_history
    where id = v_prior_history
      and new_assigned_user_id = v_member
      and reason_code = 'initial_assignment'
  ) then
    raise exception 'existing assignment history was not preserved';
  end if;
  if (select status from public.opportunities where id = v_opportunity_one)
       <> 'new'
     or (select status from public.opportunities where id = v_opportunity_two)
       <> 'quoted' then
    raise exception 'member removal changed opportunity status';
  end if;
  if (select assigned_user_id from public.opportunities
      where id = v_terminal_opportunity) is distinct from v_member
     or exists (
       select 1
       from public.opportunity_assignment_history
       where opportunity_id = v_terminal_opportunity
         and reason_code = 'member_removed'
     ) then
    raise exception 'member removal changed a terminal opportunity assignment';
  end if;
  if (select assigned_user_id from public.opportunities
      where id = v_other_opportunity) is distinct from v_member then
    raise exception 'member removal changed another organization';
  end if;

  -- Remaining authorized members can still read the preserved history via RLS.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  if (
    select count(*)
    from public.opportunity_assignment_history
    where opportunity_id in (v_opportunity_one, v_opportunity_two)
      and reason_code = 'member_removed'
  ) <> 2 then
    raise exception 'authorized member cannot read removal history';
  end if;
  reset role;

  -- Force history insertion to fail and prove assignment/member rollback.
  create trigger reject_member_removed_history
    before insert on public.opportunity_assignment_history
    for each row execute function pg_temp.reject_member_removed_history();

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin
    perform public.remove_organization_member(v_atomic_member_id);
    raise exception 'forced-failure removal unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'forced-failure removal unexpectedly succeeded' then
      raise;
    end if;
  end;

  if not exists (
    select 1 from public.organization_members where id = v_atomic_member_id
  ) or (select assigned_user_id from public.opportunities
        where id = v_atomic_opportunity) is distinct from v_atomic_member
     or exists (
       select 1 from public.opportunity_assignment_history
       where opportunity_id = v_atomic_opportunity
         and reason_code = 'member_removed'
     ) then
    raise exception 'member-removal rollback was not atomic';
  end if;

  drop trigger reject_member_removed_history
    on public.opportunity_assignment_history;
end;
$$;

rollback;
