-- Mercurius Vendor OS: additive Marketplace persistence foundation
-- Expand-only: no legacy backfill and no destructive schema changes.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.prevent_marketplace_vendor_id_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.marketplace_vendor_id is not null
     and new.marketplace_vendor_id is distinct from old.marketplace_vendor_id then
    raise exception using
      errcode = '22023',
      message = 'marketplace_vendor_id is immutable once set';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_marketplace_vendor_id_change() from public, anon, authenticated;

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
  end if;

  return new;
end;
$$;

revoke all on function public.protect_marketplace_workspace_fields() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Organization mapping
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists marketplace_vendor_id uuid;

create unique index if not exists organizations_marketplace_vendor_id_uidx
  on public.organizations (marketplace_vendor_id)
  where marketplace_vendor_id is not null;

drop trigger if exists organizations_protect_marketplace_vendor_id
  on public.organizations;
create trigger organizations_protect_marketplace_vendor_id
  before update of marketplace_vendor_id on public.organizations
  for each row execute function public.prevent_marketplace_vendor_id_change();

-- Existing owner/admin UPDATE RLS remains, but browser roles may update only
-- the normal editable organization name. A future server-controlled mapping
-- function can set a null mapping; replacing a mapping requires an explicit
-- administrative correction migration/function.
revoke update on table public.organizations from anon, authenticated;
grant update (name) on table public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- Durable integration inbox/outbox
-- ---------------------------------------------------------------------------

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  direction text not null
    check (direction in ('inbound', 'outbound')),
  event_type text not null
    check (char_length(trim(event_type)) between 1 and 100),
  event_version integer not null
    check (event_version > 0),
  source_system text not null
    check (source_system in ('marketplace', 'vendor_os')),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  occurred_at timestamptz not null,
  received_at timestamptz,
  processed_at timestamptz,
  available_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  last_error text
    check (last_error is null or char_length(last_error) <= 4000),
  actor jsonb
    check (actor is null or jsonb_typeof(actor) = 'object'),
  entities jsonb not null default '[]'::jsonb
    check (jsonb_typeof(entities) = 'array'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, event_id)
);

create index integration_events_inbound_available_idx
  on public.integration_events (available_at, created_at)
  where direction = 'inbound' and processed_at is null;

create index integration_events_outbound_available_idx
  on public.integration_events (available_at, created_at)
  where direction = 'outbound' and published_at is null;

create index integration_events_organization_type_occurred_idx
  on public.integration_events (organization_id, event_type, occurred_at desc);

drop trigger if exists integration_events_set_updated_at
  on public.integration_events;
create trigger integration_events_set_updated_at
  before update on public.integration_events
  for each row execute function public.set_updated_at();

alter table public.integration_events enable row level security;
revoke all on table public.integration_events from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Operational customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  marketplace_homeowner_id uuid,
  display_name text not null
    check (char_length(trim(display_name)) between 1 and 200),
  email text,
  phone text,
  preferred_contact_method text
    check (
      preferred_contact_method is null
      or preferred_contact_method in ('email', 'phone', 'text', 'none')
    ),
  notes text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_org_marketplace_homeowner_uidx
  on public.customers (organization_id, marketplace_homeowner_id)
  where organization_id is not null and marketplace_homeowner_id is not null;

create unique index customers_personal_marketplace_homeowner_uidx
  on public.customers (user_id, marketplace_homeowner_id)
  where organization_id is null and marketplace_homeowner_id is not null;

create index customers_organization_updated_idx
  on public.customers (organization_id, updated_at desc)
  where organization_id is not null;

create index customers_personal_updated_idx
  on public.customers (user_id, updated_at desc)
  where organization_id is null;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists customers_protect_workspace_fields on public.customers;
create trigger customers_protect_workspace_fields
  before update on public.customers
  for each row execute function public.protect_marketplace_workspace_fields();

alter table public.customers enable row level security;

create policy "Users read personal customers"
  on public.customers for select to authenticated
  using (organization_id is null and user_id = auth.uid());

