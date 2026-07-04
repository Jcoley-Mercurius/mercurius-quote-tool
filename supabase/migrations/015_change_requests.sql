-- Mercurius Quote: change requests + vendor email lookup for notifications
-- Run in Supabase SQL Editor after 014_quote_acceptances.sql

-- ---------------------------------------------------------------------------
-- 1. Extend quotes.status to include 'changes_requested'
-- ---------------------------------------------------------------------------
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'viewed', 'accepted', 'changes_requested'));

-- ---------------------------------------------------------------------------
-- 2. quote_change_requests table
-- Stores each change request message from a homeowner.
-- A quote can accumulate multiple change requests across revisions.
-- ---------------------------------------------------------------------------
create table if not exists public.quote_change_requests (
  id              uuid        primary key default gen_random_uuid(),
  quote_id        uuid        not null references public.quotes (id) on delete cascade,
  share_token     text        not null,
  message         text        not null,
  requester_name  text,
  requester_phone text,
  ip_address      text,
  submitted_at    timestamptz not null default now()
);

create index if not exists quote_change_requests_quote_id_idx
  on public.quote_change_requests (quote_id, submitted_at desc);

alter table public.quote_change_requests enable row level security;

drop policy if exists "Vendors read own change requests" on public.quote_change_requests;
create policy "Vendors read own change requests"
  on public.quote_change_requests
  for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_change_requests.quote_id
        and q.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. submit_change_request_by_share_token (anon-safe write)
-- ---------------------------------------------------------------------------
create or replace function public.submit_change_request_by_share_token(
  p_token          text,
  p_message        text,
  p_requester_name text    default null,
  p_requester_phone text   default null,
  p_ip_address     text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_quote   public.quotes%rowtype;
  v_req_id  uuid;
begin
  v_trimmed := trim(p_token);

  if char_length(v_trimmed) < 32 then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  if trim(p_message) = '' then
    return jsonb_build_object('error', 'message_required');
  end if;

  select * into v_quote
  from public.quotes
  where share_token = v_trimmed
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Cannot request changes on an already-accepted quote
  if v_quote.status = 'accepted' then
    return jsonb_build_object('error', 'already_accepted');
  end if;

  insert into public.quote_change_requests (
    quote_id,
    share_token,
    message,
    requester_name,
    requester_phone,
    ip_address
  )
  values (
    v_quote.id,
    v_trimmed,
    trim(p_message),
    nullif(trim(coalesce(p_requester_name, '')), ''),
    nullif(trim(coalesce(p_requester_phone, '')), ''),
    p_ip_address
  )
  returning id into v_req_id;

  -- Update quote status to changes_requested
  update public.quotes
  set status = 'changes_requested', updated_at = now()
  where id = v_quote.id;

  return jsonb_build_object(
    'success',        true,
    'request_id',     v_req_id,
    'quote_id',       v_quote.id,
    'user_id',        v_quote.user_id,
    'reference',      v_quote.reference,
    'job_name',       v_quote.job_name,
    'service_type',   v_quote.service_type
  );
end;
$$;

grant execute on function public.submit_change_request_by_share_token(text, text, text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. get_quote_change_requests (authenticated vendor read)
-- ---------------------------------------------------------------------------
create or replace function public.get_quote_change_requests(p_quote_id uuid)
returns table (
  id              uuid,
  quote_id        uuid,
  message         text,
  requester_name  text,
  requester_phone text,
  ip_address      text,
  submitted_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.quotes q
    where q.id = p_quote_id
      and q.user_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    cr.id,
    cr.quote_id,
    cr.message,
    cr.requester_name,
    cr.requester_phone,
    cr.ip_address,
    cr.submitted_at
  from public.quote_change_requests cr
  where cr.quote_id = p_quote_id
  order by cr.submitted_at desc;
end;
$$;

grant execute on function public.get_quote_change_requests(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. get_vendor_email_for_notification
-- Security-definer helper: lets the anon client look up a vendor's email
-- for sending transactional notifications, without exposing the full profile.
-- Only callable by the server (never exposed to client JS).
-- ---------------------------------------------------------------------------
create or replace function public.get_vendor_email_for_notification(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email         text;
  v_business_name text;
begin
  select email, business_name
  into v_email, v_business_name
  from public.vendor_profiles
  where user_id = p_user_id
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'email',         v_email,
    'business_name', v_business_name
  );
end;
$$;

-- Only the anon role needs this for server-side notification dispatch.
-- The authenticated role inherits it as well (no harm).
grant execute on function public.get_vendor_email_for_notification(uuid)
  to anon, authenticated;
