-- Secure opportunity assignment foundation and append-only assignment history.
-- Run after 021_marketplace_lead_assignment_ingestion.sql.

create table public.opportunity_assignment_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null
    references public.opportunities (id) on delete cascade,
  previous_assigned_user_id uuid references auth.users (id) on delete set null,
  new_assigned_user_id uuid references auth.users (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  source_system text not null
    check (source_system in ('marketplace', 'vendor_os', 'migration')),
  reason_code text
    check (reason_code is null or char_length(reason_code) between 1 and 100),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index opportunity_assignment_history_opportunity_time_idx
  on public.opportunity_assignment_history
  (opportunity_id, occurred_at desc, id);

alter table public.opportunity_assignment_history enable row level security;

create policy "Users read personal opportunity assignment history"
  on public.opportunity_assignment_history for select to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_assignment_history.opportunity_id
        and o.organization_id is null
        and o.user_id = auth.uid()
    )
  );

create policy "Org members read organization opportunity assignment history"
  on public.opportunity_assignment_history for select to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_assignment_history.opportunity_id
        and o.organization_id is not null
        and public.is_org_member(o.organization_id)
    )
  );

revoke all on table public.opportunity_assignment_history
  from public, anon, authenticated;
grant select on table public.opportunity_assignment_history to authenticated;

create or replace function public.require_opportunity_assignment_function()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.assigned_user_id is distinct from old.assigned_user_id
     and current_setting('app.opportunity_assignment', true) is distinct from 'on' then
    raise exception using
      errcode = '42501',
      message = 'opportunity assignment must be changed through assign_opportunity';
  end if;
  return new;
end;
$$;

revoke all on function public.require_opportunity_assignment_function()
  from public, anon, authenticated;

drop trigger if exists opportunities_require_assignment on public.opportunities;
create trigger opportunities_require_assignment
  before update of assigned_user_id on public.opportunities
  for each row execute function public.require_opportunity_assignment_function();

create or replace function public.assign_opportunity(
  p_opportunity_id uuid,
  p_assigned_user_id uuid,
  p_expected_updated_at timestamptz default null,
  p_reason_code text default null
)
returns table (
  opportunity_id uuid,
  assigned_user_id uuid,
  updated_at timestamptz,
  history_id uuid,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_opportunity public.opportunities%rowtype;
  v_actor_role public.organization_role;
  v_previous_assigned_user_id uuid;
  v_history_id uuid;
  v_occurred_at timestamptz;
  v_reason_code text;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  v_reason_code := nullif(trim(p_reason_code), '');
  if v_reason_code is not null and char_length(v_reason_code) > 100 then
    raise exception using errcode = '22023', message = 'reason_code is too long';
  end if;

  select o.*
  into v_opportunity
  from public.opportunities o
  where o.id = p_opportunity_id
    and (
      (
        o.organization_id is null
        and o.user_id = v_actor_id
      )
      or (
        o.organization_id is not null
        and public.is_org_member(o.organization_id)
      )
    )
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Opportunity not found';
  end if;

  if p_expected_updated_at is not null
     and v_opportunity.updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'Opportunity assignment is stale';
  end if;

  if v_opportunity.assigned_user_id is not distinct from p_assigned_user_id then
    raise exception using
      errcode = '22023',
      message = 'Opportunity already has that assignment';
  end if;

  if v_opportunity.organization_id is null then
    if p_assigned_user_id is not null
       and p_assigned_user_id is distinct from v_opportunity.user_id then
      raise exception using
        errcode = '42501',
        message = 'Personal opportunity assignment must match its owner';
    end if;
  else
    select om.role
    into v_actor_role
    from public.organization_members om
    where om.organization_id = v_opportunity.organization_id
      and om.user_id = v_actor_id;

    if v_actor_role is null then
      raise exception using errcode = 'P0002', message = 'Opportunity not found';
    end if;

    if p_assigned_user_id is not null
       and not exists (
         select 1
         from public.organization_members target
         where target.organization_id = v_opportunity.organization_id
           and target.user_id = p_assigned_user_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'Assigned user must be a current organization member';
    end if;

    if v_actor_role = 'member'
       and p_assigned_user_id is distinct from v_actor_id then
      raise exception using
        errcode = '42501',
        message = 'Members may assign opportunities only to themselves';
    end if;
  end if;

  perform set_config('app.opportunity_assignment', 'on', true);
  v_previous_assigned_user_id := v_opportunity.assigned_user_id;

  update public.opportunities
  set assigned_user_id = p_assigned_user_id
  where id = v_opportunity.id
  returning * into v_opportunity;
  perform set_config('app.opportunity_assignment', 'off', true);

  insert into public.opportunity_assignment_history (
    opportunity_id,
    previous_assigned_user_id,
    new_assigned_user_id,
    actor_user_id,
    source_system,
    reason_code,
    occurred_at
  )
  values (
    v_opportunity.id,
    v_previous_assigned_user_id,
    p_assigned_user_id,
    v_actor_id,
    'vendor_os',
    v_reason_code,
    now()
  )
  returning id, opportunity_assignment_history.occurred_at
  into v_history_id, v_occurred_at;

  return query
  select
    v_opportunity.id,
    v_opportunity.assigned_user_id,
    v_opportunity.updated_at,
    v_history_id,
    v_occurred_at;
end;
$$;

revoke all on function public.assign_opportunity(uuid, uuid, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.assign_opportunity(uuid, uuid, timestamptz, text)
  to authenticated;