create policy "Users create personal customers"
  on public.customers for insert to authenticated
  with check (organization_id is null and user_id = auth.uid());

create policy "Users update personal customers"
  on public.customers for update to authenticated
  using (organization_id is null and user_id = auth.uid())
  with check (organization_id is null and user_id = auth.uid());

create policy "Org members read organization customers"
  on public.customers for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

create policy "Org members create organization customers"
  on public.customers for insert to authenticated
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create policy "Org members update organization customers"
  on public.customers for update to authenticated
  using (organization_id is not null and public.is_org_member(organization_id))
  with check (organization_id is not null and public.is_org_member(organization_id));

revoke all on table public.customers from public, anon, authenticated;
grant select, insert, update on table public.customers to authenticated;

-- ---------------------------------------------------------------------------
-- Operational properties
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  marketplace_property_id uuid,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US'
    check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric
    check (latitude is null or latitude between -90 and 90),
  longitude numeric
    check (longitude is null or longitude between -180 and 180),
  property_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(property_data) = 'object'),
  notes text,
  access_instructions text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index properties_org_marketplace_property_uidx
  on public.properties (organization_id, marketplace_property_id)
  where organization_id is not null and marketplace_property_id is not null;

create unique index properties_personal_marketplace_property_uidx
  on public.properties (user_id, marketplace_property_id)
  where organization_id is null and marketplace_property_id is not null;

create index properties_organization_updated_idx
  on public.properties (organization_id, updated_at desc)
  where organization_id is not null;

create index properties_personal_updated_idx
  on public.properties (user_id, updated_at desc)
  where organization_id is null;

create index properties_customer_updated_idx
  on public.properties (customer_id, updated_at desc)
  where customer_id is not null;

create or replace function public.validate_property_workspace()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.customers%rowtype;
begin
  if new.customer_id is null then
    return new;
  end if;

  select * into v_customer
  from public.customers
  where id = new.customer_id;

  if not found
     or v_customer.organization_id is distinct from new.organization_id
     or (
       new.organization_id is null
       and v_customer.user_id is distinct from new.user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'property and customer must share a workspace';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_property_workspace() from public, anon, authenticated;

drop trigger if exists properties_validate_workspace on public.properties;
create trigger properties_validate_workspace
  before insert or update of organization_id, user_id, customer_id
  on public.properties
  for each row execute function public.validate_property_workspace();

drop trigger if exists properties_protect_workspace_fields on public.properties;
create trigger properties_protect_workspace_fields
  before update on public.properties
  for each row execute function public.protect_marketplace_workspace_fields();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;

create policy "Users read personal properties"
  on public.properties for select to authenticated
  using (organization_id is null and user_id = auth.uid());

create policy "Users create personal properties"
  on public.properties for insert to authenticated
  with check (organization_id is null and user_id = auth.uid());

create policy "Users update personal properties"
  on public.properties for update to authenticated
  using (organization_id is null and user_id = auth.uid())
  with check (organization_id is null and user_id = auth.uid());

create policy "Org members read organization properties"
  on public.properties for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

create policy "Org members create organization properties"
  on public.properties for insert to authenticated
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create policy "Org members update organization properties"
  on public.properties for update to authenticated
  using (organization_id is not null and public.is_org_member(organization_id))
  with check (organization_id is not null and public.is_org_member(organization_id));

revoke all on table public.properties from public, anon, authenticated;
grant select, insert, update on table public.properties to authenticated;

-- ---------------------------------------------------------------------------
-- Opportunities and append-only status history
-- ---------------------------------------------------------------------------

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  marketplace_lead_id uuid,
  marketplace_request_id uuid,
  origin text not null
    check (origin in ('marketplace', 'direct', 'repair_request')),
  status text not null default 'new'
    check (status in ('new', 'opened', 'quoting', 'quoted', 'won', 'lost', 'declined', 'closed')),
  service_type text not null
    check (char_length(trim(service_type)) between 1 and 100),
  summary text not null default '',
  description text not null default '',
  assigned_user_id uuid references auth.users (id) on delete set null,
  source_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_snapshot) = 'object'),
  opened_at timestamptz,
  declined_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_marketplace_origin_check check (
    (
      origin = 'marketplace'
      and organization_id is not null
      and marketplace_lead_id is not null
      and marketplace_request_id is not null
    )
    or (
      origin <> 'marketplace'
      and marketplace_lead_id is null
      and marketplace_request_id is null
    )
  )
);

