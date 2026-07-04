-- Organization invites: invite users by email to join a team
-- Run in Supabase SQL Editor if not using the CLI migration workflow.

-- ---------------------------------------------------------------------------
-- organization_invites
-- ---------------------------------------------------------------------------
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade not null,
  email text not null check (position('@' in email) > 1),
  role public.organization_role not null default 'member',
  token text not null unique default (
    replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
  ),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (role in ('admin', 'member'))
);

create index if not exists organization_invites_organization_id_idx
  on public.organization_invites (organization_id);

create index if not exists organization_invites_token_idx
  on public.organization_invites (token);

create unique index if not exists organization_invites_pending_email_idx
  on public.organization_invites (organization_id, lower(email))
  where accepted_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organization_invites enable row level security;

drop policy if exists "Owners and admins can view org invites" on public.organization_invites;
create policy "Owners and admins can view org invites"
  on public.organization_invites
  for select
  using (public.is_org_owner_or_admin(organization_id));

drop policy if exists "Owners and admins can delete pending invites" on public.organization_invites;
create policy "Owners and admins can delete pending invites"
  on public.organization_invites
  for delete
  using (
    public.is_org_owner_or_admin(organization_id)
    and accepted_at is null
  );

-- ---------------------------------------------------------------------------
-- get_organization_invite_preview (public preview by token)
-- ---------------------------------------------------------------------------
create or replace function public.get_organization_invite_preview(p_token text)
returns table (
  organization_id uuid,
  organization_name text,
  email text,
  role public.organization_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_expired boolean,
  is_valid boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  trimmed_token text;
begin
  trimmed_token := trim(p_token);
  if char_length(trimmed_token) < 1 then
    return;
  end if;

  return query
  select
    oi.organization_id,
    o.name as organization_name,
    oi.email,
    oi.role,
    oi.expires_at,
    oi.accepted_at,
    (oi.expires_at <= now()) as is_expired,
    (
      oi.accepted_at is null
      and oi.expires_at > now()
    ) as is_valid
  from public.organization_invites oi
  join public.organizations o on o.id = oi.organization_id
  where oi.token = trimmed_token;
end;
$$;

grant execute on function public.get_organization_invite_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_organization_invite
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

  return query
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
  returning organization_invites.id, organization_invites.token, organization_invites.expires_at;
end;
$$;

grant execute on function public.create_organization_invite(uuid, text, public.organization_role) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_organization_invite
-- ---------------------------------------------------------------------------
create or replace function public.cancel_organization_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id
  into target_org_id
  from public.organization_invites
  where id = p_invite_id
    and accepted_at is null;

  if target_org_id is null then
    raise exception 'Invite not found or already accepted';
  end if;

  if not public.is_org_owner_or_admin(target_org_id) then
    raise exception 'Only organization owners and admins can cancel invites';
  end if;

  delete from public.organization_invites
  where id = p_invite_id
    and accepted_at is null;
end;
$$;

grant execute on function public.cancel_organization_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_organization_invite
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

  return query
  select o.id, o.name
  from public.organizations o
  where o.id = invite_record.organization_id;
end;
$$;

grant execute on function public.accept_organization_invite(text) to authenticated;