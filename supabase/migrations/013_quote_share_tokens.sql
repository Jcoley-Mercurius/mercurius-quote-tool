-- Client portal: share tokens and "viewed" quote status
-- Run in Supabase SQL Editor if not using the CLI migration workflow.

-- ---------------------------------------------------------------------------
-- share_token on quotes
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists share_token text unique,
  add column if not exists shared_at timestamptz;

create index if not exists quotes_share_token_idx
  on public.quotes (share_token)
  where share_token is not null;

-- Extend status to include "viewed"
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'viewed', 'accepted'));

-- ---------------------------------------------------------------------------
-- get_public_quote_by_share_token (anon-safe read via opaque token)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_quote_by_share_token(p_token text)
returns table (
  id uuid,
  reference text,
  status text,
  service_type text,
  job_name text,
  form_data jsonb,
  quote_data jsonb,
  source text,
  vendor_snapshot jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  trimmed text;
begin
  trimmed := trim(p_token);
  if char_length(trimmed) < 32 then
    return;
  end if;

  return query
  select
    q.id,
    q.reference,
    q.status,
    q.service_type,
    q.job_name,
    q.form_data,
    q.quote_data,
    q.source,
    q.vendor_snapshot,
    q.created_at,
    q.updated_at
  from public.quotes q
  where q.share_token = trimmed
  limit 1;
end;
$$;

grant execute on function public.get_public_quote_by_share_token(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- mark_quote_viewed_by_share_token (sent -> viewed on client open)
-- ---------------------------------------------------------------------------
create or replace function public.mark_quote_viewed_by_share_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text;
  updated_count int;
begin
  trimmed := trim(p_token);
  if char_length(trimmed) < 32 then
    return false;
  end if;

  update public.quotes
  set status = 'viewed', updated_at = now()
  where share_token = trimmed
    and status = 'sent';

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.mark_quote_viewed_by_share_token(text)
  to anon, authenticated;