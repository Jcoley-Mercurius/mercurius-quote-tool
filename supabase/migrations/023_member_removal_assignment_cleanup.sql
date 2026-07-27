-- Atomically clear a removed organization member's active assignments.
-- Run after 022_opportunity_assignment_foundation.sql.

create or replace function public.remove_organization_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_org_id uuid;
  v_target_user_id uuid;
  v_target_role public.organization_role;
  v_owner_count integer;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id, user_id, role
  into v_target_org_id, v_target_user_id, v_target_role
  from public.organization_members
  where id = p_member_id
  for update;

  if v_target_org_id is null then
    raise exception 'Member not found';
  end if;

  if not public.is_org_owner_or_admin(v_target_org_id) then
    raise exception 'Only organization owners and admins can remove members';
  end if;

  if v_target_role = 'owner' then
    if v_target_user_id <> v_actor_id then
      raise exception 'The organization owner cannot be removed';
    end if;

    select count(*)::integer
    into v_owner_count
    from public.organization_members
    where organization_id = v_target_org_id
      and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'You cannot remove yourself while you are the only owner';
    end if;
  end if;

  perform set_config('app.opportunity_assignment', 'on', true);

  with cleared as (
    update public.opportunities
    set assigned_user_id = null
    where organization_id = v_target_org_id
      and assigned_user_id = v_target_user_id
      and status in ('new', 'opened', 'quoting', 'quoted')
    returning id
  )
  insert into public.opportunity_assignment_history (
    opportunity_id,
    previous_assigned_user_id,
    new_assigned_user_id,
    actor_user_id,
    source_system,
    reason_code,
    occurred_at
  )
  select
    cleared.id,
    v_target_user_id,
    null,
    v_actor_id,
    'vendor_os',
    'member_removed',
    now()
  from cleared;

  perform set_config('app.opportunity_assignment', 'off', true);

  perform public.log_organization_audit_event(
    v_target_org_id,
    'member_removed',
    v_target_user_id,
    jsonb_build_object(
      'member_id', p_member_id,
      'previous_role', v_target_role
    )
  );

  delete from public.organization_members
  where id = p_member_id;
end;
$$;

revoke all on function public.remove_organization_member(uuid)
  from public, anon, authenticated;
grant execute on function public.remove_organization_member(uuid)
  to authenticated;
