-- Run against a disposable database after migrations through 024.
\set ON_ERROR_STOP on

do $$
begin
  if has_table_privilege('authenticated', 'public.customers', 'delete') then
    raise exception 'authenticated unexpectedly has a hard-delete path';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.update_customer(uuid,timestamptz,text,text,text,text,text,text,text[])',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.archive_customer(uuid,timestamptz,text)',
    'execute'
  ) then
    raise exception 'customer mutation function grants are incorrect';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.customer_audit_history'::regclass
      and tgname = 'customer_audit_history_append_only'
  ) then
    raise exception 'customer audit append-only trigger is absent';
  end if;
end;
$$;

begin;

do $$
declare
  v_personal uuid := '02400000-0000-4000-8000-000000000001';
  v_owner uuid := '02400000-0000-4000-8000-000000000002';
  v_admin uuid := '02400000-0000-4000-8000-000000000003';
  v_member uuid := '02400000-0000-4000-8000-000000000004';
  v_outsider uuid := '02400000-0000-4000-8000-000000000005';
  v_removed uuid := '02400000-0000-4000-8000-000000000006';
  v_org uuid := '02400000-0000-4000-8000-000000000100';
  v_personal_customer uuid := '02400000-0000-4000-8000-000000000200';
  v_org_customer uuid := '02400000-0000-4000-8000-000000000201';
  v_property uuid := '02400000-0000-4000-8000-000000000300';
  v_opportunity uuid := '02400000-0000-4000-8000-000000000400';
  v_original_version timestamptz;
  v_version timestamptz;
begin
  insert into auth.users (id, email) values
    (v_personal, 'pr53-personal@example.invalid'),
    (v_owner, 'pr53-owner@example.invalid'),
    (v_admin, 'pr53-admin@example.invalid'),
    (v_member, 'pr53-member@example.invalid'),
    (v_outsider, 'pr53-outsider@example.invalid'),
    (v_removed, 'pr53-removed@example.invalid');
  insert into public.organizations (id, name) values (v_org, 'PR5.3 validation');
  insert into public.organization_members (organization_id, user_id, role) values
    (v_org, v_owner, 'owner'), (v_org, v_admin, 'admin'), (v_org, v_member, 'member');
  insert into public.customers (
    id, organization_id, user_id, marketplace_homeowner_id, display_name, email, phone
  ) values
    (v_personal_customer, null, v_personal, '02400000-0000-4000-8000-000000000900',
      ' Personal Customer ', 'SAME@Example.Invalid ', '+1 (555) 0100'),
    (v_org_customer, v_org, v_owner, '02400000-0000-4000-8000-000000000901',
      'Organization Customer', null, null);
  insert into public.properties (
    id, organization_id, user_id, customer_id, address_line1
  ) values (v_property, v_org, v_owner, v_org_customer, '1 Integrity Way');
  insert into public.opportunities (
    id, organization_id, user_id, customer_id, origin, status, service_type
  ) values (v_opportunity, v_org, v_owner, v_org_customer, 'direct', 'new', 'other');

  if (select normalized_email from public.customers where id = v_personal_customer)
       <> 'same@example.invalid'
     or (select normalized_phone from public.customers where id = v_personal_customer)
       <> '15550100' then
    raise exception 'deterministic comparison normalization failed';
  end if;

  select updated_at into v_original_version from public.customers where id = v_personal_customer;
  perform set_config('request.jwt.claim.sub', v_personal::text, true);
  perform public.update_customer(
    v_personal_customer, v_original_version, 'Personal Updated', ' Acme ',
    'updated@example.invalid', '+1 555 0101', 'email', 'Summary', array['priority']
  );
  if not exists (
    select 1 from public.customer_audit_history
    where customer_id = v_personal_customer and user_id = v_personal
      and organization_id is null and action = 'customer_updated'
  ) then raise exception 'personal audit event was not scoped correctly'; end if;

  begin
    perform public.update_customer(
      v_personal_customer, v_original_version, 'Stale overwrite', null,
      null, null, null, null, '{}'::text[]
    );
    raise exception 'stale update unexpectedly succeeded';
  exception when serialization_failure then null;
  end;

  -- The same organization predicate intentionally authorizes owner/admin/member.
  foreach v_member in array array[v_owner, v_admin, v_member] loop
    perform set_config('request.jwt.claim.sub', v_member::text, true);
    select updated_at into v_version from public.customers where id = v_org_customer;
    perform public.update_customer(
      v_org_customer, v_version, 'Organization ' || left(v_member::text, 3),
      null, null, null, null, null, '{}'::text[]
    );
  end loop;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  select updated_at into v_version from public.customers where id = v_org_customer;
  begin
    perform public.archive_customer(v_org_customer, v_version, null);
    raise exception 'outside-workspace archive unexpectedly succeeded';
  exception when no_data_found then null;
  end;
  -- Pending users have no membership row; removed membership is equivalent.
  delete from public.organization_members
  where organization_id = v_org and user_id = v_member;
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.update_customer(
      v_org_customer, v_version, 'Removed', null, null, null, null, null, '{}'::text[]
    );
    raise exception 'removed member update unexpectedly succeeded';
  exception when no_data_found then null;
  end;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select updated_at into v_version from public.customers where id = v_org_customer;
  perform public.archive_customer(v_org_customer, v_version, 'No longer active');
  if not exists (
    select 1 from public.customers where id = v_org_customer
      and archived_at is not null and archived_by = v_owner
      and archive_reason = 'No longer active'
  ) then raise exception 'archive metadata failed'; end if;
  if not exists (select 1 from public.properties where id = v_property and customer_id = v_org_customer)
     or not exists (select 1 from public.opportunities where id = v_opportunity and customer_id = v_org_customer)
  then raise exception 'archive damaged customer relationships'; end if;

  select updated_at into v_version from public.customers where id = v_org_customer;
  perform public.restore_customer(v_org_customer, v_version);
  if exists (
    select 1 from public.customers where id = v_org_customer
      and (archived_at is not null or archived_by is not null or archive_reason is not null)
  ) then raise exception 'restore did not clear archive metadata'; end if;
  if (select count(*) from public.customer_audit_history
      where customer_id = v_org_customer and organization_id = v_org
        and action in ('customer_archived', 'customer_restored')) <> 2
  then raise exception 'organization archive audit history failed'; end if;

  begin
    update public.customer_audit_history set changed_fields = array['tampered']
    where customer_id = v_org_customer;
    raise exception 'audit mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
