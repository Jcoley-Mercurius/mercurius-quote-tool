-- Property maintenance and append-only property history.
-- Run after 024_customer_management_data_integrity.sql.

create table public.property_audit_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('property_updated', 'associated_customer_changed')),
  changed_fields text[] not null default '{}'::text[],
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint property_audit_workspace_check check (
    (organization_id is not null and user_id is null)
    or (organization_id is null and user_id is not null)
  )
);

create index property_audit_history_property_time_idx
  on public.property_audit_history (property_id, occurred_at desc, id);

alter table public.property_audit_history enable row level security;

create policy "Users read personal property audit history"
  on public.property_audit_history for select to authenticated
  using (
    organization_id is null and user_id = auth.uid()
    and exists (
      select 1 from public.properties p
      where p.id = property_audit_history.property_id
        and p.organization_id is null and p.user_id = auth.uid()
    )
  );

create policy "Org members read property audit history"
  on public.property_audit_history for select to authenticated
  using (
    organization_id is not null and public.is_org_member(organization_id)
    and exists (
      select 1 from public.properties p
      where p.id = property_audit_history.property_id
        and p.organization_id = property_audit_history.organization_id
    )
  );

revoke all on table public.property_audit_history from public, anon, authenticated;
grant select on table public.property_audit_history to authenticated;

create or replace function public.prevent_property_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = '42501', message = 'property audit history is append-only';
end;
$$;
revoke all on function public.prevent_property_audit_mutation() from public, anon, authenticated;
create trigger property_audit_history_append_only
  before update or delete on public.property_audit_history
  for each row execute function public.prevent_property_audit_mutation();

create or replace function public.require_property_mutation_function()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Permit trusted FK maintenance such as customer ON DELETE SET NULL.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if current_setting('app.property_mutation', true) is distinct from 'on' then
    raise exception using errcode = '42501',
      message = 'property changes must use a property mutation function';
  end if;
  return new;
end;
$$;
revoke all on function public.require_property_mutation_function() from public, anon, authenticated;
create trigger properties_require_mutation
  before update on public.properties
  for each row execute function public.require_property_mutation_function();

