-- Workspace-private CRM notes and manual follow-up tasks.
-- Run after 025_property_detail_history_foundation.sql.

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  constraint crm_notes_workspace_check check (
    (organization_id is not null and user_id is null)
    or (organization_id is null and user_id is not null)
  ),
  constraint crm_notes_entity_check check (
    (customer_id is not null)::integer + (property_id is not null)::integer = 1
  ),
  constraint crm_notes_archive_check check (
    archived_at is not null or archived_by is null
  )
);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  assigned_to uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) between 1 and 2000),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'completed')),
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  constraint crm_tasks_workspace_check check (
    (organization_id is not null and user_id is null)
    or (organization_id is null and user_id is not null)
  ),
  constraint crm_tasks_entity_check check (
    (customer_id is not null)::integer + (property_id is not null)::integer = 1
  ),
  constraint crm_tasks_completion_check check (
    (status = 'open' and completed_at is null and completed_by is null)
    or (status = 'completed' and completed_at is not null)
  ),
  constraint crm_tasks_archive_check check (
    archived_at is not null or archived_by is null
  )
);

create table public.crm_task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.crm_tasks (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in (
    'task_created', 'task_updated', 'task_assigned', 'task_due_changed',
    'task_completed', 'task_reopened', 'task_archived'
  )),
  changed_fields text[] not null default '{}'::text[],
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint crm_task_history_workspace_check check (
    (organization_id is not null and user_id is null)
    or (organization_id is null and user_id is not null)
  )
);

create index crm_notes_customer_time_idx on public.crm_notes
  (customer_id, created_at desc, id) where customer_id is not null;
create index crm_notes_property_time_idx on public.crm_notes
  (property_id, created_at desc, id) where property_id is not null;
create index crm_tasks_customer_status_due_idx on public.crm_tasks
  (customer_id, archived_at, status, due_at, id) where customer_id is not null;
create index crm_tasks_property_status_due_idx on public.crm_tasks
  (property_id, archived_at, status, due_at, id) where property_id is not null;
create index crm_tasks_org_assignee_status_due_idx on public.crm_tasks
  (organization_id, assigned_to, status, due_at, id)
  where organization_id is not null and archived_at is null;
create index crm_tasks_personal_status_due_idx on public.crm_tasks
  (user_id, status, due_at, id)
  where organization_id is null and archived_at is null;
create index crm_task_history_task_time_idx on public.crm_task_history
  (task_id, occurred_at desc, id);

alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_task_history enable row level security;

create or replace function public.require_crm_note_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' or current_setting('app.crm_note_mutation', true) is distinct from 'on' then
    raise exception using errcode = '42501', message = 'CRM notes use explicit mutation functions';
  end if;
  return new;
end;
$$;
create or replace function public.require_crm_task_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' or current_setting('app.crm_task_mutation', true) is distinct from 'on' then
    raise exception using errcode = '42501', message = 'CRM tasks use explicit mutation functions';
  end if;
  return new;
end;
$$;
revoke all on function public.require_crm_note_mutation() from public, anon, authenticated;
revoke all on function public.require_crm_task_mutation() from public, anon, authenticated;
create trigger crm_notes_require_mutation before update or delete on public.crm_notes
  for each row execute function public.require_crm_note_mutation();
create trigger crm_tasks_require_mutation before update or delete on public.crm_tasks
  for each row execute function public.require_crm_task_mutation();

create or replace function public.validate_crm_entity_workspace()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_org uuid; v_user uuid;
begin
  if (new.customer_id is not null)::integer + (new.property_id is not null)::integer <> 1 then
    raise exception using errcode = '23514', message = 'CRM record requires exactly one target';
  end if;
  if new.customer_id is not null then
    select c.organization_id, case when c.organization_id is null then c.user_id else null end
      into v_org, v_user from public.customers c where c.id = new.customer_id;
  else
    select p.organization_id, case when p.organization_id is null then p.user_id else null end
      into v_org, v_user from public.properties p where p.id = new.property_id;
  end if;
  if not found or new.organization_id is distinct from v_org or new.user_id is distinct from v_user then
    raise exception using errcode = '23514', message = 'CRM record and target must share a workspace';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_crm_entity_workspace() from public, anon, authenticated;
