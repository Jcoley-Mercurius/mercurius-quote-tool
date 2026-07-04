-- Organization audit log: expanded coverage + read RPC
-- Run after 008_organization_ownership_transfer.sql

-- ---------------------------------------------------------------------------
-- log_organization_audit_event (internal helper — not granted to clients)
-- ---------------------------------------------------------------------------
create or replace function public.log_organization_audit_event(
  p_organization_id uuid,
  p_action text,
  p_target_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_audit_log (
    organization_id,
    actor_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    p_organization_id,
    auth.uid(),
    p_action,
    p_target_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_organization_audit_event(uuid, text, uuid, jsonb) from public;

-- ---------------------------------------------------------------------------
-- get_organization_audit_log
-- ---------------------------------------------------------------------------
create or replace function public.get_organization_audit_log(
  p_organization_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  action text,
  actor_user_id uuid,
  actor_email text,
  actor_display_name text,
  target_user_id uuid,
  target_email text,
  target_display_name text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  safe_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception 'You are not a member of this organization';
  end if;

  safe_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  return query
  select
    al.id,
    al.action,
    al.actor_user_id,
    actor.email::text as actor_email,
    coalesce(
      nullif(trim(actor.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(actor.raw_user_meta_data->>'name'), '')
    ) as actor_display_name,
    al.target_user_id,
    target.email::text as target_email,
    coalesce(
      nullif(trim(target.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(target.raw_user_meta_data->>'name'), '')
    ) as target_display_name,
    al.metadata,
    al.created_at
  from public.organization_audit_log al
  left join auth.users actor on actor.id = al.actor_user_id
  left join auth.users target on target.id = al.target_user_id
  where al.organization_id = p_organization_id
    and (
      al.action <> 'ownership_transferred'
      or public.is_org_owner_or_admin(p_organization_id)
    )
  order by al.created_at desc
  limit safe_limit;
end;
$$;

grant execute on function public.get_organization_audit_log(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- update_organization_member_role (with audit)
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

  perform public.log_organization_audit_event(
    target_org_id,
    'role_changed',
    target_user_id,
    jsonb_build_object(
      'member_id', p_member_id,
      'previous_role', target_role,
      'new_role', p_role
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_organization_member (with audit)
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

  perform public.log_organization_audit_event(
    target_org_id,
    'member_removed',
    target_user_id,
    jsonb_build_object(
      'member_id', p_member_id,
      'previous_role', target_role
    )
  );

  delete from public.organization_members
  where id = p_member_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_organization_invite (with audit)
-- ---------------------------------------------------------------------------
create or replace function public.create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_role public.organization_role default 'member'
)
returns table (
  id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  existing_user_id uuid;
  new_invite_id uuid;
  new_token text;
  new_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_owner_or_admin(p_organization_id) then
    raise exception 'Only organization owners and admins can send invites';
  end if;

  normalized_email := lower(trim(p_email));
  if char_length(normalized_email) < 3 or position('@' in normalized_email) < 2 then
    raise exception 'A valid email address is required';
  end if;

  if p_role = 'owner' then
    raise exception 'Cannot invite users as owner';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invalid invite role';
  end if;

  select u.id
  into existing_user_id
  from auth.users u
  join public.organization_members om on om.user_id = u.id
  where om.organization_id = p_organization_id
    and lower(u.email) = normalized_email
  limit 1;

  if existing_user_id is not null then
    raise exception 'This user is already a member of the organization';
  end if;

  delete from public.organization_invites
  where organization_id = p_organization_id
    and lower(email) = normalized_email
    and accepted_at is null
    and expires_at <= now();

  if exists (
    select 1
    from public.organization_invites
    where organization_id = p_organization_id
      and lower(email) = normalized_email
      and accepted_at is null
  ) then
    raise exception 'A pending invite already exists for this email';
  end if;

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    invited_by,
    expires_at
  )
  values (
    p_organization_id,
    normalized_email,
    p_role,
    auth.uid(),
    now() + interval '7 days'
  )
  returning organization_invites.id, organization_invites.token, organization_invites.expires_at
  into new_invite_id, new_token, new_expires_at;

  perform public.log_organization_audit_event(
    p_organization_id,
    'invite_sent',
    null,
    jsonb_build_object(
      'invite_id', new_invite_id,
      'email', normalized_email,
      'role', p_role
    )
  );

  return query
  select new_invite_id, new_token, new_expires_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_organization_invite (with audit)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_organization_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  invite_email text;
  invite_role public.organization_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id, email, role
  into target_org_id, invite_email, invite_role
  from public.organization_invites
  where id = p_invite_id
    and accepted_at is null;

  if target_org_id is null then
    raise exception 'Invite not found or already accepted';
  end if;

  if not public.is_org_owner_or_admin(target_org_id) then
    raise exception 'Only organization owners and admins can cancel invites';
  end if;

  perform public.log_organization_audit_event(
    target_org_id,
    'invite_canceled',
    null,
    jsonb_build_object(
      'invite_id', p_invite_id,
      'email', invite_email,
      'role', invite_role
    )
  );

  delete from public.organization_invites
  where id = p_invite_id
    and accepted_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_organization_invite (with audit)
-- ---------------------------------------------------------------------------
create or replace function public.accept_organization_invite(p_token text)
returns table (
  organization_id uuid,
  organization_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_token text;
  invite_record public.organization_invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  trimmed_token := trim(p_token);
  if char_length(trimmed_token) < 1 then
    raise exception 'Invite token is required';
  end if;

  select *
  into invite_record
  from public.organization_invites
  where token = trimmed_token
  for update;

  if invite_record.id is null then
    raise exception 'Invite not found';
  end if;

  if invite_record.accepted_at is not null then
    raise exception 'This invite has already been accepted';
  end if;

  if invite_record.expires_at <= now() then
    raise exception 'This invite has expired';
  end if;

  select lower(email)
  into user_email
  from auth.users
  where id = auth.uid();

  if user_email is null or user_email <> lower(invite_record.email) then
    raise exception 'Sign in with % to accept this invite', invite_record.email;
  end if;

  if exists (
    select 1
    from public.organization_members
    where organization_id = invite_record.organization_id
      and user_id = auth.uid()
  ) then
    update public.organization_invites
    set accepted_at = now()
    where id = invite_record.id;

    perform public.log_organization_audit_event(
      invite_record.organization_id,
      'invite_accepted',
      auth.uid(),
      jsonb_build_object(
        'invite_id', invite_record.id,
        'email', invite_record.email,
        'role', invite_record.role
      )
    );

    return query
    select o.id, o.name
    from public.organizations o
    where o.id = invite_record.organization_id;
    return;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite_record.organization_id, auth.uid(), invite_record.role);

  update public.organization_invites
  set accepted_at = now()
  where id = invite_record.id;

  perform public.log_organization_audit_event(
    invite_record.organization_id,
    'invite_accepted',
    auth.uid(),
    jsonb_build_object(
      'invite_id', invite_record.id,
      'email', invite_record.email,
      'role', invite_record.role
    )
  );

  return query
  select o.id, o.name
  from public.organizations o
  where o.id = invite_record.organization_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- transfer_organization_ownership (use shared audit helper)
-- ---------------------------------------------------------------------------
create or replace function public.transfer_organization_ownership(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  target_user_id uuid;
  target_role public.organization_role;
  previous_owner_member_id uuid;
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

  if not public.is_org_owner(target_org_id) then
    raise exception 'Only the organization owner can transfer ownership';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot transfer ownership to yourself';
  end if;

  if target_role = 'owner' then
    raise exception 'This member is already the organization owner';
  end if;

  select id
  into previous_owner_member_id
  from public.organization_members
  where organization_id = target_org_id
    and user_id = auth.uid()
    and role = 'owner'
  limit 1;

  update public.organization_members
  set role = 'owner'
  where id = p_member_id;

  update public.organization_members
  set role = 'admin'
  where id = previous_owner_member_id;

  perform public.log_organization_audit_event(
    target_org_id,
    'ownership_transferred',
    target_user_id,
    jsonb_build_object(
      'previous_owner_new_role', 'admin',
      'new_owner_member_id', p_member_id,
      'previous_owner_member_id', previous_owner_member_id
    )
  );
end;
$$;