-- Mercurius Quote: logo storage bucket + logo_url column
-- Run in Supabase SQL Editor after 001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Add logo_url column (keep logo_data_url for backward compatibility)
-- ---------------------------------------------------------------------------
alter table public.vendor_profiles
  add column if not exists logo_url text;

-- ---------------------------------------------------------------------------
-- Storage bucket: logos (public read for PDF export)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------------
drop policy if exists "Public logo access" on storage.objects;
create policy "Public logo access"
  on storage.objects
  for select
  using (bucket_id = 'logos');

drop policy if exists "Users upload own logos" on storage.objects;
create policy "Users upload own logos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own logos" on storage.objects;
create policy "Users update own logos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own logos" on storage.objects;
create policy "Users delete own logos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );