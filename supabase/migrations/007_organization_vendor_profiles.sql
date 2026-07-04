-- Organization-scoped vendor profiles (shared team branding & pricing)
-- Run after 006_organization_member_management.sql

-- ---------------------------------------------------------------------------
-- vendor_profiles: add organization scope (null = personal workspace)
-- ---------------------------------------------------------------------------
alter table public.vendor_profiles
  add column if not exists organization_id uuid
  references public.organizations (id) on delete cascade;

alter table public.vendor_profiles
  drop constraint if exists vendor_profiles_user_id_key;

create unique index if not exists vendor_profiles_user_personal_unique
  on public.vendor_profiles (user_id)
  where organization_id is null;

create unique index if not exists vendor_profiles_org_unique
  on public.vendor_profiles (organization_id)
  where organization_id is not null;

create index if not exists vendor_profiles_organization_id_idx
  on public.vendor_profiles (organization_id)
  where organization_id is not null;

-- ---------------------------------------------------------------------------
-- Row Level Security: personal + organization vendor profiles
-- ---------------------------------------------------------------------------
drop policy if exists "Users manage own vendor profile" on public.vendor_profiles;

drop policy if exists "Users manage personal vendor profile" on public.vendor_profiles;
create policy "Users manage personal vendor profile"
  on public.vendor_profiles
  for all
  using (auth.uid() = user_id and organization_id is null)
  with check (auth.uid() = user_id and organization_id is null);

drop policy if exists "Org members view organization vendor profile" on public.vendor_profiles;
create policy "Org members view organization vendor profile"
  on public.vendor_profiles
  for select
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

drop policy if exists "Org members manage organization vendor profile" on public.vendor_profiles;
create policy "Org members manage organization vendor profile"
  on public.vendor_profiles
  for insert
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and auth.uid() = user_id
  );

drop policy if exists "Org members update organization vendor profile" on public.vendor_profiles;
create policy "Org members update organization vendor profile"
  on public.vendor_profiles
  for update
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

drop policy if exists "Org members delete organization vendor profile" on public.vendor_profiles;
create policy "Org members delete organization vendor profile"
  on public.vendor_profiles
  for delete
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Storage: organization logos under org/{organization_id}/
-- Personal logos remain at {user_id}/ (002_logo_storage.sql)
-- ---------------------------------------------------------------------------
drop policy if exists "Org members upload organization logos" on storage.objects;
create policy "Org members upload organization logos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Org members update organization logos" on storage.objects;
create policy "Org members update organization logos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Org members delete organization logos" on storage.objects;
create policy "Org members delete organization logos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );