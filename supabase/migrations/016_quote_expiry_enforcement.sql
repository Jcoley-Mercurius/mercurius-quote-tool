-- Mercurius Quote: quote expiry enforcement
-- Run in Supabase SQL Editor after 015_change_requests.sql
--
-- Changes:
--   1. get_public_quote_by_share_token  → now returns expires_at (computed from quote_data->validityDays)
--   2. accept_quote_by_share_token      → blocks acceptance when quote is past expires_at
--   3. submit_change_request_by_share_token → blocks change requests when quote is expired

-- ---------------------------------------------------------------------------
-- 1. get_public_quote_by_share_token — add expires_at to the return set
--    The client uses this to show the exact expiry date and drive UI state.
--    validityDays lives in quote_data JSONB (set by AI at generation time).
-- ---------------------------------------------------------------------------
create or replace function public.get_public_quote_by_share_token(p_token text)
returns table (
  id              uuid,
  reference       text,
  status          text,
  service_type    text,
  job_name        text,
  form_data       jsonb,
  quote_data      jsonb,
  source          text,
  vendor_snapshot jsonb,
  created_at      timestamptz,
  updated_at      timestamptz,
  expires_at      timestamptz   -- NEW: server-authoritative expiry timestamp
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
    q.updated_at,
    -- Compute expiry: created_at + validityDays days (default 30 if missing)
    q.created_at + (
      coalesce((q.quote_data ->> 'validityDays')::int, 30) * interval '1 day'
    ) as expires_at
  from public.quotes q
  where q.share_token = trimmed
  limit 1;
end;
$$;

grant execute on function public.get_public_quote_by_share_token(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. accept_quote_by_share_token — block expired quotes
--    Returns jsonb { error: 'expired' } when now() > expires_at.
--    The API route maps this to HTTP 410 Gone.
-- ---------------------------------------------------------------------------
create or replace function public.accept_quote_by_share_token(
  p_token          text,
  p_signer_name    text,
  p_signature_data text,
  p_ip_address     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed       text;
  v_quote         public.quotes%rowtype;
  v_acceptance_id uuid;
  v_validity_days int;
  v_expires_at    timestamptz;
begin
  v_trimmed := trim(p_token);

  -- Minimum token length guard
  if char_length(v_trimmed) < 32 then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Validate inputs
  if trim(p_signer_name) = '' then
    return jsonb_build_object('error', 'signer_name_required');
  end if;

  if trim(p_signature_data) = '' or length(p_signature_data) < 100 then
    return jsonb_build_object('error', 'signature_required');
  end if;

  -- Look up the quote by token
  select * into v_quote
  from public.quotes
  where share_token = v_trimmed
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Already accepted — idempotent for page refreshes
  if v_quote.status = 'accepted' then
    return jsonb_build_object('error', 'already_accepted');
  end if;

  -- Expiry check — pull validityDays from the quote_data JSONB
  v_validity_days := coalesce((v_quote.quote_data ->> 'validityDays')::int, 30);
  v_expires_at    := v_quote.created_at + (v_validity_days * interval '1 day');

  if now() > v_expires_at then
    return jsonb_build_object(
      'error',      'expired',
      'expires_at', v_expires_at
    );
  end if;

  -- Record the acceptance
  insert into public.quote_acceptances (
    quote_id,
    share_token,
    signer_name,
    signature_data,
    ip_address
  )
  values (
    v_quote.id,
    v_trimmed,
    trim(p_signer_name),
    p_signature_data,
    p_ip_address
  )
  returning id into v_acceptance_id;

  -- Update the quote status
  update public.quotes
  set status = 'accepted', updated_at = now()
  where id = v_quote.id;

  return jsonb_build_object(
    'success',       true,
    'acceptance_id', v_acceptance_id,
    'quote_id',      v_quote.id,
    'user_id',       v_quote.user_id,
    'reference',     v_quote.reference,
    'job_name',      v_quote.job_name,
    'service_type',  v_quote.service_type
  );
end;
$$;

grant execute on function public.accept_quote_by_share_token(text, text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_change_request_by_share_token — block expired quotes
--    Returns jsonb { error: 'expired' } when now() > expires_at.
-- ---------------------------------------------------------------------------
create or replace function public.submit_change_request_by_share_token(
  p_token           text,
  p_message         text,
  p_requester_name  text default null,
  p_requester_phone text default null,
  p_ip_address      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed       text;
  v_quote         public.quotes%rowtype;
  v_req_id        uuid;
  v_validity_days int;
  v_expires_at    timestamptz;
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

  -- Expiry check
  v_validity_days := coalesce((v_quote.quote_data ->> 'validityDays')::int, 30);
  v_expires_at    := v_quote.created_at + (v_validity_days * interval '1 day');

  if now() > v_expires_at then
    return jsonb_build_object(
      'error',      'expired',
      'expires_at', v_expires_at
    );
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
    'success',      true,
    'request_id',   v_req_id,
    'quote_id',     v_quote.id,
    'user_id',      v_quote.user_id,
    'reference',    v_quote.reference,
    'job_name',     v_quote.job_name,
    'service_type', v_quote.service_type
  );
end;
$$;

grant execute on function public.submit_change_request_by_share_token(text, text, text, text, text)
  to anon, authenticated;
