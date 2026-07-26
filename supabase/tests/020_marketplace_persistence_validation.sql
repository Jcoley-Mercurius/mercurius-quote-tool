-- Run after applying 020_marketplace_persistence_foundation.sql.
-- This script validates catalog-level guarantees without creating fixture data.
-- Actor-specific behavioral checks are documented in
-- docs/testing/marketplace-schema-rls.md.

do $$
declare
  v_table text;
  v_index text;
  v_trigger text;
begin
  foreach v_table in array array[
    'integration_events',
    'customers',
    'properties',
    'opportunities',
    'opportunity_status_history'
  ]
  loop
    if to_regclass('public.' || v_table) is null then
      raise exception 'Missing table public.%', v_table;
    end if;

    if not (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table
    ) then
      raise exception 'RLS is not enabled on public.%', v_table;
    end if;
  end loop;

  foreach v_index in array array[
    'organizations_marketplace_vendor_id_uidx',
    'integration_events_inbound_available_idx',
    'integration_events_outbound_available_idx',
    'integration_events_organization_type_occurred_idx',
    'customers_org_marketplace_homeowner_uidx',
    'customers_personal_marketplace_homeowner_uidx',
    'properties_org_marketplace_property_uidx',
    'properties_personal_marketplace_property_uidx',
    'properties_customer_updated_idx',
    'opportunities_marketplace_lead_uidx',
    'opportunities_organization_status_updated_idx',
    'opportunities_personal_status_updated_idx',
    'opportunities_customer_idx',
    'opportunities_property_idx',
    'opportunities_assigned_user_idx',
    'opportunities_marketplace_request_idx',
    'opportunity_status_history_opportunity_time_idx',
    'opportunity_status_history_integration_event_uidx',
    'quotes_opportunity_created_idx'
  ]
  loop
    if to_regclass('public.' || v_index) is null then
      raise exception 'Missing index public.%', v_index;
    end if;
  end loop;

  foreach v_trigger in array array[
    'organizations_protect_marketplace_vendor_id',
    'integration_events_set_updated_at',
    'customers_set_updated_at',
    'customers_protect_workspace_fields',
    'properties_validate_workspace',
    'properties_protect_workspace_fields',
    'properties_set_updated_at',
    'opportunities_validate_workspace',
    'opportunities_protect_workspace_fields',
    'opportunities_require_transition',
    'opportunities_set_updated_at',
    'quotes_validate_opportunity_workspace'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = v_trigger
        and not tgisinternal
    ) then
      raise exception 'Missing trigger %', v_trigger;
    end if;
  end loop;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'marketplace_vendor_id'
      and is_nullable = 'YES'
      and data_type = 'uuid'
  ) then
    raise exception 'organizations.marketplace_vendor_id is missing or invalid';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'opportunity_id'
      and is_nullable = 'YES'
      and data_type = 'uuid'
  ) then
    raise exception 'quotes.opportunity_id is missing or invalid';
  end if;

  if has_table_privilege('anon', 'public.integration_events', 'select')
     or has_table_privilege('anon', 'public.integration_events', 'insert')
     or has_table_privilege('authenticated', 'public.integration_events', 'select')
     or has_table_privilege('authenticated', 'public.integration_events', 'insert')
     or has_table_privilege('authenticated', 'public.integration_events', 'update')
     or has_table_privilege('authenticated', 'public.integration_events', 'delete') then
    raise exception 'Browser role has integration_events privileges';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.organizations',
    'marketplace_vendor_id',
    'update'
  ) then
    raise exception 'authenticated may update organizations.marketplace_vendor_id';
  end if;

  if has_table_privilege('authenticated', 'public.opportunities', 'delete')
     or has_table_privilege('authenticated', 'public.customers', 'delete')
     or has_table_privilege('authenticated', 'public.properties', 'delete')
     or has_table_privilege(
       'authenticated',
       'public.opportunity_status_history',
       'insert'
     ) then
    raise exception 'Browser role has a forbidden mutation privilege';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_events'
  ) then
    raise exception 'integration_events unexpectedly has a browser RLS policy';
  end if;

  if has_function_privilege(
    'anon',
    'public.transition_opportunity(uuid,text,text,jsonb)',
    'execute'
  ) then
    raise exception 'anon may execute transition_opportunity';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.transition_opportunity(uuid,text,text,jsonb)',
    'execute'
  ) then
    raise exception 'authenticated cannot execute transition_opportunity';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'transition_opportunity'
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'transition_opportunity lacks a fixed safe search_path';
  end if;
end;
$$;
