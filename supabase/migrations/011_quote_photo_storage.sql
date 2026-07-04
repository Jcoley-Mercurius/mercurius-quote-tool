-- Quote photo thumbnails storage bucket + policies
-- Run after 010_quote_vendor_snapshot.sql
-- Thumbnails are stored at:
--   Personal: {user_id}/photos/{quote_id}/{index}.webp
--   Organization: org/{organization_id}/photos/{quote_id}/{index}.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-photos',
  'quote-photos',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public quote photo access" on storage.objects;
create policy "Public quote photo access"
  on storage.objects
  for select
  using (bucket_id = 'quote-photos');

drop policy if exists "Users upload own quote photos" on storage.objects;
create policy "Users upload own quote photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

drop policy if exists "Users update own quote photos" on storage.objects;
create policy "Users update own quote photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

drop policy if exists "Users delete own quote photos" on storage.objects;
create policy "Users delete own quote photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

drop policy if exists "Org members upload organization quote photos" on storage.objects;
create policy "Org members upload organization quote photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );

drop policy if exists "Org members update organization quote photos" on storage.objects;
create policy "Org members update organization quote photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );

drop policy if exists "Org members delete organization quote photos" on storage.objects;
create policy "Org members delete organization quote photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );