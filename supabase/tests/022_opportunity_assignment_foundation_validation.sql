-- Run against a disposable database after migrations through 022.
-- Behavioral fixtures run inside a rollback.
\set ON_ERROR_STOP on

do $$
begin
  if to_regclass('public.opportunity_assignment_history') is null then
    raise exception 'opportunity_assignment_history is missing';
  end if;

  if not (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'opportunity_assignment_history'
  ) then
    raise exception 'assignment history RLS is not enabled';
  end if;

  if to_regclass(
    'public.opportunity_assignment_history_opportunity_time_idx'
  ) is null then
    raise exception 'assignment history index is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'opportunities_require_assignment'
      and not tgisinternal
  ) then
    raise exception 'assignment trigger guard is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'assign_opportunity'
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'assign_opportunity lacks SECURITY DEFINER or safe search_path';
  end if;

  if has_function_privilege(
       'anon',
       'public.assign_opportunity(uuid,uuid,timestamptz,text)',
       'execute'
     )
     or not has_function_privilege(
       'authenticated',
       'public.assign_opportunity(uuid,uuid,timestamptz,text)',
       'execute'
     ) then
    raise exception 'assign_opportunity grants are incorrect';
  end if;

  if has_table_privilege(
       'authenticated',
       'public.opportunity_assignment_history',
       'insert'
     )
     or has_table_privilege(
       'authenticated',
       'public.opportunity_assignment_history',
       'update'
     )
     or has_table_privilege(
       'authenticated',
       'public.opportunity_assignment_history',
       'delete'
     )
     or not has_table_privilege(
       'authenticated',
       'public.opportunity_assignment_history',
       'select'
     )
     or has_table_privilege(
       'anon',
       'public.opportunity_assignment_history',
       'select'
     ) then
    raise exception 'assignment history grants are not append-only';
  end if;
end;
$$;

begin;

do $$
declare
  v_owner uuid := '02200000-0000-4000-8000-000000000001';
  v_admin uuid := '02200000-0000-4000-8000-000000000002';
  v_member uuid := '02200000-0000-4000-8000-000000000003';
  v_other_member uuid := '02200000-0000-4000-8000-000000000004';
  v_pending uuid := '02200000-0000-4000-8000-000000000005';
  v_removed uuid := '02200000-0000-4000-8000-000000000006';
  v_outsider uuid := '02200000-0000-4000-8000-000000000007';
  v_personal_owner uuid := '02200000-0000-4000-8000-000000000008';
  v_org uuid := '02200000-0000-4000-8000-000000000101';
  v_other_org uuid := '02200000-0000-4000-8000-000000000102';
  v_owner_opportunity uuid := '02200000-0000-4000-8000-000000000201';
  v_member_opportunity uuid := '02200000-0000-4000-8000-000000000202';
  v_denied_opportunity uuid := '02200000-0000-4000-8000-000000000203';
  v_stale_opportunity uuid := '02200000-0000-4000-8000-000000000204';
  v_other_opportunity uuid := '02200000-0000-4000-8000-000000000205';
  v_personal_opportunity uuid := '02200000-0000-4000-8000-000000000206';
  v_result record;
  v_updated_at timestamptz;
