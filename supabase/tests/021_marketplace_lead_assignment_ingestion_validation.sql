-- Run against a disposable database after migrations through 021.
-- Catalog checks persist no data. Behavioral fixtures run inside a rollback.
\set ON_ERROR_STOP on

do $$
begin
  if to_regprocedure(
    'public.process_marketplace_lead_assigned(jsonb,timestamp with time zone)'
  ) is null then
    raise exception 'process_marketplace_lead_assigned is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_marketplace_lead_assigned'
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'ingestion RPC lacks SECURITY DEFINER or safe search_path';
  end if;

  if has_function_privilege(
       'anon',
       'public.process_marketplace_lead_assigned(jsonb,timestamptz)',
       'execute'
     )
     or has_function_privilege(
       'authenticated',
       'public.process_marketplace_lead_assigned(jsonb,timestamptz)',
       'execute'
     )
     or not has_function_privilege(
       'service_role',
       'public.process_marketplace_lead_assigned(jsonb,timestamptz)',
       'execute'
     ) then
    raise exception 'ingestion RPC grants are not service-role-only';
  end if;

  if has_table_privilege('authenticated', 'public.integration_events', 'select')
     or has_table_privilege('authenticated', 'public.integration_events', 'insert')
     or has_table_privilege('authenticated', 'public.integration_events', 'update')
     or has_table_privilege('authenticated', 'public.integration_events', 'delete') then
    raise exception 'browser integration-event access was introduced';
  end if;
end;
$$;

begin;

do $$
declare
  v_org_id uuid := gen_random_uuid();
  v_other_org_id uuid := gen_random_uuid();
  v_vendor_id uuid := gen_random_uuid();
  v_unknown_vendor_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_second_event_id uuid := gen_random_uuid();
  v_conflict_event_id uuid := gen_random_uuid();
  v_event_identity_conflict_result record;
  v_lead_id uuid := gen_random_uuid();
  v_request_id uuid := gen_random_uuid();
  v_homeowner_id uuid := gen_random_uuid();
  v_property_id uuid := gen_random_uuid();
  v_event jsonb;
  v_result record;
  v_opportunity_id uuid;
begin
  insert into public.organizations (id, name, marketplace_vendor_id)
  values
    (v_org_id, 'PR 3 validation organization', v_vendor_id),
    (v_other_org_id, 'PR 3 other organization', null);

  v_event := jsonb_build_object(
    'eventId', v_event_id,
    'eventType', 'marketplace.lead.assigned',
    'eventVersion', 1,
    'occurredAt', '2026-07-25T18:30:00Z',
    'sourceSystem', 'marketplace',
    'organizationId', v_org_id,
    'actor', jsonb_build_object('actorType', 'system', 'system', 'marketplace'),
    'entities', jsonb_build_array(
      jsonb_build_object('entityType', 'marketplaceLead', 'entityId', v_lead_id)
    ),
    'metadata', '{}'::jsonb,
    'data', jsonb_build_object(
      'marketplaceLeadId', v_lead_id,
      'marketplaceRequestId', v_request_id,
      'marketplaceVendorId', v_vendor_id,
      'marketplaceHomeownerId', v_homeowner_id,
      'marketplacePropertyId', v_property_id,
      'assignedAt', '2026-07-25T18:30:00Z',
      'serviceCategory', jsonb_build_object(
        'code', 'plumbing',
        'displayName', 'Plumbing'
      ),
      'requestTitle', 'Validation request',
      'requestDescription', 'Bounded validation description.',
      'customer', jsonb_build_object(
        'displayName', 'Validation Customer',
        'email', 'fixture@example.invalid'
      ),
      'property', jsonb_build_object(
        'addressLine1', '1 Validation Way',
        'city', 'Example',
        'region', 'FL',
        'postalCode', '33900',
        'countryCode', 'US'
      )
    )
  );

  select * into v_result
  from public.process_marketplace_lead_assigned(
    v_event,
    '2026-07-25T18:30:01Z'
  );
  if v_result.processing_status <> 'processed' then
    raise exception 'first event was not processed: %', v_result.processing_status;
  end if;
  v_opportunity_id := v_result.opportunity_id;

  if (select count(*) from public.integration_events where event_id = v_event_id) <> 1
     or (select count(*) from public.customers where organization_id = v_org_id) <> 1
     or (select count(*) from public.properties where organization_id = v_org_id) <> 1
     or (select count(*) from public.opportunities where marketplace_lead_id = v_lead_id) <> 1
     or (
       select count(*) from public.opportunity_status_history
       where opportunity_id = v_opportunity_id
         and from_status is null
         and to_status = 'new'
         and source_system = 'marketplace'
         and integration_event_id is not null
     ) <> 1 then
    raise exception 'first projection produced incorrect row counts';
  end if;

  select * into v_result
  from public.process_marketplace_lead_assigned(
    v_event,
    '2026-07-25T18:30:02Z'
  );
  if v_result.processing_status <> 'already_processed'
     or v_result.opportunity_id <> v_opportunity_id then
    raise exception 'same-event replay was not idempotent';
  end if;

  select * into v_event_identity_conflict_result
  from public.process_marketplace_lead_assigned(
    jsonb_set(v_event, '{data,marketplaceRequestId}', to_jsonb(gen_random_uuid())),
    '2026-07-25T18:30:02Z'
  );
  if v_event_identity_conflict_result.processing_status <> 'projection_failed'
     or v_event_identity_conflict_result.error_code <> 'immutable_identity_conflict' then
    raise exception 'modified reuse of an event ID did not fail safely';
  end if;

  select * into v_result
  from public.process_marketplace_lead_assigned(
    jsonb_set(v_event, '{eventId}', to_jsonb(v_second_event_id)),
    '2026-07-25T18:30:03Z'
  );
  if v_result.processing_status <> 'already_processed'
     or v_result.opportunity_id <> v_opportunity_id
     or (select count(*) from public.opportunities where marketplace_lead_id = v_lead_id) <> 1
     or (select count(*) from public.opportunity_status_history where opportunity_id = v_opportunity_id) <> 1 then
    raise exception 'same-lead/different-event delivery was not idempotent';
  end if;

  select * into v_result
  from public.process_marketplace_lead_assigned(
    jsonb_set(
      jsonb_set(v_event, '{eventId}', to_jsonb(v_conflict_event_id)),
      '{organizationId}',
      to_jsonb(v_other_org_id)
    ),
    '2026-07-25T18:30:04Z'
  );
  if v_result.processing_status <> 'projection_failed'
     or v_result.error_code <> 'invalid_workspace_relationship'
     or exists (
       select 1 from public.opportunity_status_history
       where integration_event_id = (
         select id from public.integration_events
         where event_id = v_conflict_event_id
       )
     ) then
    raise exception 'failed projection did not roll back business rows safely';
  end if;

  select * into v_result
  from public.process_marketplace_lead_assigned(
    jsonb_set(
      jsonb_set(v_event, '{eventId}', to_jsonb(gen_random_uuid())),
      '{data,marketplaceVendorId}',
      to_jsonb(v_unknown_vendor_id)
    ),
    '2026-07-25T18:30:05Z'
  );
  if v_result.processing_status <> 'unknown_marketplace_vendor' then
    raise exception 'unknown vendor response was unstable';
  end if;

  if (select count(*) from public.customers where organization_id = v_org_id) <> 1
     or (select count(*) from public.properties where organization_id = v_org_id) <> 1
     or (select count(*) from public.opportunities where marketplace_lead_id = v_lead_id) <> 1 then
    raise exception 'a replay or failure created duplicate business records';
  end if;
end;
$$;

rollback;
