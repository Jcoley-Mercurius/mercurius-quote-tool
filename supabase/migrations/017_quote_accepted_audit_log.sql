-- Mercurius Quote: log quote_accepted events to the organization audit log
-- Run in Supabase SQL Editor after 016_quote_expiry_enforcement.sql
--
-- Changes:
--   1. accept_quote_by_share_token — after a successful acceptance, if the
--      quote belongs to an organization, insert a row into
--      organization_audit_log directly (cannot use log_organization_audit_event
--      because that helper relies on auth.uid() which is NULL for anon callers).
--
-- No new tables or columns needed — everything plugs into the existing
-- organization_audit_log table (created in migration 009).

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
  v_accepted_at   timestamptz;
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

  -- Expiry check (introduced in migration 016)
  v_validity_days := coalesce((v_quote.quote_data ->> 'validityDays')::int, 30);
  v_expires_at    := v_quote.created_at + (v_validity_days * interval '1 day');

  if now() > v_expires_at then
    return jsonb_build_object(
      'error',      'expired',
      'expires_at', v_expires_at
    );
  end if;

  v_accepted_at := now();

  -- Record the acceptance
  insert into public.quote_acceptances (
    quote_id,
    share_token,
    signer_name,
    signature_data,
    ip_address,
    accepted_at
  )
  values (
    v_quote.id,
    v_trimmed,
    trim(p_signer_name),
    p_signature_data,
    p_ip_address,
    v_accepted_at
  )
  returning id into v_acceptance_id;

  -- Update the quote status
  update public.quotes
  set status = 'accepted', updated_at = v_accepted_at
  where id = v_quote.id;

  -- ---------------------------------------------------------------------------
  -- Audit log — only for organization quotes.
  -- actor_user_id is NULL: the homeowner is anonymous (no Supabase account).
  -- We capture the contractor's user_id in metadata so the log reader knows
  -- whose quote was accepted.
  -- ---------------------------------------------------------------------------
  if v_quote.organization_id is not null then
    insert into public.organization_audit_log (
      organization_id,
      actor_user_id,   -- NULL: homeowner has no auth.uid()
      action,
      target_user_id,  -- NULL: no specific team member is the target
      metadata
    )
    values (
      v_quote.organization_id,
      null,
      'quote_accepted',
      null,
      jsonb_build_object(
        'quote_id',        v_quote.id,
        'quote_reference', v_quote.reference,
        'job_name',        v_quote.job_name,
        'signer_name',     trim(p_signer_name),
        'accepted_at',     v_accepted_at,
        'contractor_user_id', v_quote.user_id
      )
    );
  end if;

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
