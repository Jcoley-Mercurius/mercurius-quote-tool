-- Customer maintenance, reversible archive, advisory duplicate signals, and audit.
-- Run after 023_member_removal_assignment_cleanup.sql.

alter table public.customers
  add column company_name text,
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users (id) on delete set null,
  add column archive_reason text,
  add column normalized_email text,
  add column normalized_phone text;

alter table public.customers
  add constraint customers_company_name_length_check
    check (company_name is null or char_length(company_name) between 1 and 200),
  add constraint customers_archive_reason_length_check
    check (archive_reason is null or char_length(archive_reason) between 1 and 300),
  add constraint customers_archive_metadata_check
    check (
      archived_at is not null
      or (archived_by is null and archive_reason is null)
    );

create or replace function public.normalize_customer_comparison_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.display_name := trim(new.display_name);
  new.company_name := nullif(trim(new.company_name), '');
  new.email := nullif(trim(new.email), '');
  new.phone := nullif(trim(new.phone), '');
  new.notes := nullif(trim(new.notes), '');
  new.normalized_email := case
    when new.email is null then null
    else lower(new.email)
  end;
  new.normalized_phone := case
    when new.phone is null then null
    else nullif(regexp_replace(new.phone, '[^0-9]', '', 'g'), '')
  end;
  return new;
end;
$$;

revoke all on function public.normalize_customer_comparison_fields()
  from public, anon, authenticated;

create trigger customers_normalize_comparison_fields
  before insert or update of display_name, company_name, email, phone, notes
  on public.customers
  for each row execute function public.normalize_customer_comparison_fields();

-- Backfill without falsely changing the customer relationship version/date.
alter table public.customers disable trigger customers_set_updated_at;
update public.customers
set
  display_name = display_name,
  company_name = company_name,
  email = email,
  phone = phone,
  notes = notes;
alter table public.customers enable trigger customers_set_updated_at;

create index customers_org_normalized_email_idx
  on public.customers (organization_id, normalized_email)
  where organization_id is not null and normalized_email is not null;
create index customers_personal_normalized_email_idx
  on public.customers (user_id, normalized_email)
  where organization_id is null and normalized_email is not null;
create index customers_org_normalized_phone_idx
  on public.customers (organization_id, normalized_phone)
  where organization_id is not null and normalized_phone is not null;
create index customers_personal_normalized_phone_idx
  on public.customers (user_id, normalized_phone)
  where organization_id is null and normalized_phone is not null;
create index customers_org_archive_directory_idx
  on public.customers (organization_id, archived_at, updated_at desc, id desc)
  where organization_id is not null;
create index customers_personal_archive_directory_idx
  on public.customers (user_id, archived_at, updated_at desc, id desc)
  where organization_id is null;

create table public.customer_audit_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null
    check (action in ('customer_updated', 'customer_archived', 'customer_restored')),
  changed_fields text[] not null default '{}'::text[],
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint customer_audit_workspace_check check (
    (organization_id is not null and user_id is null)
    or (organization_id is null and user_id is not null)
  )
);

create index customer_audit_history_customer_time_idx
  on public.customer_audit_history (customer_id, occurred_at desc, id);

alter table public.customer_audit_history enable row level security;

create policy "Users read personal customer audit history"
  on public.customer_audit_history for select to authenticated
  using (
    organization_id is null
    and user_id = auth.uid()
    and exists (
      select 1 from public.customers c
      where c.id = customer_audit_history.customer_id
        and c.organization_id is null
        and c.user_id = auth.uid()
    )
  );

create policy "Org members read customer audit history"
  on public.customer_audit_history for select to authenticated
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.customers c
      where c.id = customer_audit_history.customer_id
        and c.organization_id = customer_audit_history.organization_id
    )
  );

revoke all on table public.customer_audit_history
  from public, anon, authenticated;
grant select on table public.customer_audit_history to authenticated;

create or replace function public.require_customer_mutation_function()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('app.customer_mutation', true) is distinct from 'on' then
    raise exception using
      errcode = '42501',
      message = 'customer changes must use a customer mutation function';
  end if;
  return new;
end;
$$;

revoke all on function public.require_customer_mutation_function()
  from public, anon, authenticated;

create trigger customers_require_mutation
  before update on public.customers
  for each row execute function public.require_customer_mutation_function();

create or replace function public.prevent_customer_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = '42501', message = 'customer audit history is append-only';
end;
$$;

revoke all on function public.prevent_customer_audit_mutation()
  from public, anon, authenticated;

create trigger customer_audit_history_append_only
  before update or delete on public.customer_audit_history
  for each row execute function public.prevent_customer_audit_mutation();