create unique index opportunities_marketplace_lead_uidx
  on public.opportunities (marketplace_lead_id)
  where marketplace_lead_id is not null;

create index opportunities_organization_status_updated_idx
  on public.opportunities (organization_id, status, updated_at desc)
  where organization_id is not null;

create index opportunities_personal_status_updated_idx
  on public.opportunities (user_id, status, updated_at desc)
  where organization_id is null;

create index opportunities_customer_idx
  on public.opportunities (customer_id)
  where customer_id is not null;

create index opportunities_property_idx
  on public.opportunities (property_id)
  where property_id is not null;

create index opportunities_assigned_user_idx
  on public.opportunities (assigned_user_id)
  where assigned_user_id is not null;

create index opportunities_marketplace_request_idx
  on public.opportunities (marketplace_request_id)
  where marketplace_request_id is not null;

create or replace function public.validate_opportunity_workspace()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.customers%rowtype;
  v_property public.properties%rowtype;
  v_actor_role public.organization_role;
begin
  if new.origin = 'marketplace' and new.organization_id is null then
    raise exception using
      errcode = '23514',
      message = 'Marketplace opportunities require an organization';
  end if;

  if new.customer_id is not null then
    select * into v_customer from public.customers where id = new.customer_id;
    if not found
       or v_customer.organization_id is distinct from new.organization_id
       or (
         new.organization_id is null
         and v_customer.user_id is distinct from new.user_id
       ) then
      raise exception using
        errcode = '23514',
        message = 'opportunity and customer must share a workspace';
    end if;
  end if;

  if new.property_id is not null then
    select * into v_property from public.properties where id = new.property_id;
    if not found
       or v_property.organization_id is distinct from new.organization_id
       or (
         new.organization_id is null
         and v_property.user_id is distinct from new.user_id
       ) then
      raise exception using
        errcode = '23514',
        message = 'opportunity and property must share a workspace';
    end if;
  end if;

  if new.assigned_user_id is not null then
    if new.organization_id is null then
      if new.assigned_user_id is distinct from new.user_id then
        raise exception using
          errcode = '23514',
          message = 'personal opportunity assignment must match its owner';
      end if;
    elsif not exists (
      select 1
      from public.organization_members
      where organization_id = new.organization_id
        and user_id = new.assigned_user_id
    ) then
      raise exception using
        errcode = '23514',
        message = 'assigned user must be an organization member';
    end if;
  end if;

  if auth.uid() is not null
     and new.organization_id is not null
     and (
       (tg_op = 'INSERT' and new.assigned_user_id is not null)
       or (
         tg_op = 'UPDATE'
         and new.assigned_user_id is distinct from old.assigned_user_id
       )
     ) then
    select role into v_actor_role
    from public.organization_members
    where organization_id = new.organization_id
      and user_id = auth.uid();

    if v_actor_role = 'member'
       and new.assigned_user_id is distinct from auth.uid() then
      raise exception using
        errcode = '42501',
        message = 'members may assign opportunities only to themselves';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_opportunity_workspace() from public, anon, authenticated;

create or replace function public.require_opportunity_transition_function()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and current_setting('app.opportunity_transition', true) is distinct from 'on' then
    raise exception using
      errcode = '42501',
      message = 'opportunity status must be changed through transition_opportunity';
  end if;
  return new;
end;
$$;

revoke all on function public.require_opportunity_transition_function() from public, anon, authenticated;

