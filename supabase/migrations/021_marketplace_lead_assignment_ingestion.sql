-- Mercurius Vendor OS: idempotent marketplace.lead.assigned v1 ingestion.
-- The single RPC is the transaction boundary for event persistence and projection.

-- Webhook-created organization records are system-owned. Personal rows still
-- require a user owner, and browser insert policies continue requiring auth.uid().
alter table public.customers alter column user_id drop not null;
alter table public.customers
  add constraint customers_personal_owner_check
  check (organization_id is not null or user_id is not null);

alter table public.properties alter column user_id drop not null;
alter table public.properties
  add constraint properties_personal_owner_check
  check (organization_id is not null or user_id is not null);

alter table public.opportunities alter column user_id drop not null;
alter table public.opportunities
  add constraint opportunities_personal_owner_check
  check (organization_id is not null or user_id is not null);

-- Marketplace source snapshots are immutable after projection.
create or replace function public.protect_marketplace_workspace_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.organization_id is distinct from old.organization_id then
    raise exception using
      errcode = '22023',
      message = 'record workspace ownership is immutable';
  end if;

  if tg_table_name = 'customers'
     and old.marketplace_homeowner_id is not null
     and new.marketplace_homeowner_id is distinct from old.marketplace_homeowner_id then
    raise exception using
      errcode = '22023',
      message = 'marketplace_homeowner_id is immutable once set';
  end if;

  if tg_table_name = 'properties'
     and old.marketplace_property_id is not null
     and new.marketplace_property_id is distinct from old.marketplace_property_id then
    raise exception using
      errcode = '22023',
      message = 'marketplace_property_id is immutable once set';
  end if;

  if tg_table_name = 'opportunities' then
    if new.origin is distinct from old.origin then
      raise exception using
        errcode = '22023',
        message = 'opportunity origin is immutable';
    end if;
    if old.marketplace_lead_id is not null
       and new.marketplace_lead_id is distinct from old.marketplace_lead_id then
      raise exception using
        errcode = '22023',
        message = 'marketplace_lead_id is immutable once set';
    end if;
    if old.marketplace_request_id is not null
       and new.marketplace_request_id is distinct from old.marketplace_request_id then
      raise exception using
        errcode = '22023',
        message = 'marketplace_request_id is immutable once set';
    end if;
    if old.origin = 'marketplace'
       and new.source_snapshot is distinct from old.source_snapshot then
      raise exception using
        errcode = '22023',
        message = 'Marketplace opportunity source_snapshot is immutable';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_marketplace_workspace_fields()
  from public, anon, authenticated;