create or replace function public.update_customer(
  p_customer_id uuid,
  p_expected_updated_at timestamptz,
  p_display_name text,
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_preferred_contact_method text default null,
  p_summary text default null,
  p_tags text[] default '{}'::text[]
)
returns public.customers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_changed text[] := '{}'::text[];
  v_tags text[];
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
    and (
      (c.organization_id is null and c.user_id = v_actor)
      or (c.organization_id is not null and public.is_org_member(c.organization_id))
    )
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Customer not found';
  end if;
  if v_customer.archived_at is not null then
    raise exception using errcode = '22023', message = 'Archived customers must be restored before editing';
  end if;
  if p_expected_updated_at is null
     or v_customer.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Customer is stale';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Invalid display name';
  end if;
  if nullif(trim(p_company_name), '') is not null
     and char_length(trim(p_company_name)) > 200 then
    raise exception using errcode = '22023', message = 'Invalid company name';
  end if;
  if nullif(trim(p_email), '') is not null
     and (
       char_length(trim(p_email)) > 320
       or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     ) then
    raise exception using errcode = '22023', message = 'Invalid email';
  end if;
  if nullif(trim(p_phone), '') is not null
     and char_length(trim(p_phone)) not between 3 and 40 then
    raise exception using errcode = '22023', message = 'Invalid phone';
  end if;
  if p_preferred_contact_method is not null
     and p_preferred_contact_method not in ('email', 'phone', 'text', 'none') then
    raise exception using errcode = '22023', message = 'Invalid preferred contact method';
  end if;
  if nullif(trim(p_summary), '') is not null
     and char_length(trim(p_summary)) > 2000 then
    raise exception using errcode = '22023', message = 'Customer summary is too long';
  end if;

  select coalesce(array_agg(tag order by tag), '{}'::text[])
  into v_tags
  from (
    select distinct trim(value) as tag
    from unnest(coalesce(p_tags, '{}'::text[])) value
    where nullif(trim(value), '') is not null
  ) normalized;
  if cardinality(v_tags) > 20
     or exists (select 1 from unnest(v_tags) tag where char_length(tag) > 40) then
    raise exception using errcode = '22023', message = 'Invalid customer tags';
  end if;

  if v_customer.display_name is distinct from trim(p_display_name) then v_changed := array_append(v_changed, 'display_name'); end if;
  if v_customer.company_name is distinct from nullif(trim(p_company_name), '') then v_changed := array_append(v_changed, 'company_name'); end if;
  if v_customer.email is distinct from nullif(trim(p_email), '') then v_changed := array_append(v_changed, 'email'); end if;
  if v_customer.phone is distinct from nullif(trim(p_phone), '') then v_changed := array_append(v_changed, 'phone'); end if;
  if v_customer.preferred_contact_method is distinct from p_preferred_contact_method then v_changed := array_append(v_changed, 'preferred_contact_method'); end if;
  if v_customer.notes is distinct from nullif(trim(p_summary), '') then v_changed := array_append(v_changed, 'summary'); end if;
  if v_customer.tags is distinct from v_tags then v_changed := array_append(v_changed, 'tags'); end if;
  if cardinality(v_changed) = 0 then
    raise exception using errcode = '22023', message = 'Customer has no changes';
  end if;

  perform set_config('app.customer_mutation', 'on', true);
  update public.customers
  set display_name = p_display_name,
      company_name = p_company_name,
      email = p_email,
      phone = p_phone,
      preferred_contact_method = p_preferred_contact_method,
      notes = p_summary,
      tags = v_tags
  where id = v_customer.id
  returning * into v_customer;
  perform set_config('app.customer_mutation', 'off', true);

  insert into public.customer_audit_history (
    customer_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_customer.id,
    v_customer.organization_id,
    case when v_customer.organization_id is null then v_customer.user_id else null end,
    v_actor,
    'customer_updated',
    v_changed
  );
  return v_customer;
end;
$$;

create or replace function public.archive_customer(
  p_customer_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_customer public.customers%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select * into v_customer from public.customers c
  where c.id = p_customer_id and (
    (c.organization_id is null and c.user_id = v_actor)
    or (c.organization_id is not null and public.is_org_member(c.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Customer not found'; end if;
  if v_customer.updated_at is distinct from p_expected_updated_at then raise exception using errcode = '40001', message = 'Customer is stale'; end if;
  if v_customer.archived_at is not null then raise exception using errcode = '22023', message = 'Customer is already archived'; end if;
  if nullif(trim(p_reason), '') is not null and char_length(trim(p_reason)) > 300 then raise exception using errcode = '22023', message = 'Archive reason is too long'; end if;
  perform set_config('app.customer_mutation', 'on', true);
  update public.customers set archived_at = now(), archived_by = v_actor, archive_reason = p_reason
  where id = v_customer.id returning * into v_customer;
  perform set_config('app.customer_mutation', 'off', true);
  insert into public.customer_audit_history (
    customer_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_customer.id, v_customer.organization_id,
    case when v_customer.organization_id is null then v_customer.user_id else null end,
    v_actor, 'customer_archived', array['archive_status']
  );
  return v_customer;
end;
$$;

create or replace function public.restore_customer(
  p_customer_id uuid,
  p_expected_updated_at timestamptz
)
returns public.customers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_customer public.customers%rowtype;
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'Not authenticated'; end if;
  select * into v_customer from public.customers c
  where c.id = p_customer_id and (
    (c.organization_id is null and c.user_id = v_actor)
    or (c.organization_id is not null and public.is_org_member(c.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Customer not found'; end if;
  if v_customer.updated_at is distinct from p_expected_updated_at then raise exception using errcode = '40001', message = 'Customer is stale'; end if;
  if v_customer.archived_at is null then raise exception using errcode = '22023', message = 'Customer is not archived'; end if;
  perform set_config('app.customer_mutation', 'on', true);
  update public.customers set archived_at = null, archived_by = null, archive_reason = null
  where id = v_customer.id returning * into v_customer;
  perform set_config('app.customer_mutation', 'off', true);
  insert into public.customer_audit_history (
    customer_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_customer.id, v_customer.organization_id,
    case when v_customer.organization_id is null then v_customer.user_id else null end,
    v_actor, 'customer_restored', array['archive_status']
  );
  return v_customer;
end;
$$;

revoke all on function public.update_customer(uuid, timestamptz, text, text, text, text, text, text, text[])
  from public, anon, authenticated;
revoke all on function public.archive_customer(uuid, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.restore_customer(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.update_customer(uuid, timestamptz, text, text, text, text, text, text, text[])
  to authenticated;
grant execute on function public.archive_customer(uuid, timestamptz, text)
  to authenticated;
grant execute on function public.restore_customer(uuid, timestamptz)
  to authenticated;