drop trigger if exists opportunities_validate_workspace on public.opportunities;
create trigger opportunities_validate_workspace
  before insert or update of organization_id, user_id, customer_id, property_id, assigned_user_id, origin
  on public.opportunities
  for each row execute function public.validate_opportunity_workspace();

drop trigger if exists opportunities_protect_workspace_fields on public.opportunities;
create trigger opportunities_protect_workspace_fields
  before update on public.opportunities
  for each row execute function public.protect_marketplace_workspace_fields();

drop trigger if exists opportunities_require_transition on public.opportunities;
create trigger opportunities_require_transition
  before update of status on public.opportunities
  for each row execute function public.require_opportunity_transition_function();

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

alter table public.opportunities enable row level security;

create policy "Users read personal opportunities"
  on public.opportunities for select to authenticated
  using (organization_id is null and user_id = auth.uid());

create policy "Users create personal direct opportunities"
  on public.opportunities for insert to authenticated
  with check (
    organization_id is null
    and user_id = auth.uid()
    and origin = 'direct'
    and status = 'new'
  );

create policy "Users update personal opportunities"
  on public.opportunities for update to authenticated
  using (organization_id is null and user_id = auth.uid())
  with check (organization_id is null and user_id = auth.uid());

create policy "Org members read organization opportunities"
  on public.opportunities for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

create policy "Org members create direct organization opportunities"
  on public.opportunities for insert to authenticated
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and user_id = auth.uid()
    and origin = 'direct'
    and status = 'new'
  );

create policy "Org members update organization opportunities"
  on public.opportunities for update to authenticated
  using (organization_id is not null and public.is_org_member(organization_id))
  with check (organization_id is not null and public.is_org_member(organization_id));

revoke all on table public.opportunities from public, anon, authenticated;
grant select, insert, update on table public.opportunities to authenticated;

create table public.opportunity_status_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null
    references public.opportunities (id) on delete cascade,
  from_status text
    check (
      from_status is null
      or from_status in ('new', 'opened', 'quoting', 'quoted', 'won', 'lost', 'declined', 'closed')
    ),
  to_status text not null
    check (to_status in ('new', 'opened', 'quoting', 'quoted', 'won', 'lost', 'declined', 'closed')),
  actor_user_id uuid references auth.users (id) on delete set null,
  source_system text not null
    check (source_system in ('marketplace', 'vendor_os', 'migration')),
  integration_event_id uuid
    references public.integration_events (id) on delete set null,
  reason_code text,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index opportunity_status_history_opportunity_time_idx
  on public.opportunity_status_history (opportunity_id, occurred_at, id);

create unique index opportunity_status_history_integration_event_uidx
  on public.opportunity_status_history (integration_event_id)
  where integration_event_id is not null;

alter table public.opportunity_status_history enable row level security;

create policy "Users read personal opportunity history"
  on public.opportunity_status_history for select to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_status_history.opportunity_id
        and o.organization_id is null
        and o.user_id = auth.uid()
    )
  );

create policy "Org members read organization opportunity history"
  on public.opportunity_status_history for select to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_status_history.opportunity_id
        and o.organization_id is not null
        and public.is_org_member(o.organization_id)
    )
  );

revoke all on table public.opportunity_status_history from public, anon, authenticated;
grant select on table public.opportunity_status_history to authenticated;

-- ---------------------------------------------------------------------------
-- Safe opportunity state machine
-- ---------------------------------------------------------------------------