create trigger crm_notes_validate_workspace
  before insert or update of organization_id, user_id, customer_id, property_id on public.crm_notes
  for each row execute function public.validate_crm_entity_workspace();
create trigger crm_tasks_validate_workspace
  before insert or update of organization_id, user_id, customer_id, property_id on public.crm_tasks
  for each row execute function public.validate_crm_entity_workspace();

create or replace function public.validate_crm_task_history_workspace()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.crm_tasks t where t.id = new.task_id
      and t.organization_id is not distinct from new.organization_id
      and t.user_id is not distinct from new.user_id
  ) then raise exception using errcode = '23514', message = 'Task history and task must share a workspace'; end if;
  return new;
end;
$$;
revoke all on function public.validate_crm_task_history_workspace() from public, anon, authenticated;
create trigger crm_task_history_validate_workspace before insert on public.crm_task_history
  for each row execute function public.validate_crm_task_history_workspace();

create or replace function public.prevent_crm_task_history_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = '42501', message = 'CRM task history is append-only';
end;
$$;
revoke all on function public.prevent_crm_task_history_mutation() from public, anon, authenticated;
create trigger crm_task_history_append_only
  before update or delete on public.crm_task_history
  for each row execute function public.prevent_crm_task_history_mutation();

create policy "Users read personal CRM notes" on public.crm_notes
  for select to authenticated using (organization_id is null and user_id = auth.uid());
create policy "Org members read CRM notes" on public.crm_notes
  for select to authenticated using (organization_id is not null and public.is_org_member(organization_id));
create policy "Users read personal CRM tasks" on public.crm_tasks
  for select to authenticated using (organization_id is null and user_id = auth.uid());
create policy "Org members read CRM tasks" on public.crm_tasks
  for select to authenticated using (organization_id is not null and public.is_org_member(organization_id));
create policy "Users read personal CRM task history" on public.crm_task_history
  for select to authenticated using (organization_id is null and user_id = auth.uid());
create policy "Org members read CRM task history" on public.crm_task_history
  for select to authenticated using (organization_id is not null and public.is_org_member(organization_id));

revoke all on public.crm_notes, public.crm_tasks, public.crm_task_history
  from public, anon, authenticated;
grant select on public.crm_notes, public.crm_tasks, public.crm_task_history to authenticated;