create or replace function public.process_marketplace_lead_assigned(
  p_event jsonb,
  p_received_at timestamptz default now()
)
returns table (
  processing_status text,
  event_id uuid,
  organization_id uuid,
  opportunity_id uuid,
  error_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_lead_id uuid;
  v_request_id uuid;
  v_vendor_id uuid;
  v_homeowner_id uuid;
  v_property_external_id uuid;
  v_claimed_organization_id uuid;
  v_organization_id uuid;
  v_event_row public.integration_events%rowtype;
  v_existing_opportunity public.opportunities%rowtype;
  v_customer public.customers%rowtype;
  v_property public.properties%rowtype;
  v_opportunity public.opportunities%rowtype;
  v_assigned_at timestamptz;
  v_occurred_at timestamptz;
  v_failure_code text := 'internal_projection_error';
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception using errcode = '22023', message = 'event must be a JSON object';
  end if;
  if p_received_at is null then
    raise exception using errcode = '22023', message = 'received_at is required';
  end if;
  if p_event ->> 'eventType' is distinct from 'marketplace.lead.assigned'
     or p_event ->> 'sourceSystem' is distinct from 'marketplace'
     or p_event ->> 'eventVersion' is distinct from '1'
     or jsonb_typeof(p_event -> 'data') is distinct from 'object'
     or jsonb_typeof(p_event -> 'entities') is distinct from 'array'
     or jsonb_typeof(coalesce(p_event -> 'metadata', '{}'::jsonb)) is distinct from 'object'
     or (
       p_event ? 'actor'
       and jsonb_typeof(p_event -> 'actor') is distinct from 'object'
     ) then
    raise exception using errcode = '22023', message = 'unsupported or malformed event';
  end if;

  begin
    v_event_id := (p_event ->> 'eventId')::uuid;
    v_lead_id := (p_event #>> '{data,marketplaceLeadId}')::uuid;
    v_request_id := (p_event #>> '{data,marketplaceRequestId}')::uuid;
    v_vendor_id := (p_event #>> '{data,marketplaceVendorId}')::uuid;
    v_claimed_organization_id := (p_event ->> 'organizationId')::uuid;
    v_homeowner_id := nullif(p_event #>> '{data,marketplaceHomeownerId}', '')::uuid;
    v_property_external_id := nullif(p_event #>> '{data,marketplacePropertyId}', '')::uuid;
    v_occurred_at := (p_event ->> 'occurredAt')::timestamptz;
    v_assigned_at := (p_event #>> '{data,assignedAt}')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow then
    raise exception using errcode = '22023', message = 'event identifiers or timestamps are invalid';
  end;

  if v_event_id is null or v_lead_id is null or v_request_id is null
     or v_vendor_id is null or v_occurred_at is null or v_assigned_at is null
     or char_length(trim(coalesce(p_event #>> '{data,customer,displayName}', ''))) < 1
     or char_length(trim(coalesce(p_event #>> '{data,customer,email}', ''))) < 1
     or char_length(trim(coalesce(p_event #>> '{data,serviceCategory,code}', ''))) < 1
     or char_length(trim(coalesce(p_event #>> '{data,requestTitle}', ''))) < 1 then
    raise exception using errcode = '22023', message = 'required event fields are missing';
  end if;

  -- Serialize delivery of the same event and the same Marketplace lead.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_event_id::text, 2101)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_lead_id::text, 2102)
  );

  select * into v_event_row
  from public.integration_events ie
  where ie.source_system = 'marketplace'
    and ie.event_id = v_event_id
  for update;

  if found then
    if v_event_row.payload is distinct from p_event then
      return query select
        'projection_failed'::text,
        v_event_id,
        v_event_row.organization_id,
        null::uuid,
        'immutable_identity_conflict'::text;
      return;
    end if;

    if v_event_row.processed_at is not null then
      select o.* into v_existing_opportunity
      from public.opportunity_status_history osh
      join public.opportunities o on o.id = osh.opportunity_id
      where osh.integration_event_id = v_event_row.id
      limit 1;

      if not found then
        select o.* into v_existing_opportunity
        from public.opportunities o
        where o.marketplace_lead_id = v_lead_id;
      end if;

      return query select
        'already_processed'::text,
        v_event_id,
        v_event_row.organization_id,
        v_existing_opportunity.id,
        null::text;
    else
      return query select
        'event_processing'::text,
        v_event_id,
        v_event_row.organization_id,
        null::uuid,
        v_event_row.last_error;
    end if;
    return;
  end if;

  select o.id into v_organization_id
  from public.organizations o
  where o.marketplace_vendor_id = v_vendor_id;

  if v_organization_id is null then
    return query select
      'unknown_marketplace_vendor'::text,
      v_event_id,
      null::uuid,
      null::uuid,
      'unknown_marketplace_vendor'::text;
    return;
  end if;

  insert into public.integration_events (
    event_id,
    direction,
    event_type,
    event_version,
    source_system,
    organization_id,
    occurred_at,
    received_at,
    available_at,
    actor,
    entities,
    metadata,
    payload
  )
  values (
    v_event_id,
    'inbound',
    'marketplace.lead.assigned',
    1,
    'marketplace',
    v_organization_id,
    v_occurred_at,
    p_received_at,
    p_received_at,
    p_event -> 'actor',
    p_event -> 'entities',
    coalesce(p_event -> 'metadata', '{}'::jsonb),
    p_event
  )
  returning * into v_event_row;

  begin
    if v_claimed_organization_id is distinct from v_organization_id then
      v_failure_code := 'invalid_workspace_relationship';
      raise exception using errcode = '23514', message = v_failure_code;
    end if;

    select * into v_existing_opportunity
    from public.opportunities o
    where o.marketplace_lead_id = v_lead_id
    for update;

    if found then
      if v_existing_opportunity.organization_id is distinct from v_organization_id
         or v_existing_opportunity.marketplace_request_id is distinct from v_request_id then
        v_failure_code := 'immutable_identity_conflict';
        raise exception using errcode = '23514', message = v_failure_code;
      end if;

      if v_homeowner_id is not null and (
        v_existing_opportunity.customer_id is null
        or not exists (
          select 1 from public.customers c
          where c.id = v_existing_opportunity.customer_id
            and c.organization_id = v_organization_id
            and c.marketplace_homeowner_id = v_homeowner_id
        )
      ) then
        v_failure_code := 'immutable_identity_conflict';
        raise exception using errcode = '23514', message = v_failure_code;
      end if;

      if v_property_external_id is not null and (
        v_existing_opportunity.property_id is null
        or not exists (
          select 1 from public.properties p
          where p.id = v_existing_opportunity.property_id
            and p.organization_id = v_organization_id
            and p.marketplace_property_id = v_property_external_id
        )
      ) then
        v_failure_code := 'immutable_identity_conflict';
        raise exception using errcode = '23514', message = v_failure_code;
      end if;

      update public.integration_events
      set processed_at = now(), last_error = null
      where id = v_event_row.id;

      return query select
        'already_processed'::text,
        v_event_id,
        v_organization_id,
        v_existing_opportunity.id,
        null::text;
      return;
    end if;

    if v_homeowner_id is not null then
      insert into public.customers (
        organization_id,
        user_id,
        marketplace_homeowner_id,
        display_name,
        email,
        phone
      )
      values (
        v_organization_id,
        null,
        v_homeowner_id,
        p_event #>> '{data,customer,displayName}',
        p_event #>> '{data,customer,email}',
        p_event #>> '{data,customer,phone}'
      )
      on conflict (organization_id, marketplace_homeowner_id)
        where organization_id is not null and marketplace_homeowner_id is not null
      do nothing;

      select * into v_customer
      from public.customers c
      where c.organization_id = v_organization_id
        and c.marketplace_homeowner_id = v_homeowner_id;
    else
      insert into public.customers (
        organization_id, user_id, display_name, email, phone
      )
      values (
        v_organization_id,
        null,
        p_event #>> '{data,customer,displayName}',
        p_event #>> '{data,customer,email}',
        p_event #>> '{data,customer,phone}'
      )
      returning * into v_customer;
    end if;

    if v_property_external_id is not null then
      insert into public.properties (
        organization_id,
        user_id,
        customer_id,
        marketplace_property_id,
        address_line1,
        address_line2,
        city,
        region,
        postal_code,
        country_code
      )
      values (
        v_organization_id,
        null,
        v_customer.id,
        v_property_external_id,
        p_event #>> '{data,property,addressLine1}',
        p_event #>> '{data,property,addressLine2}',
        p_event #>> '{data,property,city}',
        p_event #>> '{data,property,region}',
        p_event #>> '{data,property,postalCode}',
        upper(p_event #>> '{data,property,countryCode}')
      )
      on conflict (organization_id, marketplace_property_id)
        where organization_id is not null and marketplace_property_id is not null
      do nothing;

      select * into v_property
      from public.properties p
      where p.organization_id = v_organization_id
        and p.marketplace_property_id = v_property_external_id;

      if v_property.customer_id is not null
         and v_property.customer_id is distinct from v_customer.id then
        v_failure_code := 'immutable_identity_conflict';
        raise exception using errcode = '23514', message = v_failure_code;
      end if;
    else
      insert into public.properties (
        organization_id,
        user_id,
        customer_id,
        address_line1,
        address_line2,
        city,
        region,
        postal_code,
        country_code
      )
      values (
        v_organization_id,
        null,
        v_customer.id,
        p_event #>> '{data,property,addressLine1}',
        p_event #>> '{data,property,addressLine2}',
        p_event #>> '{data,property,city}',
        p_event #>> '{data,property,region}',
        p_event #>> '{data,property,postalCode}',
        upper(p_event #>> '{data,property,countryCode}')
      )
      returning * into v_property;
    end if;

    insert into public.opportunities (
      organization_id,
      user_id,
      customer_id,
      property_id,
      marketplace_lead_id,
      marketplace_request_id,
      origin,
      status,
      service_type,
      summary,
      description,
      assigned_user_id,
      source_snapshot
    )
    values (
      v_organization_id,
      null,
      v_customer.id,
      v_property.id,
      v_lead_id,
      v_request_id,
      'marketplace',
      'new',
      p_event #>> '{data,serviceCategory,code}',
      p_event #>> '{data,requestTitle}',
      p_event #>> '{data,requestDescription}',
      null,
      jsonb_strip_nulls(jsonb_build_object(
        'contractVersion', 1,
        'marketplaceLeadId', v_lead_id,
        'marketplaceRequestId', v_request_id,
        'marketplaceHomeownerId', v_homeowner_id,
        'marketplacePropertyId', v_property_external_id,
        'assignedAt', p_event #>> '{data,assignedAt}',
        'serviceCategory', p_event #> '{data,serviceCategory}',
        'requestTitle', p_event #>> '{data,requestTitle}',
        'requestDescription', p_event #>> '{data,requestDescription}',
        'preferredTiming', p_event #>> '{data,preferredTiming}',
        'budgetRange', p_event #> '{data,budgetRange}',
        'customer', p_event #> '{data,customer}',
        'property', p_event #> '{data,property}'
      ))
    )
    returning * into v_opportunity;

    insert into public.opportunity_status_history (
      opportunity_id,
      from_status,
      to_status,
      actor_user_id,
      source_system,
      integration_event_id,
      occurred_at
    )
    values (
      v_opportunity.id,
      null,
      'new',
      null,
      'marketplace',
      v_event_row.id,
      v_assigned_at
    );

    update public.integration_events
    set processed_at = now(), last_error = null
    where id = v_event_row.id;

    return query select
      'processed'::text,
      v_event_id,
      v_organization_id,
      v_opportunity.id,
      null::text;
    return;
  exception when others then
    update public.integration_events
    set last_error = v_failure_code, processed_at = null
    where id = v_event_row.id;

    return query select
      'projection_failed'::text,
      v_event_id,
      v_organization_id,
      null::uuid,
      v_failure_code;
    return;
  end;
end;
$$;

revoke all on function public.process_marketplace_lead_assigned(jsonb, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.process_marketplace_lead_assigned(jsonb, timestamptz)
  to service_role;