create or replace function public.transition_opportunity(
  p_opportunity_id uuid,
  p_to_status text,
  p_reason_code text default null,
  p_details jsonb default '{}'::jsonb
)
returns public.opportunities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_opportunity public.opportunities%rowtype;
  v_is_owner_admin boolean := false;
  v_from_status text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if p_to_status not in ('opened', 'quoting', 'quoted', 'won', 'lost', 'declined', 'closed') then
    raise exception using errcode = '22023', message = 'Invalid opportunity status';
  end if;

  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception using errcode = '22023', message = 'details must be a JSON object';
  end if;

  if p_reason_code is not null and char_length(p_reason_code) > 100 then
    raise exception using errcode = '22023', message = 'reason_code is too long';
  end if;

  select * into v_opportunity
  from public.opportunities
  where id = p_opportunity_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Opportunity not found';
  end if;

  if v_opportunity.organization_id is null then
    if v_opportunity.user_id is distinct from auth.uid() then
      raise exception using errcode = '42501', message = 'Not authorized';
    end if;
  else
    if not public.is_org_member(v_opportunity.organization_id) then
      raise exception using errcode = '42501', message = 'Not authorized';
    end if;
    v_is_owner_admin := public.is_org_owner_or_admin(v_opportunity.organization_id);
  end if;

  if v_opportunity.status = p_to_status then
    raise exception using errcode = '22023', message = 'Opportunity is already in that status';
  end if;

  v_from_status := v_opportunity.status;

  if p_to_status = 'closed' then
    if v_opportunity.organization_id is not null and not v_is_owner_admin then
      raise exception using errcode = '42501', message = 'Only owners and admins may close opportunities';
    end if;
    if v_opportunity.status not in ('new', 'opened', 'quoting', 'quoted') then
      raise exception using errcode = '22023', message = 'Invalid opportunity transition';
    end if;
  elsif not (
    (v_opportunity.status = 'new' and p_to_status in ('opened', 'declined'))
    or (v_opportunity.status = 'opened' and p_to_status in ('quoting', 'declined'))
    or (v_opportunity.status = 'quoting' and p_to_status in ('quoted', 'declined'))
    or (v_opportunity.status = 'quoted' and p_to_status in ('won', 'lost'))
  ) then
    raise exception using errcode = '22023', message = 'Invalid opportunity transition';
  end if;

  perform set_config('app.opportunity_transition', 'on', true);

  update public.opportunities
  set
    status = p_to_status,
    opened_at = case
      when p_to_status = 'opened' then coalesce(opened_at, now())
      else opened_at
    end,
    declined_at = case
      when p_to_status = 'declined' then coalesce(declined_at, now())
      else declined_at
    end,
    closed_at = case
      when p_to_status = 'closed' then coalesce(closed_at, now())
      else closed_at
    end
  where id = p_opportunity_id
  returning * into v_opportunity;

  insert into public.opportunity_status_history (
    opportunity_id,
    from_status,
    to_status,
    actor_user_id,
    source_system,
    reason_code,
    details,
    occurred_at
  )
  values (
    p_opportunity_id,
    v_from_status,
    p_to_status,
    auth.uid(),
    'vendor_os',
    nullif(trim(p_reason_code), ''),
    p_details,
    now()
  );

  return v_opportunity;
end;
$$;

revoke all on function public.transition_opportunity(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.transition_opportunity(uuid, text, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Optional quote-to-opportunity association
-- ---------------------------------------------------------------------------

alter table public.quotes
  add column if not exists opportunity_id uuid
  references public.opportunities (id) on delete set null;

create index if not exists quotes_opportunity_created_idx
  on public.quotes (opportunity_id, created_at desc)
  where opportunity_id is not null;

create or replace function public.validate_quote_opportunity_workspace()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_opportunity public.opportunities%rowtype;
begin
  if new.opportunity_id is null then
    return new;
  end if;

  select * into v_opportunity
  from public.opportunities
  where id = new.opportunity_id;

  if not found
     or v_opportunity.organization_id is distinct from new.organization_id
     or (
       new.organization_id is null
       and v_opportunity.user_id is distinct from new.user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'quote and opportunity must share a workspace';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_quote_opportunity_workspace()
  from public, anon, authenticated;

drop trigger if exists quotes_validate_opportunity_workspace on public.quotes;
create trigger quotes_validate_opportunity_workspace
  before insert or update of organization_id, user_id, opportunity_id
  on public.quotes
  for each row execute function public.validate_quote_opportunity_workspace();
