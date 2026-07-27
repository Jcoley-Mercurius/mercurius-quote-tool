-- Run against a disposable database after migrations through 025.
\set ON_ERROR_STOP on

do $$
begin
  if has_table_privilege('authenticated', 'public.properties', 'delete')
     or has_table_privilege('authenticated', 'public.property_audit_history', 'insert')
     or has_function_privilege(
       'anon',
       'public.update_property(uuid,timestamptz,text,text,text,text,text,text,text,text,text[],jsonb)',
       'execute'
     )
     or not has_function_privilege(
       'authenticated',
       'public.update_property(uuid,timestamptz,text,text,text,text,text,text,text,text,text[],jsonb)',
       'execute'
     ) then raise exception 'property grants are incorrect'; end if;
end;
$$;

begin;
do $$
declare
  v_personal uuid := '02500000-0000-4000-8000-000000000001';
  v_owner uuid := '02500000-0000-4000-8000-000000000002';
  v_admin uuid := '02500000-0000-4000-8000-000000000003';
  v_member uuid := '02500000-0000-4000-8000-000000000004';
  v_outsider uuid := '02500000-0000-4000-8000-000000000005';
  v_org uuid := '02500000-0000-4000-8000-000000000100';
  v_other_org uuid := '02500000-0000-4000-8000-000000000101';
  v_personal_property uuid := '02500000-0000-4000-8000-000000000200';
  v_org_property uuid := '02500000-0000-4000-8000-000000000201';
  v_customer uuid := '02500000-0000-4000-8000-000000000300';
  v_other_customer uuid := '02500000-0000-4000-8000-000000000301';
  v_version timestamptz;
  v_actor uuid;
begin
  insert into auth.users (id, email) values
    (v_personal, 'pr54-personal@example.invalid'), (v_owner, 'pr54-owner@example.invalid'),
    (v_admin, 'pr54-admin@example.invalid'), (v_member, 'pr54-member@example.invalid'),
    (v_outsider, 'pr54-outsider@example.invalid');
  insert into public.organizations (id, name) values (v_org, 'PR5.4'), (v_other_org, 'Other');
  insert into public.organization_members (organization_id, user_id, role) values
    (v_org, v_owner, 'owner'), (v_org, v_admin, 'admin'), (v_org, v_member, 'member'),
    (v_other_org, v_outsider, 'owner');
  insert into public.customers (id, organization_id, user_id, display_name) values
    (v_customer, v_org, v_owner, 'Customer'),
    (v_other_customer, v_other_org, v_outsider, 'Other customer');
  insert into public.properties (
    id, organization_id, user_id, customer_id, marketplace_property_id,
    address_line1, property_data, access_instructions
  ) values
    (v_personal_property, null, v_personal, null, null, '1 Personal Way', '{}', 'private'),
    (v_org_property, v_org, v_owner, v_customer,
      '02500000-0000-4000-8000-000000000900', '2 Organization Way',
      '{"sourceUnknown":"preserve"}', 'gate code');

  perform set_config('request.jwt.claim.sub', v_personal::text, true);
  select updated_at into v_version from public.properties where id = v_personal_property;
  perform public.update_property(
    v_personal_property, v_version, ' 10 Updated St ', null, 'Fort Myers', 'FL',
    '33901', 'us', 'Summary', 'new private', array['home'],
    '{"propertyType":"Single family","yearBuilt":2001}'
  );
  if not exists (
    select 1 from public.property_audit_history
    where property_id = v_personal_property and user_id = v_personal
      and organization_id is null and changed_fields @> array['access_instructions']
  ) then raise exception 'personal audit failed'; end if;

  begin
    perform public.update_property(
      v_personal_property, v_version, 'Stale', null, null, null, null, 'US',
      null, null, '{}', '{}'
    );
    raise exception 'stale property update succeeded';
  exception when serialization_failure then null;
  end;

  foreach v_actor in array array[v_owner, v_admin, v_member] loop
    perform set_config('request.jwt.claim.sub', v_actor::text, true);
    select updated_at into v_version from public.properties where id = v_org_property;
    perform public.update_property(
      v_org_property, v_version, '2 Organization Way', null, 'Cape Coral', 'FL',
      '33904', 'US', v_actor::text, 'private', array[v_actor::text],
      '{"stories":"2"}'
    );
  end loop;
  if (select property_data->>'sourceUnknown' from public.properties where id = v_org_property)
     <> 'preserve' then raise exception 'unknown property_data was not preserved'; end if;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  select updated_at into v_version from public.properties where id = v_org_property;
  begin
    perform public.update_property(
      v_org_property, v_version, null, null, null, null, null, 'US',
      null, null, '{}', '{}'
    );
    raise exception 'outsider property update succeeded';
  exception when no_data_found then null;
  end;
  delete from public.organization_members where organization_id = v_org and user_id = v_member;
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.update_property(
      v_org_property, v_version, null, null, null, null, null, 'US',
      null, null, '{}', '{}'
    );
    raise exception 'removed member property update succeeded';
  exception when no_data_found then null;
  end;

  -- Direct writes cannot alter immutable fields or sensitive operational data.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin
    update public.properties set marketplace_property_id = null, customer_id = v_other_customer
    where id = v_org_property;
    raise exception 'direct protected update succeeded';
  exception when insufficient_privilege then null;
  end;
  if not exists (select 1 from public.properties where id = v_org_property and customer_id = v_customer)
  then raise exception 'relationship changed destructively'; end if;

  begin
    update public.property_audit_history set changed_fields = array['raw_private_value']
    where property_id = v_org_property;
    raise exception 'audit mutation succeeded';
  exception when insufficient_privilege then null;
  end;
  if exists (
    select 1 from public.property_audit_history
    where property_id in (v_personal_property, v_org_property)
      and array_to_string(changed_fields, ',') like '%gate%'
  ) then raise exception 'sensitive access content entered audit history'; end if;
end;
$$;
rollback;
