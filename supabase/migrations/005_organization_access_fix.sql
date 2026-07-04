-- Fix organization membership reads and add a reliable fetch RPC.
-- Run after 003_organizations.sql (and 004 if using invites).

-- ---------------------------------------------------------------------------
-- organization_members: allow users to read their own rows directly (avoids
-- RLS edge cases when is_org_member() subqueries organization_members).
-- ---------------------------------------------------------------------------
drop policy if exists "Members can view organization membership" on public.organization_members;
drop policy if exists "Users can view organization membership" on public.organization_members;

create policy "Users can view organization membership"
  on public.organization_members
  for select
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- get_user_organizations: security-definer fetch for the signed-in user
-- ---------------------------------------------------------------------------
create or replace function public.get_user_organizations()
returns table (
  organization_id uuid,
  organization_name text,
  role public.organization_role
)
language sql
security definer
stable
set search_path = public
as $$
  select om.organization_id, o.name, om.role
  from public.organization_members om
  inner join public.organizations o on o.id = om.organization_id
  where om.user_id = auth.uid()
  order by om.created_at asc;
$$;

grant execute on function public.get_user_organizations() to authenticated;