create or replace function public.update_property(
  p_property_id uuid,
  p_expected_updated_at timestamptz,
  p_address_line1 text default null,
  p_address_line2 text default null,
  p_city text default null,
  p_region text default null,
  p_postal_code text default null,
  p_country_code text default 'US',
  p_summary text default null,
  p_access_instructions text default null,
  p_tags text[] default '{}'::text[],
  p_attributes jsonb default '{}'::jsonb
)
returns public.properties
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_property public.properties%rowtype;
  v_changed text[] := '{}'::text[];
  v_tags text[];
  v_attributes jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;
  select * into v_property from public.properties p
  where p.id = p_property_id and (
    (p.organization_id is null and p.user_id = v_actor)
    or (p.organization_id is not null and public.is_org_member(p.organization_id))
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Property not found'; end if;
  if p_expected_updated_at is null or v_property.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'Property is stale';
  end if;
  if nullif(trim(p_address_line1), '') is not null and char_length(trim(p_address_line1)) > 300
     or nullif(trim(p_address_line2), '') is not null and char_length(trim(p_address_line2)) > 300
     or nullif(trim(p_city), '') is not null and char_length(trim(p_city)) > 120
     or nullif(trim(p_region), '') is not null and char_length(trim(p_region)) > 120
     or nullif(trim(p_postal_code), '') is not null and char_length(trim(p_postal_code)) > 24 then
    raise exception using errcode = '22023', message = 'Invalid property address';
  end if;
  if upper(trim(coalesce(p_country_code, ''))) !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'Invalid country code';
  end if;
  if nullif(trim(p_summary), '') is not null and char_length(trim(p_summary)) > 2000 then
    raise exception using errcode = '22023', message = 'Property summary is too long';
  end if;
  if nullif(trim(p_access_instructions), '') is not null
     and char_length(trim(p_access_instructions)) > 2000 then
    raise exception using errcode = '22023', message = 'Access instructions are too long';
  end if;
  if jsonb_typeof(coalesce(p_attributes, '{}'::jsonb)) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(coalesce(p_attributes, '{}'::jsonb)) key
       where key not in ('propertyType', 'yearBuilt', 'stories', 'squareFootage',
                         'roofType', 'exteriorType', 'usage')
     ) then
    raise exception using errcode = '22023', message = 'Invalid property attributes';
  end if;
  if (p_attributes ? 'yearBuilt' and (
       jsonb_typeof(p_attributes->'yearBuilt') <> 'number'
       or (p_attributes->>'yearBuilt')::integer not between 1600 and 2200))
     or (p_attributes ? 'squareFootage' and (
       jsonb_typeof(p_attributes->'squareFootage') <> 'number'
       or (p_attributes->>'squareFootage')::integer not between 1 and 1000000)) then
    raise exception using errcode = '22023', message = 'Invalid property attributes';
  end if;
  select coalesce(array_agg(tag order by tag), '{}'::text[]) into v_tags
  from (
    select distinct trim(value) tag from unnest(coalesce(p_tags, '{}'::text[])) value
    where nullif(trim(value), '') is not null
  ) normalized;
  if cardinality(v_tags) > 20
     or exists (select 1 from unnest(v_tags) tag where char_length(tag) > 40) then
    raise exception using errcode = '22023', message = 'Invalid property tags';
  end if;
  v_attributes := (v_property.property_data - array[
    'propertyType', 'yearBuilt', 'stories', 'squareFootage',
    'roofType', 'exteriorType', 'usage'
  ]) || coalesce(p_attributes, '{}'::jsonb);

  if v_property.address_line1 is distinct from nullif(trim(p_address_line1), '') then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.address_line2 is distinct from nullif(trim(p_address_line2), '') and not 'address' = any(v_changed) then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.city is distinct from nullif(trim(p_city), '') and not 'address' = any(v_changed) then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.region is distinct from nullif(trim(p_region), '') and not 'address' = any(v_changed) then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.postal_code is distinct from nullif(trim(p_postal_code), '') and not 'address' = any(v_changed) then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.country_code is distinct from upper(trim(p_country_code)) and not 'address' = any(v_changed) then v_changed := array_append(v_changed, 'address'); end if;
  if v_property.notes is distinct from nullif(trim(p_summary), '') then v_changed := array_append(v_changed, 'summary'); end if;
  if v_property.access_instructions is distinct from nullif(trim(p_access_instructions), '') then v_changed := array_append(v_changed, 'access_instructions'); end if;
  if v_property.tags is distinct from v_tags then v_changed := array_append(v_changed, 'tags'); end if;
  if v_property.property_data is distinct from v_attributes then v_changed := array_append(v_changed, 'attributes'); end if;
  if cardinality(v_changed) = 0 then raise exception using errcode = '22023', message = 'Property has no changes'; end if;

  perform set_config('app.property_mutation', 'on', true);
  update public.properties set
    address_line1 = nullif(trim(p_address_line1), ''),
    address_line2 = nullif(trim(p_address_line2), ''),
    city = nullif(trim(p_city), ''),
    region = nullif(trim(p_region), ''),
    postal_code = nullif(trim(p_postal_code), ''),
    country_code = upper(trim(p_country_code)),
    notes = nullif(trim(p_summary), ''),
    access_instructions = nullif(trim(p_access_instructions), ''),
    tags = v_tags,
    property_data = v_attributes
  where id = v_property.id returning * into v_property;
  perform set_config('app.property_mutation', 'off', true);
  insert into public.property_audit_history (
    property_id, organization_id, user_id, actor_user_id, action, changed_fields
  ) values (
    v_property.id, v_property.organization_id,
    case when v_property.organization_id is null then v_property.user_id else null end,
    v_actor, 'property_updated', v_changed
  );
  return v_property;
end;
$$;

revoke all on function public.update_property(
  uuid, timestamptz, text, text, text, text, text, text, text, text, text[], jsonb
) from public, anon, authenticated;
grant execute on function public.update_property(
  uuid, timestamptz, text, text, text, text, text, text, text, text, text[], jsonb
) to authenticated;
