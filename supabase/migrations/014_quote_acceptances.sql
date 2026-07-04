-- Mercurius Quote: client portal accept + e-signature
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- ---------------------------------------------------------------------------
-- quote_acceptances table
-- Stores the homeowner's signature and consent for each accepted quote.
-- One acceptance per quote (enforced by unique constraint on quote_id).
-- ---------------------------------------------------------------------------
create table if not exists public.quote_acceptances (
  id            uuid        primary key default gen_random_uuid(),
  quote_id      uuid        not null references public.quotes (id) on delete cascade,
  share_token   text        not null,
  signer_name   text        not null,
  signature_data text       not null,   -- base64 PNG data URL from canvas
  ip_address    text,                   -- optional, collected server-side
  accepted_at   timestamptz not null default now(),

  constraint quote_acceptances_quote_id_unique unique (quote_id)
);

create index if not exists quote_acceptances_quote_id_idx
  on public.quote_acceptances (quote_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Homeowners write via security-definer RPC (no direct insert policy needed).
-- Authenticated vendors can read acceptances for their own quotes.
-- ---------------------------------------------------------------------------
alter table public.quote_acceptances enable row level security;

drop policy if exists "Vendors read own quote acceptances" on public.quote_acceptances;
create policy "Vendors read own quote acceptances"
  on public.quote_acceptances
  for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_acceptances.quote_id
        and q.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- accept_quote_by_share_token
-- Called by the client portal (anon) to record the homeowner's acceptance.
-- Security definer so the anon role can insert into quote_acceptances and
-- update quotes.status without any direct table grants.
-- ---------------------------------------------------------------------------
create or replace function public.accept_quote_by_share_token(
  p_token         text,
  p_signer_name   text,
  p_signature_data text,
  p_ip_address    text default null
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
begin
  v_trimmed := trim(p_token);

  -- Minimum token length guard (mirrors the GET route)
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

  -- Already accepted — return gracefully (idempotent for page refreshes)
  if v_quote.status = 'accepted' then
    return jsonb_build_object('error', 'already_accepted');
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
-- get_quote_acceptance (authenticated vendor read)
-- Returns acceptance details for quotes the authenticated user owns.
-- Used by the contractor dashboard to display signature + signer info.
-- ---------------------------------------------------------------------------
create or replace function public.get_quote_acceptance(p_quote_id uuid)
returns table (
  id             uuid,
  quote_id       uuid,
  signer_name    text,
  signature_data text,
  ip_address     text,
  accepted_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify the calling user owns this quote
  if not exists (
    select 1 from public.quotes q
    where q.id = p_quote_id
      and q.user_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    qa.id,
    qa.quote_id,
    qa.signer_name,
    qa.signature_data,
    qa.ip_address,
    qa.accepted_at
  from public.quote_acceptances qa
  where qa.quote_id = p_quote_id
  limit 1;
end;
$$;

grant execute on function public.get_quote_acceptance(uuid)
  to authenticated;
