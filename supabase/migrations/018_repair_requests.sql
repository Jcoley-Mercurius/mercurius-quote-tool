-- Mercurius Quote: homeowner repair requests
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- ---------------------------------------------------------------------------
-- repair_requests
-- Public homeowner intake: describe a repair, get matched to local vendors.
-- Inserts come from the anon API route; vendors can read authenticated.
-- ---------------------------------------------------------------------------
create table if not exists public.repair_requests (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  service_type  text        not null,
  description   text        not null,
  location      text        not null default '',
  zip           text        not null,
  urgency       text        not null
    check (urgency in ('emergency', 'urgent', 'soon', 'flexible')),
  photos        jsonb       not null default '[]'::jsonb,
  name          text        not null,
  email         text        not null,
  phone         text        not null default '',
  status        text        not null default 'pending'
    check (status in ('pending', 'quoted', 'accepted')),

  constraint repair_requests_zip_format
    check (zip ~ '^\d{5}$'),
  constraint repair_requests_email_nonempty
    check (char_length(trim(email)) > 0),
  constraint repair_requests_name_nonempty
    check (char_length(trim(name)) > 0),
  constraint repair_requests_description_nonempty
    check (char_length(trim(description)) >= 10)
);

create index if not exists repair_requests_created_at_idx
  on public.repair_requests (created_at desc);

create index if not exists repair_requests_status_idx
  on public.repair_requests (status);

create index if not exists repair_requests_zip_idx
  on public.repair_requests (zip);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Anon can INSERT (public repair request form) but must NOT SELECT.
-- The API inserts with Prefer: return=minimal (no .select() chain).
-- Authenticated users can read (vendor lead inbox; refine later by matching).
-- ---------------------------------------------------------------------------
alter table public.repair_requests enable row level security;

drop policy if exists "Anyone can submit a repair request" on public.repair_requests;
create policy "Anyone can submit a repair request"
  on public.repair_requests
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read repair requests" on public.repair_requests;
create policy "Authenticated users can read repair requests"
  on public.repair_requests
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Grants
-- NOTE: Do not grant SELECT to anon — returning inserted rows via PostgREST
-- would fail RLS and break the public submit API.
-- ---------------------------------------------------------------------------
grant select, insert on public.repair_requests to authenticated;
grant insert on public.repair_requests to anon;
