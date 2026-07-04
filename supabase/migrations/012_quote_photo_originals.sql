-- Private bucket for full-size quote photo originals
-- Run after 011_quote_photo_storage.sql
-- Originals are stored at:
--   Personal: {user_id}/photos/{quote_id}/originals/{index}.{ext}
--   Organization: org/{organization_id}/photos/{quote_id}/originals/{index}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-photo-originals',
  'quote-photo-originals',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Personal workspace: owner-only access
drop policy if exists "Users read own quote photo originals" on storage.objects;
create policy "Users read own quote photo originals"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

drop policy if exists "Users upload own quote photo originals" on storage.objects;
create policy "Users upload own quote photo originals"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-photo-originals'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
    and (storage.foldername(name))[4] = 'originals'
  );

drop policy if exists "Users update own quote photo originals" on storage.objects;
create policy "Users update own quote photo originals"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

drop policy if exists "Users delete own quote photo originals" on storage.objects;
create policy "Users delete own quote photo originals"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'photos'
  );

-- Organization workspace: member access
drop policy if exists "Org members read organization quote photo originals" on storage.objects;
create policy "Org members read organization quote photo originals"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );

drop policy if exists "Org members upload organization quote photo originals" on storage.objects;
create policy "Org members upload organization quote photo originals"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-photo-originals'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
    and (storage.foldername(name))[5] = 'originals'
  );

drop policy if exists "Org members update organization quote photo originals" on storage.objects;
create policy "Org members update organization quote photo originals"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );

drop policy if exists "Org members delete organization quote photo originals" on storage.objects;
create policy "Org members delete organization quote photo originals"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-photo-originals'
    and (storage.foldername(name))[1] = 'org'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[3] = 'photos'
  );