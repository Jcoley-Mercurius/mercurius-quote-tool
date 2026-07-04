-- Team accounts: organizations, members, and shared quotes
-- Run in Supabase SQL Editor if not using the CLI migration workflow.

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create type public.organization_role as enum ('owner', 'admin', 'member');

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade not null,
  user_id uuid references auth.users (id) on delete cascade not null,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- quotes: optional organization scope
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists organization_id uuid
  references public.organizations (id) on delete cascade;

create index if not exists quotes_organization_id_updated_at_idx
  on public.quotes (organization_id, updated_at desc)
  where organization_id is not null;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org_id uuid)
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
  );
$$;

create or replace function public.is_org_owner_or_admin(org_id uuid)
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
      and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- create_organization RPC (atomic org + owner membership)
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  trimmed_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  trimmed_name := trim(org_name);
  if char_length(trimmed_name) < 1 then
    raise exception 'Organization name is required';
  end if;

  insert into public.organizations (name)
  values (trimmed_name)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations
  for select
  using (public.is_org_member(id));

drop policy if exists "Owners and admins can update organizations" on public.organizations;
create policy "Owners and admins can update organizations"
  on public.organizations
  for update
  using (public.is_org_owner_or_admin(id))
  with check (public.is_org_owner_or_admin(id));

-- ---------------------------------------------------------------------------
-- Row Level Security: organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

drop policy if exists "Members can view organization membership" on public.organization_members;
create policy "Members can view organization membership"
  on public.organization_members
  for select
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Row Level Security: quotes (personal + organization)
-- ---------------------------------------------------------------------------
drop policy if exists "Users manage own quotes" on public.quotes;

drop policy if exists "Users manage personal quotes" on public.quotes;
create policy "Users manage personal quotes"
  on public.quotes
  for all
  using (auth.uid() = user_id and organization_id is null)
  with check (auth.uid() = user_id and organization_id is null);

drop policy if exists "Org members view organization quotes" on public.quotes;
create policy "Org members view organization quotes"
  on public.quotes
  for select
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

drop policy if exists "Org members insert organization quotes" on public.quotes;
create policy "Org members insert organization quotes"
  on public.quotes
  for insert
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and auth.uid() = user_id
  );

drop policy if exists "Org members update organization quotes" on public.quotes;
create policy "Org members update organization quotes"
  on public.quotes
  for update
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

drop policy if exists "Org members delete organization quotes" on public.quotes;
create policy "Org members delete organization quotes"
  on public.quotes
  for delete
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );