-- Mercurius Quote: initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- ---------------------------------------------------------------------------
-- vendor_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null unique,
  business_name text not null default '',
  tagline text not null default '',
  phone text not null default '',
  email text not null default '',
  labor_rate_per_hour numeric not null default 95,
  markup_percentage numeric not null default 20,
  material_markup_percentage numeric not null default 15,
  minimum_job_value numeric not null default 150,
  travel_fee numeric not null default 45,
  include_travel_fee boolean not null default false,
  quote_validity_days integer not null default 30,
  price_range_spread numeric not null default 12,
  logo_data_url text,
  show_powered_by_mercurius boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  reference text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted')),
  service_type text not null,
  job_name text not null,
  form_data jsonb not null,
  quote_data jsonb not null,
  source text not null check (source in ('ai', 'fallback')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_user_id_updated_at_idx
  on public.quotes (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendor_profiles_set_updated_at on public.vendor_profiles;
create trigger vendor_profiles_set_updated_at
  before update on public.vendor_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.vendor_profiles enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "Users manage own vendor profile" on public.vendor_profiles;
create policy "Users manage own vendor profile"
  on public.vendor_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own quotes" on public.quotes;
create policy "Users manage own quotes"
  on public.quotes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);