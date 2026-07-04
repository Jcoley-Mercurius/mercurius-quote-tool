-- Organization member management: list members, change roles, remove members
-- Run after 005_organization_access_fix.sql

-- ---------------------------------------------------------------------------
-- get_organization_members
-- ---------------------------------------------------------------------------
create or replace function public.get_organization_members(p_organization_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role public.organization_role,
  joined_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception 'You are not a member of this organization';
  end if;

  return query
  select
    om.id as member_id,
    om.user_id,
    u.email::text,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), '')
    ) as display_name,
    om.role,
    om.created_at as joined_at
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  where om.organization_id = p_organization_id
  order by
    case om.role
      when 'owner' then 0
      when 'admin' then 1
      else 2
    end,
    om.created_at asc;
end;
$$;

grant execute on function public.get_organization_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- update_organization_member_role
-- ---------------------------------------------------------------------------
create or replace function public.update_organization_member_role(
  p_member_id uuid,
  p_role public.organization_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  target_user_id uuid;
  target_role public.organization_role;
  owner_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id, user_id, role
  into target_org_id, target_user_id, target_role
  from public.organization_members
  where id = p_member_id;

  if target_org_id is null then
    raise exception 'Member not found';
  end if;

  if not public.is_org_owner_or_admin(target_org_id) then
    raise exception 'Only organization owners and admins can change member roles';
  end if;

  if p_role = 'owner' then
    raise exception 'Cannot assign the owner role';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invalid member role';
  end if;

  if target_role = p_role then
    return;
  end if;

  if target_role = 'owner' then
    if target_user_id <> auth.uid() then
      raise exception 'The organization owner role cannot be changed by others';
    end if;

    select count(*)::integer
    into owner_count
    from public.organization_members
    where organization_id = target_org_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'You cannot change your role while you are the only owner';
    end if;
  end if;

  update public.organization_members
  set role = p_role
  where id = p_member_id;
end;
$$;

grant execute on function public.update_organization_member_role(uuid, public.organization_role) to authenticated;

-- ---------------------------------------------------------------------------
-- remove_organization_member
-- ---------------------------------------------------------------------------
create or replace function public.remove_organization_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  target_user_id uuid;
  target_role public.organization_role;
  owner_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id, user_id, role
  into target_org_id, target_user_id, target_role
  from public.organization_members
  where id = p_member_id;

  if target_org_id is null then
    raise exception 'Member not found';
  end if;

  if not public.is_org_owner_or_admin(target_org_id) then
    raise exception 'Only organization owners and admins can remove members';
  end if;

  if target_role = 'owner' then
    if target_user_id <> auth.uid() then
      raise exception 'The organization owner cannot be removed';
    end if;

    select count(*)::integer
    into owner_count
    from public.organization_members
    where organization_id = target_org_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'You cannot remove yourself while you are the only owner';
    end if;
  end if;

  delete from public.organization_members
  where id = p_member_id;
end;
$$;

grant execute on function public.remove_organization_member(uuid) to authenticated;