begin
  insert into auth.users (id, email)
  values
    (v_owner, 'pr43-owner@example.invalid'),
    (v_admin, 'pr43-admin@example.invalid'),
    (v_member, 'pr43-member@example.invalid'),
    (v_other_member, 'pr43-other@example.invalid'),
    (v_pending, 'pr43-pending@example.invalid'),
    (v_removed, 'pr43-removed@example.invalid'),
    (v_outsider, 'pr43-outsider@example.invalid'),
    (v_personal_owner, 'pr43-personal@example.invalid');

  insert into public.organizations (id, name)
  values
    (v_org, 'PR4.3 assignment validation'),
    (v_other_org, 'PR4.3 other workspace');

  insert into public.organization_members (organization_id, user_id, role)
  values
    (v_org, v_owner, 'owner'),
    (v_org, v_admin, 'admin'),
    (v_org, v_member, 'member'),
    (v_org, v_other_member, 'member'),
    (v_org, v_removed, 'member'),
    (v_other_org, v_outsider, 'owner');

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    invited_by,
    expires_at
  )
  values (
    v_org,
    'pr43-pending@example.invalid',
    'member',
    v_owner,
    now() + interval '1 day'
  );

  delete from public.organization_members
  where organization_id = v_org and user_id = v_removed;

  insert into public.opportunities (
    id,
    organization_id,
    user_id,
    origin,
    status,
    service_type,
    summary
  )
  values
    (v_owner_opportunity, v_org, v_owner, 'direct', 'new', 'hvac', 'Owner flow'),
    (v_member_opportunity, v_org, v_owner, 'direct', 'new', 'hvac', 'Member flow'),
    (v_denied_opportunity, v_org, v_owner, 'direct', 'new', 'hvac', 'Denied flow'),
    (v_stale_opportunity, v_org, v_owner, 'direct', 'new', 'hvac', 'Stale flow'),
    (v_other_opportunity, v_other_org, v_outsider, 'direct', 'new', 'hvac', 'Other workspace'),
    (v_personal_opportunity, null, v_personal_owner, 'direct', 'new', 'hvac', 'Personal flow');

  -- Owner assign, reassign, and clear.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select * into v_result
  from public.assign_opportunity(
    v_owner_opportunity,
    v_member,
    null,
    'initial_assignment'
  );
  if v_result.assigned_user_id <> v_member
     or v_result.history_id is null
     or (
       select count(*)
       from public.opportunity_assignment_history
       where opportunity_id = v_owner_opportunity
         and previous_assigned_user_id is null
         and new_assigned_user_id = v_member
         and actor_user_id = v_owner
         and reason_code = 'initial_assignment'
         and source_system = 'vendor_os'
     ) <> 1 then
    raise exception 'owner assignment or history insertion failed';
  end if;

  v_updated_at := v_result.updated_at;
  select * into v_result
  from public.assign_opportunity(
    v_owner_opportunity,
    v_other_member,
    v_updated_at,
    'rebalanced'
  );
  if v_result.assigned_user_id <> v_other_member
     or (
       select count(*)
       from public.opportunity_assignment_history
       where opportunity_id = v_owner_opportunity
         and previous_assigned_user_id = v_member
         and new_assigned_user_id = v_other_member
     ) <> 1 then
    raise exception 'owner reassignment failed';
  end if;

  select * into v_result
  from public.assign_opportunity(
    v_owner_opportunity,
    null,
    v_result.updated_at,
    null
  );
  if v_result.assigned_user_id is not null
     or (
       select count(*)
       from public.opportunity_assignment_history
       where opportunity_id = v_owner_opportunity
         and previous_assigned_user_id = v_other_member
         and new_assigned_user_id is null
     ) <> 1 then
    raise exception 'owner clear failed';
  end if;

  -- Member self-assignment succeeds.
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  select * into v_result
  from public.assign_opportunity(v_member_opportunity, v_member, null, null);
  if v_result.assigned_user_id <> v_member then
    raise exception 'member self-assignment failed';
  end if;

  -- Member assigning another user is denied and rolls back both row and history.
  begin
    perform public.assign_opportunity(
      v_denied_opportunity,
      v_other_member,
      null,
      null
    );
    raise exception 'member assignment to another user unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
  if (select assigned_user_id from public.opportunities where id = v_denied_opportunity) is not null
     or exists (
       select 1
       from public.opportunity_assignment_history
       where opportunity_id = v_denied_opportunity
     ) then
    raise exception 'denied assignment did not roll back atomically';
  end if;

  -- Member clearing is denied.
  begin
    perform public.assign_opportunity(v_member_opportunity, null, null, null);
    raise exception 'member clear unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  -- Pending, removed, and cross-workspace targets are denied.
  begin
    perform public.assign_opportunity(v_denied_opportunity, v_pending, null, null);
    raise exception 'pending member assignment unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.assign_opportunity(v_denied_opportunity, v_removed, null, null);
    raise exception 'removed member assignment unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.assign_opportunity(v_denied_opportunity, v_outsider, null, null);
    raise exception 'cross-workspace target assignment unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;

  -- A cross-workspace opportunity is indistinguishable from a missing row.
  begin
    perform public.assign_opportunity(v_other_opportunity, v_owner, null, null);
    raise exception 'cross-workspace opportunity assignment unexpectedly succeeded';
  exception when sqlstate 'P0002' then
    null;
  end;

  -- Personal opportunities cannot target another user.
  perform set_config('request.jwt.claim.sub', v_personal_owner::text, true);
  begin
    perform public.assign_opportunity(
      v_personal_opportunity,
      v_member,
      null,
      null
    );
    raise exception 'personal cross-user assignment unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;

  -- Stale versions and no-op changes are rejected.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select updated_at into v_updated_at
  from public.opportunities
  where id = v_stale_opportunity;
  begin
    perform public.assign_opportunity(
      v_stale_opportunity,
      v_member,
      v_updated_at - interval '1 second',
      null
    );
    raise exception 'stale assignment unexpectedly succeeded';
  exception when sqlstate '40001' then
    null;
  end;

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.assign_opportunity(
      v_member_opportunity,
      v_member,
      null,
      null
    );
    raise exception 'no-op assignment unexpectedly succeeded';
  exception when sqlstate '22023' then
    null;
  end;

  -- Direct assignment updates are rejected even for an otherwise authorized owner.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin
    update public.opportunities
    set assigned_user_id = v_member
    where id = v_denied_opportunity;
    raise exception 'direct assignment update unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

rollback;
