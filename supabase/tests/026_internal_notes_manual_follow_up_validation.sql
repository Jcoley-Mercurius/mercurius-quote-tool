-- Run against a disposable database after migrations through 026.
\set ON_ERROR_STOP on

do $$
begin
  if has_table_privilege('authenticated', 'public.crm_notes', 'insert')
     or has_table_privilege('authenticated', 'public.crm_notes', 'delete')
     or has_table_privilege('authenticated', 'public.crm_tasks', 'update')
     or has_table_privilege('authenticated', 'public.crm_tasks', 'delete')
     or has_table_privilege('authenticated', 'public.crm_task_history', 'insert')
     or has_function_privilege('anon', 'public.create_crm_note(uuid,uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.create_crm_task(uuid,uuid,text,text,timestamptz,uuid)', 'execute')
  then raise exception 'CRM grants are incorrect'; end if;
end;
$$;

begin;
do $$
declare
  v_personal uuid := '02600000-0000-4000-8000-000000000001';
  v_owner uuid := '02600000-0000-4000-8000-000000000002';
  v_admin uuid := '02600000-0000-4000-8000-000000000003';
  v_member uuid := '02600000-0000-4000-8000-000000000004';
  v_outsider uuid := '02600000-0000-4000-8000-000000000005';
  v_org uuid := '02600000-0000-4000-8000-000000000100';
  v_other_org uuid := '02600000-0000-4000-8000-000000000101';
  v_customer uuid := '02600000-0000-4000-8000-000000000200';
  v_personal_customer uuid := '02600000-0000-4000-8000-000000000201';
  v_other_customer uuid := '02600000-0000-4000-8000-000000000202';
  v_property uuid := '02600000-0000-4000-8000-000000000300';
  v_note public.crm_notes%rowtype;
  v_task public.crm_tasks%rowtype;
  v_actor uuid;
begin
  insert into auth.users (id, email) values
    (v_personal, 'pr55-personal@example.invalid'), (v_owner, 'pr55-owner@example.invalid'),
    (v_admin, 'pr55-admin@example.invalid'), (v_member, 'pr55-member@example.invalid'),
    (v_outsider, 'pr55-outsider@example.invalid');
  insert into public.organizations (id, name) values (v_org, 'PR5.5'), (v_other_org, 'Other');
  insert into public.organization_members (organization_id, user_id, role) values
    (v_org, v_owner, 'owner'), (v_org, v_admin, 'admin'), (v_org, v_member, 'member'),
    (v_other_org, v_outsider, 'owner');
  insert into public.customers (id, organization_id, user_id, display_name) values
    (v_customer, v_org, v_owner, 'Organization customer'),
    (v_personal_customer, null, v_personal, 'Personal customer'),
    (v_other_customer, v_other_org, v_outsider, 'Other customer');
  insert into public.properties (id, organization_id, user_id, customer_id, address_line1)
    values (v_property, v_org, v_owner, v_customer, '1 Follow Up Way');

  perform set_config('request.jwt.claim.sub', v_personal::text, true);
  v_note := public.create_crm_note(v_personal_customer, null, '  Personal note  ');
  if v_note.author_id <> v_personal or v_note.user_id <> v_personal
     or v_note.organization_id is not null or v_note.body <> 'Personal note'
  then raise exception 'personal note scope/author/normalization failed'; end if;
  v_task := public.create_crm_task(
    v_personal_customer, null, 'Personal follow-up', null, now() - interval '1 day', v_personal
  );
  if v_task.created_by <> v_personal or v_task.status <> 'open'
  then raise exception 'personal task creation failed'; end if;

  begin
    perform public.create_crm_note(v_personal_customer, v_property, 'Two targets');
    raise exception 'two-target note succeeded';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.create_crm_note(v_other_customer, null, 'Cross workspace');
    raise exception 'cross-workspace note succeeded';
  exception when no_data_found then null;
  end;
  begin
    perform public.create_crm_note(v_personal_customer, null, '   ');
    raise exception 'blank note succeeded';
  exception when invalid_parameter_value then null;
  end;

  foreach v_actor in array array[v_owner, v_admin, v_member] loop
    perform set_config('request.jwt.claim.sub', v_actor::text, true);
    v_note := public.create_crm_note(null, v_property, 'Role note');
    v_task := public.create_crm_task(
      null, v_property, 'Role follow-up', 'Manual only', now() + interval '1 day', v_member
    );
    if v_note.author_id <> v_actor or v_task.created_by <> v_actor
    then raise exception 'organization actor derivation failed'; end if;
  end loop;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin
    perform public.create_crm_task(
      v_customer, null, 'Bad assignee', null, null, v_outsider
    );
    raise exception 'cross-organization assignee succeeded';
  exception when invalid_parameter_value then null;
  end;

  v_task := public.create_crm_task(
    v_customer, null, 'Concurrency task', null, now() - interval '1 hour', v_owner
  );
  v_task := public.update_crm_task(
    v_task.id, v_task.updated_at, 'Updated task', null, null, v_admin
  );
  begin
    perform public.update_crm_task(
      v_task.id, v_task.created_at, 'Stale overwrite', null, null, v_owner
    );
    raise exception 'stale task update succeeded';
  exception when serialization_failure then null;
  end;
  v_task := public.set_crm_task_status(v_task.id, v_task.updated_at, 'completed');
  if v_task.completed_at is null or v_task.completed_by <> v_owner
  then raise exception 'task completion failed'; end if;
  v_task := public.set_crm_task_status(v_task.id, v_task.updated_at, 'open');
  if v_task.completed_at is not null or v_task.completed_by is not null
  then raise exception 'task reopen failed'; end if;
  if (
    select count(*) from public.crm_task_history
    where task_id = v_task.id and action in (
      'task_created', 'task_updated', 'task_completed', 'task_reopened'
    )
  ) <> 4 then raise exception 'task lifecycle history failed'; end if;

  v_note := public.create_crm_note(v_customer, null, 'Immutable note');
  v_note := public.archive_crm_note(v_note.id, v_note.updated_at);
  if v_note.archived_at is null or v_note.archived_by <> v_owner
  then raise exception 'note archive failed'; end if;
  begin
    update public.crm_notes set body = 'destructive edit' where id = v_note.id;
    raise exception 'browser-style note edit succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.crm_task_history set changed_fields = array['private description']
      where task_id = v_task.id;
    raise exception 'task history mutation succeeded';
  exception when insufficient_privilege then null;
  end;

  delete from public.organization_members where organization_id = v_org and user_id = v_member;
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.create_crm_note(v_customer, null, 'Removed member');
    raise exception 'removed member note succeeded';
  exception when no_data_found then null;
  end;
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  begin
    perform public.create_crm_task(v_customer, null, 'Outsider', null, null, null);
    raise exception 'outsider task succeeded';
  exception when no_data_found then null;
  end;
end;
$$;
rollback;
