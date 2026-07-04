-- Organization ownership transfer + lightweight audit log
-- Run after 007_organization_vendor_profiles.sql

-- ---------------------------------------------------------------------------
-- is_org_owner helper
-- ---------------------------------------------------------------------------
create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- organization_audit_log (foundation for a future full audit log UI)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_audit_log_organization_id_idx
  on public.organization_audit_log (organization_id, created_at desc);

alter table public.organization_audit_log enable row level security;

drop policy if exists "Org members view organization audit log" on public.organization_audit_log;
create policy "Org members view organization audit log"
  on public.organization_audit_log
  for select
  using (
    public.is_org_member(organization_id)
  );

-- Writes happen only through security-definer RPCs.

-- ---------------------------------------------------------------------------
-- transfer_organization_ownership
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

  insert into public.organization_audit_log (
    organization_id,
    actor_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    target_org_id,
    auth.uid(),
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

grant execute on function public.transfer_organization_ownership(uuid) to authenticated;