create or replace function public.resolve_crm_target(
  p_customer_id uuid, p_property_id uuid, p_actor uuid,
  out organization_id uuid, out user_id uuid
)
returns record
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (p_customer_id is not null)::integer + (p_property_id is not null)::integer <> 1 then
    raise exception using errcode = '22023', message = 'Exactly one CRM target is required';
  end if;
  if p_customer_id is not null then
    select c.organization_id, case when c.organization_id is null then c.user_id else null end
      into organization_id, user_id
    from public.customers c where c.id = p_customer_id and (
      (c.organization_id is null and c.user_id = p_actor)
      or (c.organization_id is not null and public.is_org_member(c.organization_id))
    );
  else
    select p.organization_id, case when p.organization_id is null then p.user_id else null end
      into organization_id, user_id
    from public.properties p where p.id = p_property_id and (
      (p.organization_id is null and p.user_id = p_actor)
      or (p.organization_id is not null and public.is_org_member(p.organization_id))
    );
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'CRM target not found'; end if;
end;
$$;
revoke all on function public.resolve_crm_target(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.validate_crm_assignee(
  p_organization_id uuid, p_user_id uuid, p_assigned_to uuid, p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_organization_id is null then
    if p_assigned_to is not null and p_assigned_to <> p_user_id then
      raise exception using errcode = '22023', message = 'Invalid personal assignee';
    end if;
    return p_assigned_to;
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_assigned_to
  ) then raise exception using errcode = '22023', message = 'Invalid organization assignee'; end if;
  return p_assigned_to;
end;
$$;
revoke all on function public.validate_crm_assignee(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;

create or replace function public.create_crm_note(
  p_customer_id uuid default null, p_property_id uuid default null, p_body text default null
)
returns public.crm_notes
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid(); v_org uuid; v_user uuid; v_note public.crm_notes%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select organization_id, user_id into v_org, v_user
    from public.resolve_crm_target(p_customer_id, p_property_id, v_actor);
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'Invalid note body';
  end if;
  insert into public.crm_notes (
    organization_id, user_id, customer_id, property_id, author_id, body
  ) values (v_org, v_user, p_customer_id, p_property_id, v_actor, trim(p_body))
  returning * into v_note;
  return v_note;
end;
$$;

create or replace function public.archive_crm_note(
  p_note_id uuid, p_expected_updated_at timestamptz
)
returns public.crm_notes
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid(); v_note public.crm_notes%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select * into v_note from public.crm_notes n where n.id = p_note_id and (
    (n.organization_id is null and n.user_id = v_actor)
    or (n.organization_id is not null and public.is_org_member(n.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Note not found'; end if;
  if p_expected_updated_at is null or v_note.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Note is stale';
  end if;
  if v_note.archived_at is not null then raise exception using errcode = '22023', message = 'Note is already archived'; end if;
  perform set_config('app.crm_note_mutation', 'on', true);
  update public.crm_notes set archived_at = clock_timestamp(), archived_by = v_actor,
    updated_at = clock_timestamp()
    where id = v_note.id returning * into v_note;
  perform set_config('app.crm_note_mutation', 'off', true);
  return v_note;
end;
$$;

create or replace function public.create_crm_task(
  p_customer_id uuid default null, p_property_id uuid default null,
  p_title text default null, p_description text default null,
  p_due_at timestamptz default null, p_assigned_to uuid default null
)
returns public.crm_tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid(); v_org uuid; v_user uuid; v_assignee uuid;
  v_task public.crm_tasks%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select organization_id, user_id into v_org, v_user
    from public.resolve_crm_target(p_customer_id, p_property_id, v_actor);
  v_assignee := public.validate_crm_assignee(v_org, v_user, p_assigned_to, v_actor);
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Invalid task title';
  end if;
  if nullif(trim(p_description), '') is not null and char_length(trim(p_description)) > 2000 then
    raise exception using errcode = '22023', message = 'Task description is too long';
  end if;
  insert into public.crm_tasks (
    organization_id, user_id, customer_id, property_id, created_by, assigned_to,
    title, description, due_at
  ) values (
    v_org, v_user, p_customer_id, p_property_id, v_actor, v_assignee,
    trim(p_title), nullif(trim(p_description), ''), p_due_at
  ) returning * into v_task;
  insert into public.crm_task_history (
    task_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_task.id, v_org, v_user, v_actor, 'task_created',
    array['title', 'description', 'due_at', 'assigned_to']
  );
  return v_task;
end;
$$;

create or replace function public.update_crm_task(
  p_task_id uuid, p_expected_updated_at timestamptz, p_title text,
  p_description text default null, p_due_at timestamptz default null,
  p_assigned_to uuid default null
)
returns public.crm_tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid(); v_task public.crm_tasks%rowtype;
  v_changed text[] := '{}'::text[]; v_assignee uuid;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select * into v_task from public.crm_tasks t where t.id = p_task_id and t.archived_at is null and (
    (t.organization_id is null and t.user_id = v_actor)
    or (t.organization_id is not null and public.is_org_member(t.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Task not found'; end if;
  if p_expected_updated_at is null or v_task.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Task is stale';
  end if;
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Invalid task title';
  end if;
  if nullif(trim(p_description), '') is not null and char_length(trim(p_description)) > 2000 then
    raise exception using errcode = '22023', message = 'Task description is too long';
  end if;
  v_assignee := public.validate_crm_assignee(v_task.organization_id, v_task.user_id, p_assigned_to, v_actor);
  if v_task.title is distinct from trim(p_title) then v_changed := array_append(v_changed, 'title'); end if;
  if v_task.description is distinct from nullif(trim(p_description), '') then v_changed := array_append(v_changed, 'description'); end if;
  if v_task.due_at is distinct from p_due_at then v_changed := array_append(v_changed, 'due_at'); end if;
  if v_task.assigned_to is distinct from v_assignee then v_changed := array_append(v_changed, 'assigned_to'); end if;
  if cardinality(v_changed) = 0 then raise exception using errcode = '22023', message = 'Task has no changes'; end if;
  perform set_config('app.crm_task_mutation', 'on', true);
  update public.crm_tasks set title = trim(p_title), description = nullif(trim(p_description), ''),
    due_at = p_due_at, assigned_to = v_assignee, updated_at = clock_timestamp()
    where id = v_task.id returning * into v_task;
  perform set_config('app.crm_task_mutation', 'off', true);
  insert into public.crm_task_history (
    task_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_task.id, v_task.organization_id, v_task.user_id, v_actor,
    case
      when v_changed = array['assigned_to'] then 'task_assigned'
      when v_changed = array['due_at'] then 'task_due_changed'
      else 'task_updated'
    end, v_changed
  );
  return v_task;
end;
$$;

create or replace function public.set_crm_task_status(
  p_task_id uuid, p_expected_updated_at timestamptz, p_status text
)
returns public.crm_tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid(); v_task public.crm_tasks%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  if p_status not in ('open', 'completed') then raise exception using errcode = '22023', message = 'Invalid task status'; end if;
  select * into v_task from public.crm_tasks t where t.id = p_task_id and t.archived_at is null and (
    (t.organization_id is null and t.user_id = v_actor)
    or (t.organization_id is not null and public.is_org_member(t.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Task not found'; end if;
  if p_expected_updated_at is null or v_task.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Task is stale';
  end if;
  if v_task.status = p_status then raise exception using errcode = '22023', message = 'Task already has this status'; end if;
  perform set_config('app.crm_task_mutation', 'on', true);
  update public.crm_tasks set status = p_status,
    completed_at = case when p_status = 'completed' then clock_timestamp() else null end,
    completed_by = case when p_status = 'completed' then v_actor else null end,
    updated_at = clock_timestamp()
  where id = v_task.id returning * into v_task;
  perform set_config('app.crm_task_mutation', 'off', true);
  insert into public.crm_task_history (
    task_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_task.id, v_task.organization_id, v_task.user_id, v_actor,
    case when p_status = 'completed' then 'task_completed' else 'task_reopened' end,
    array['status']
  );
  return v_task;
end;
$$;

create or replace function public.archive_crm_task(
  p_task_id uuid, p_expected_updated_at timestamptz
)
returns public.crm_tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid(); v_task public.crm_tasks%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select * into v_task from public.crm_tasks t where t.id = p_task_id and t.archived_at is null and (
    (t.organization_id is null and t.user_id = v_actor)
    or (t.organization_id is not null and public.is_org_member(t.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Task not found'; end if;
  if p_expected_updated_at is null or v_task.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Task is stale';
  end if;
  perform set_config('app.crm_task_mutation', 'on', true);
  update public.crm_tasks set archived_at = clock_timestamp(), archived_by = v_actor,
    updated_at = clock_timestamp()
    where id = v_task.id returning * into v_task;
  perform set_config('app.crm_task_mutation', 'off', true);
  insert into public.crm_task_history (
    task_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_task.id, v_task.organization_id, v_task.user_id, v_actor,
    'task_archived', array['archive_status']
  );
  return v_task;
end;
$$;

revoke all on function public.create_crm_note(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.archive_crm_note(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.create_crm_task(uuid, uuid, text, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.update_crm_task(uuid, timestamptz, text, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.set_crm_task_status(uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.archive_crm_task(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_crm_note(uuid, uuid, text) to authenticated;
grant execute on function public.archive_crm_note(uuid, timestamptz) to authenticated;
grant execute on function public.create_crm_task(uuid, uuid, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.update_crm_task(uuid, timestamptz, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.set_crm_task_status(uuid, timestamptz, text) to authenticated;
grant execute on function public.archive_crm_task(uuid, timestamptz) to authenticated;
