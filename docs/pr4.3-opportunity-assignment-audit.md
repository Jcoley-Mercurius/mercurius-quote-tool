# PR4.3 Opportunity Assignment and Collaboration Repository Audit

## 1. Executive summary

The existing opportunity model is a strong starting point but is not sufficient
for a reliable assignment workflow by itself. `public.opportunities` already
stores an optional assignee in `assigned_user_id`, and
`validate_opportunity_workspace()` rejects cross-organization assignees,
personal assignments to anyone except the personal owner, and organization
members assigning to anyone except themselves. Owners and admins are not
subject to that last restriction.

Two gaps require a migration before assignment controls should ship:

1. authenticated organization members currently have broad `UPDATE` access to
   visible opportunity rows; a UI that sends only `assigned_user_id` would not
   make that mutation narrow against a malicious client; and
2. there is no assignment history. `opportunity_status_history` is deliberately
   status-shaped and cannot represent previous/new assignees without abusing
   status fields or opaque JSON.

PR4.3 should add a dedicated, security-definer assignment RPC which locks the
opportunity, derives its workspace from the row, validates the actor and target,
performs only the assignment change, writes a dedicated append-only assignment
history row, and returns the authoritative result. A trigger or privilege
boundary should require assignment changes to pass through that RPC, in the
same spirit as `transition_opportunity()`. The browser should use the normal
authenticated Supabase client; no service role is needed.

The recommended first UI is a pessimistic native select on Opportunity Detail.
Owners/admins may choose any current organization member or Unassigned. Members
may claim the opportunity for themselves but may not assign others or clear it.
Personal opportunities should display `You` as implicit ownership and should
not expose assignment controls.

These are recommendations, not approved product decisions.

## 2. Repository areas inspected

- PR4.2 audit, implementation documentation, routes, list/detail components,
  quote integration, E2E coverage, and opportunity tests
- `lib/opportunities/`, `lib/dashboard/`, and the Business Command Center
- workspace selection in `components/organizations/`,
  `lib/organizations/`, `components/layout/`, and `components/workspace/`
- organization member, invite, ownership, and audit-log repositories and tests
- manually maintained database row types in `lib/supabase/types.ts`
- Supabase browser, server, anonymous, and admin client boundaries
- migrations `003` through `009`, `020`, and `021`, including RLS, grants,
  triggers, RPCs, and indexes
- quote persistence and quote/opportunity workspace validation
- integration event contracts, organization audit activity, toasts, email route
  handlers, and quote-specific realtime support

There is no `lib/workspace/` or `lib/members/` directory. Workspace state is in
`lib/organizations/store.ts`, and membership access is in
`lib/organizations/members.ts`. The repository does not contain generated
Supabase `Database` types; `lib/supabase/types.ts` is the local row contract.

## 3. Current assignment schema

The assignment column is:

| Item | Current definition |
| --- | --- |
| Table | `public.opportunities` |
| Column | `assigned_user_id` |
| SQL type | nullable `uuid` |
| Foreign key | `auth.users(id) ON DELETE SET NULL` |
| TypeScript | `OpportunityRow.assigned_user_id: string \| null` |
| Index | partial `opportunities_assigned_user_idx` on non-null values |
| Assignment timestamp | none |

It references an authenticated user, not a profile or organization-membership
row. The row's `updated_at` changes on any opportunity update and therefore is
not an assignment timestamp.

`validate_opportunity_workspace()` runs before relevant inserts and updates:

- a personal opportunity may be unassigned or assigned only to its `user_id`;
- an organization opportunity may be assigned only to a user with a current
  row in `organization_members`;
- an authenticated organization `member` may change assignment only when the
  new assignee is `auth.uid()`; therefore a member can self-assign, including
  claiming an opportunity assigned to someone else, but cannot clear it;
- owners and admins may currently assign, reassign, or clear;
- customer, property, immutable workspace, origin, and Marketplace rules are
  independently protected by the same validation/protection trigger set.

Migration `021` makes `opportunities.user_id` nullable for system-owned
organization Marketplace rows while retaining the constraint that personal
rows have an owner. `assigned_user_id` remains nullable for both workspace
types.

No assignment source, actor, reason, changed-at field, or assignment event
exists elsewhere. `source_snapshot.assignedAt` is Marketplace ingestion context,
not Vendor Workspace assignment history.

## 4. Membership schema

`public.organization_members` contains:

- `id uuid` primary key;
- `organization_id uuid` with cascading organization deletion;
- `user_id uuid` with cascading auth-user deletion;
- `role organization_role`, one of `owner`, `admin`, or `member`;
- `created_at timestamptz`; and
- a unique constraint on `(organization_id, user_id)`.

A user can belong to multiple organizations, but only once per organization.
There is no membership status, disabled flag, soft deletion, or removal
timestamp. A row's existence means current membership. Removing a member
deletes that row.

Pending membership is represented separately by
`public.organization_invites`. Invites have a role, expiry, and optional
`accepted_at`, but are not members and cannot be assigned. Once accepted, the
RPC inserts an `organization_members` row. Removed users and pending invites are
not returned by `get_organization_members()` and cannot be newly assigned
because the opportunity trigger requires a membership row.

Removing a member does not currently clear opportunities already assigned to
that user. The assignee foreign key targets `auth.users`, so the opportunity can
retain a now-former member until another assignment change occurs. PR4.2 then
shows the safe fallback `Assigned team member`.

The active workspace is restored only from `get_user_organizations()` results.
`parseStoredWorkspace()` rejects stored organization keys that are not among
the user's memberships. Workspace identity is context state, not a URL
parameter.

`fetchOrganizationMembers()` calls the authenticated
`get_organization_members(p_organization_id)` RPC. That RPC:

- verifies the caller is a member;
- joins `auth.users` inside a security-definer boundary;
- returns member ID, user ID, email, display name, role, and joined time;
- uses `full_name`, then `name`, then application-side email fallback; and
- sorts owner first, admin second, member third, then by join time.

It has no paging or search. One bounded team fetch per opportunity page/detail
load is already used, with no per-opportunity member queries.

There is no general public `profiles` table. `vendor_profiles` stores
workspace branding and pricing, not individual member identity, and its RLS
scopes personal rows to their owner and organization rows to current
organization members. It should not be joined for assignment labels. The
existing member RPC is the intentional boundary for safely exposing selected
`auth.users` name/email fields to fellow organization members.

## 5. Roles and permissions

### Existing database enforcement

| Action | Personal owner | Org owner/admin | Org member |
| --- | --- | --- | --- |
| View visible opportunities/assignee | yes | yes | yes |
| View status history | yes | yes | yes |
| Assign self | owner only | yes | yes |
| Assign another current member | no | yes | no |
| Clear assignment | yes, technically | yes | no |
| Reassign another member to self | n/a | yes | yes |
| Reassign between other members | no | yes | no |

Personal “clear” is technically permitted because null passes validation. There
is no assignment history to view today.

RLS controls row visibility by personal ownership or current organization
membership. The assignment trigger supplies the role-specific target check.
The application has permission helpers for organization member management, but
no opportunity-assignment permission helper or assignment mutation.

### Recommended PR4.3 product rules

- Owners and admins may assign any current member, reassign, and clear.
- Every current member may assign an opportunity to themselves.
- Members should not clear or assign another person.
- All members who can view an opportunity may view its assignee and assignment
  history.
- Personal assignment should be implicit ownership: display `You`, hide
  controls, and avoid creating meaningless assignment changes.

These rules align with the existing trigger but remain subject to product
approval. In particular, product must approve whether a member may take an
opportunity away from another member by self-assigning.

## 6. Existing mutation conventions

The repository uses several patterns:

- browser-side repository functions plus authenticated Supabase RPCs for
  organizations, invites, membership roles, removal, ownership transfer, and
  organization audit reads;
- direct authenticated Supabase persistence for quote storage, with database
  RLS and workspace-validation triggers;
- route handlers for server-only email/public-token operations;
- a security-definer RPC plus row lock, transition validation, append-only
  history insert, and trigger guard for opportunity status changes; and
- a server-only RPC for signed Marketplace ingestion.

Assignment most closely resembles opportunity status transition and member
management, not quote persistence. The safest consistent pattern is:

1. a browser repository accepting opportunity ID, target assignee, optional
   expected version, and optional allowlisted reason;
2. one authenticated security-definer RPC;
3. database row locking, authorization, target membership validation, narrow
   update, and history insertion in one transaction; and
4. an authoritative typed response.

A new route handler or server action would add a second authorization boundary
without removing the need for database enforcement. Direct browser
`.update({ assigned_user_id })` is not recommended.

## 7. RLS and security findings

### Existing defenses

- Personal SELECT/UPDATE requires `organization_id IS NULL` and
  `user_id = auth.uid()`.
- Organization SELECT/UPDATE requires current membership.
- `protect_marketplace_workspace_fields()` protects immutable workspace/origin
  fields.
- `validate_opportunity_workspace()` rejects cross-workspace customer,
  property, and assignee relationships and prevents personal assignment to
  another user.
- Assignment target validation checks current membership, so pending and
  removed members cannot be newly assigned.
- Status changes must use `transition_opportunity()`.
- `opportunity_status_history` is SELECT-only to authenticated clients and its
  RLS follows visibility of the parent opportunity.
- `organization_members` reads require self/current-organization membership;
  member identity is more narrowly projected by the member RPC.
- Quote RLS and `validate_quote_opportunity_workspace()` keep quote linkage in
  the same workspace and do not depend on assignment.
- Detail/list repositories additionally apply the trusted active workspace.
- RLS hides missing and cross-workspace detail records identically.

### Gaps and attack analysis

- Any current organization member has table-level `UPDATE` plus an RLS policy
  allowing updates to visible organization opportunities. The assignment
  trigger constrains assignment, workspace, origin, customer, property, and
  status behavior, but it does not turn an arbitrary client payload into a
  column-narrow assignment mutation. Other mutable fields such as summary or
  description could be bundled into a request.
- A malicious member cannot assign outside the organization or clear an
  assignment because the trigger rejects it.
- An owner/admin can legally assign any current member under the existing
  trigger.
- A personal owner cannot assign another user.
- Changing `organization_id` is protected by trigger validation and immutable
  workspace protection.
- Removed-member assignments can remain stale because membership deletion does
  not update opportunities.
- RLS is membership-based and has no separate inactive state because the schema
  has no membership status.

### Required preservation

The assignment API must never accept workspace or organization identity. It
must select the opportunity by ID, derive workspace from the locked row, return
the same safe not-found/not-authorized surface for hidden rows, use
`auth.uid()`, and never use a browser service role. The client payload must not
contain arbitrary opportunity fields.

The migration should add a trigger guard similar to
`require_opportunity_transition_function()` so `assigned_user_id` can change
only inside the assignment RPC. Existing broad opportunity UPDATE privileges
should also be reviewed and reduced to the minimum still needed by current
features. RLS remains defense in depth and must not be replaced by application
checks.

## 8. Assignment-history findings

There is no assignment history table.

`opportunity_status_history` is append-only to browser users and records
`from_status`, required `to_status`, actor, source system, optional integration
event, reason, details, and occurrence time. Its schema and UI describe status
transitions. Reusing it for assignment would require fake status transitions or
burying the actual event in JSON, would confuse indexes/types/timeline copy,
and could interfere with the integration-event uniqueness rule.

`organization_audit_log` records organization administration and quote
acceptance. It is organization-only, while opportunities also support personal
workspaces. It lacks a required opportunity relationship and is the wrong
primary operational history.

Recommendation: add `public.opportunity_assignment_history` with:

- `id uuid` primary key;
- `opportunity_id uuid NOT NULL REFERENCES opportunities ON DELETE CASCADE`;
- nullable `previous_assigned_user_id` and `new_assigned_user_id` references to
  `auth.users ON DELETE SET NULL`;
- `actor_user_id` referencing `auth.users ON DELETE SET NULL`;
- constrained `source_system` such as `vendor_os`, `marketplace`, or
  `migration`;
- optional bounded `reason_code`;
- allowlisted object metadata only if a demonstrated use appears;
- `occurred_at` and `created_at`; and
- an `(opportunity_id, occurred_at DESC, id)` index.

Clients should receive SELECT only through parent-opportunity RLS or, preferably,
a scoped read RPC that can safely resolve historical labels from `auth.users`.
Clients must not insert/update/delete history. Removing a membership does not
delete the auth user, so former members remain labelable in history. If the auth
account is later deleted, retain the event and show `Former team member`;
immutable email/name snapshots should be added only if product and privacy
requirements explicitly demand them.

Assignment events should appear in the Opportunity Detail timeline as a
separate event type merged in application code by `occurred_at`. They should
not be written into the status table. The UI should name the event
(`Assigned`, `Reassigned`, `Assignment cleared`, or `Self-assigned`) and not
imply a status change.

## 9. Personal-workspace behavior

The personal opportunity owner is `opportunities.user_id`; assignment is not
needed to establish responsibility. `assigned_user_id` can currently be null or
equal to that owner, so existing data may have both forms.

Recommendation:

- always display `You` for personal opportunity responsibility;
- hide assignment controls and assignment filters that distinguish assigned
  from unassigned in a personal workspace;
- do not backfill or toggle `assigned_user_id` merely for display consistency;
- do not create assignment history for an implicit personal owner; and
- continue rejecting any personal assignment to another user.

If product wants personal “unassigned” as a real workflow state, that is a
separate decision and should be specified before implementation.

## 10. Organization-workspace behavior and member loading

For small and medium teams, reuse `fetchOrganizationMembers()` once per active
workspace/detail request. The current role/join-date order is deterministic,
and `getOrganizationMemberLabel()` supplies display-name/email fallback.
Pending invites and removed users are naturally absent.

No new member search endpoint, server pagination, or combobox is justified for
the initial release. A native select can list current members and, for
owner/admin users, an `Unassigned` option. Member users need only a
`Assign to me` button or a select constrained to themselves; a button is
clearer when there is only one permitted target.

If teams grow beyond a practical native-select size, add server-side member
search later. Do not leak the full membership list to non-members or place
workspace IDs in assignment URLs.

Member removal should be made assignment-aware. The smallest coherent behavior
is to update `remove_organization_member()` in the same migration sequence so
it clears that user's current assignments through an internal helper and writes
history before deleting membership. Product must approve automatic clearing;
otherwise stale assignments must remain visibly labelled `Former team member`
until an owner/admin changes them.

## 11. Opportunity-list implications

Current assignment filter values are only `all`, `assigned`, and `unassigned`.
They are URL-validated and map to null/non-null database checks. There is no
`mine` or member-specific filter, and filter values never contain user or
membership IDs.

The list already selects `assigned_user_id`, fetches members once, and maps
names with safe unknown/unassigned fallbacks. A mutation is not currently
possible from a card. Workspace changes invalidate the request key; filter/page
changes issue a new bounded query.

Recommended PR4.3 list work:

- add `mine` using the authenticated user ID inside the trusted repository;
- retain `all`, `assigned`, and `unassigned`;
- hide irrelevant assignment distinctions in personal workspaces;
- do not initially put member UUIDs in URL parameters;
- preserve filters/page after an assignment refresh, but clamp if the changed
  row leaves the current filtered page; and
- refresh the authoritative page after mutation rather than patching counts
  optimistically.

Team-member-specific filters can be deferred. If approved later, validate the
selected member against the active workspace membership result before querying;
UUIDs are identifiers, not authorization, and RLS must remain authoritative.

Do not add assignment actions to list cards in the first implementation. Detail
is a clearer permission, error, history, and concurrency surface.

## 12. Detail-page implications

`OpportunityDetailWorkspace` already loads the core detail and, in parallel,
status history, linked quotes, and organization members. Member-loading failure
does not hide core detail. `AssignmentContextCard` is a small read-only boundary
and is the correct location for initial controls.

Recommended behavior:

- derive the actor's role from the active `WorkspaceProvider.memberships`
  entry for display only; the RPC must independently authorize it;
- owners/admins receive a labelled native select containing current members and
  Unassigned;
- ordinary members receive an `Assign to me` action when useful and otherwise
  read-only copy;
- personal workspaces show `You` with no control;
- disable controls during mutation and expose an accessible status message;
- use the existing toast convention plus persistent inline error text;
- on success, use the authoritative RPC result and refetch assignment history;
- on stale-write conflict, keep the server state and ask the user to retry; and
- retain 44px targets, visible focus, meaningful labels, wrapping, and mobile
  stacking.

A modal, menu, or custom combobox adds unnecessary focus and mobile complexity.
Use pessimistic updates: assignment is low-frequency, security-sensitive, and
must not appear successful before the database transaction and history insert
commit.

## 13. Business Command Center implications

The dashboard already computes an `Unassigned opportunities` priority and
selects assignee IDs for recent rows, although recent rows do not display an
assignee. The priority currently links to the unfiltered `/opportunities`.

Required once the corresponding filter exists:

- link the Unassigned priority to
  `/opportunities?assignment=unassigned`; and
- ensure dashboard data refreshes after returning from an assignment change or
  after workspace switching.

Not required for the initial assignment workflow:

- assignee labels on recent rows;
- an Assigned to me priority;
- Business Health changes;
- assignment activity in the dashboard feed; or
- inline dashboard assignment controls.

Unassigned work is already highlighted, so PR4.3 should not redesign the
Command Center.

## 14. Concurrency considerations

The current `updated_at` trigger changes on every opportunity update, but there
is no version column or compare-and-swap mutation. Direct updates would be
last-write-wins.

The assignment RPC should `SELECT ... FOR UPDATE`, accept an optional
`p_expected_updated_at`, reject a stale value with a stable conflict error,
reject no-op assignments, and return the authoritative opportunity assignment,
new `updated_at`, and history event. This serializes rapid changes and prevents
two users from unknowingly overwriting one another.

Multiple intentional rapid changes may be allowed; every committed change
should produce one history row. The UI should not debounce or combine audit
events. It should refresh member labels and the merged timeline after success.
Historical assignees removed from membership should render as former/unknown
team members rather than disappearing.

## 15. Notification and collaboration boundaries

The repository has:

- local Sonner toasts;
- server route handlers for specific quote emails;
- quote-specific Supabase realtime subscriptions;
- Marketplace/integration event contracts; and
- an organization administration audit feed.

There is no general user notification inbox, assignment email service,
opportunity messaging model, scheduler, or collaboration event bus that makes
assignment notifications trivial. PR4.3 should use local success/error
feedback only.

Assignment management and assignment history belong in PR4.3. Notifications,
email, messaging, scheduling, jobs, and analytics are independent future
capabilities and must not be coupled to the assignment transaction.

## 16. Testing strategy

### Pure/unit tests

- permission helpers for owner/admin/member and personal behavior;
- filter parsing/serialization for `mine`;
- assignment response/error mapping;
- merged status/assignment timeline ordering and fallback labels; and
- list/detail state refresh behavior.

### Repository tests

- exact RPC name and narrow arguments;
- no client-controlled workspace argument;
- authoritative result mapping;
- stale-conflict, not-found, and permission error handling; and
- no direct opportunity update payload.

### Database/migration tests

- owner/admin assign, reassign, and clear;
- member self-assignment and forbidden other/clear actions;
- personal owner behavior and forbidden other-user assignment;
- current-member target validation;
- pending, removed, nonexistent, and cross-organization assignee rejection;
- hidden/cross-workspace opportunity rejection without data leakage;
- assignment trigger guard against direct updates;
- atomic history rows for assign/reassign/clear/self-assign;
- rollback leaves neither row nor history partially changed;
- concurrent expected-version conflict;
- history RLS/read-RPC isolation;
- member removal behavior; and
- unchanged status and quote linkage.

### Component/accessibility tests

- role-appropriate native controls and labels;
- keyboard and focus behavior;
- disabled/loading/error/live states;
- 320px wrapping;
- personal `You` behavior;
- former-member fallback;
- core detail survives secondary-history failure; and
- filters/page remain stable after refresh.

### E2E

Use two organization users with distinct roles, one outside-workspace user,
personal and organization opportunities, an unassigned opportunity, and a
removed/pending target. Verify cross-workspace attacks using normal browser
credentials only. As in PR4.2, skip fixture-dependent tests explicitly when
credentials or seeded IDs are unavailable and never use production data or a
browser service role.

The current unit suite mocks Supabase query builders. SQL invariants require a
local or disposable Supabase database; Playwright requires credentials and
seeded fixtures and was environment-gated in PR4.2.

## 17. Migration determination

**Migration required.** The existing column and validation trigger are useful,
but reliable audit history and a database-enforced narrow mutation boundary do
not exist.

Smallest safe sequence:

1. Create `opportunity_assignment_history`, its opportunity/time index, RLS,
   parent-workspace SELECT rules or a scoped read RPC, and client SELECT-only
   grants.
2. Add an internal assignment-context guard so direct changes to
   `assigned_user_id` are rejected.
3. Add `assign_opportunity(p_opportunity_id, p_assigned_user_id,
   p_expected_updated_at, p_reason_code)` as a security-definer RPC with a fixed
   search path, authentication, locked row, derived workspace, role and current
   membership checks, optional stale check, narrow update, and atomic history
   insert.
4. Grant only RPC execution to authenticated users; do not grant history writes.
5. Update member-removal behavior transactionally if automatic unassignment is
   approved.
6. Regenerate or update local Supabase row/RPC types and add SQL validation
   tests.

No new index on the opportunity list is required initially: the existing
workspace/status indexes and partial assignee index support current bounded
views. Query plans should be checked before adding an index for `mine`.

## 18. Recommended architecture

```text
Detail assignment control
        |
        v
lib/opportunities assignment repository
        |
        v  authenticated RPC; opportunity ID + assignee + expected timestamp
assign_opportunity()
  - auth.uid()
  - SELECT opportunity FOR UPDATE
  - derive personal/organization workspace
  - check actor role and target membership
  - compare expected updated_at
  - update assigned_user_id only
  - insert assignment history
        |
        v
authoritative assignment + timestamp + event
        |
        +--> refresh detail assignment and merged timeline
        +--> later refresh list/dashboard without changing URL state
```

Keep trusted workspace scoping in every read repository even though RLS
independently enforces it. The mutation does not accept a workspace ID. Use the
normal browser Supabase client, a typed domain error layer, and pessimistic UI.
Do not mutate status, quote linkage, or Marketplace snapshot data.

## 19. Recommended product decisions

The following answers are recommendations awaiting approval:

1. **Assign others:** owner and admin only.
2. **Self-assign:** every current member may self-assign.
3. **Clear:** owner and admin only; personal UI has no clear action.
4. **Personal display:** always show `You` as implicit responsibility.
5. **Removed members:** keep historical events visible with a former-member
   fallback; decide separately whether active assignments auto-clear on removal.
6. **Timeline:** merge typed assignment events into Opportunity Detail, but keep
   them in a dedicated table.
7. **Reason:** optional, bounded, and allowlisted; do not require it initially.
8. **Status:** assignment changes never change opportunity status.
9. **Rapid changes:** allow serialized, non-no-op changes and record each one.
10. **Optimism:** use pessimistic updates with authoritative RPC responses.
11. **Command Center:** retain the existing Unassigned priority and deep-link it
    to the filtered list; do not add a new dashboard module.
12. **Action location:** Detail only initially; list actions can follow after
    permissions/history behavior is proven.

## 20. Staged implementation plan

### PR4.3B1 — Secure assignment and history foundation

- migration, history table/RLS, narrow RPC, direct-update guard, optional stale
  check, removal behavior decision, local types, database tests, repository, and
  permission helpers

### PR4.3B2 — Opportunity Detail assignment controls

- native role-aware control, personal `You`, pessimistic states, error mapping,
  authoritative refresh, accessible mobile behavior, and component tests

### PR4.3B3 — Assignment timeline and list refinement

- scoped assignment-history read, typed merged timeline, Mine filter,
  filter/page-preserving refresh, and Unassigned Command Center deep link

### PR4.3B4 — Collaboration refinement

- former-member labels, workspace-switch invalidation, concurrency conflict UX,
  targeted accessibility/responsive review, and only approved removal behavior

### PR4.3B5 — Validation and release review

- cross-role/cross-workspace SQL and E2E validation, regression suite, public
  quote and opportunity-to-quote checks, documentation, and release report

Notifications, messaging, scheduling, jobs, and analytics are not stages of
PR4.3.

## 21. Risks and open questions

- May an ordinary member claim an opportunity currently assigned to someone
  else, or only an unassigned opportunity?
- Should removing a member atomically clear their active assignments, or retain
  them until an owner/admin reassigns?
- Is an optional reason useful enough to expose in the first UI, or should the
  schema reserve it while UI omits it?
- Is `updated_at` an acceptable concurrency token even though unrelated
  opportunity changes also make it stale, or is a dedicated assignment version
  justified?
- Should organization members see all assignment history, consistent with
  current opportunity visibility, or should history be owner/admin-only?
- Must historical names survive auth-account deletion? If yes, approve the
  privacy implications of immutable label snapshots.
- Should personal null assignment continue to mean implicit ownership, or
  become a visible unassigned state?
- When should individual-member list filters become necessary, and is exposing
  a member UUID in the URL acceptable?

The broad existing opportunity UPDATE grant should be reviewed alongside the
guard design so current/future direct edits are not accidentally broken or left
as an escalation path.

## 22. Files likely to change in implementation

Likely:

- a new numbered `supabase/migrations/` assignment/history migration
- a new Supabase SQL validation test
- `lib/supabase/types.ts`
- `lib/opportunities/types.ts`
- `lib/opportunities/repository.ts` and tests, or a focused assignment
  repository beside it
- `lib/opportunities/format.ts` and tests for filters/timeline formatting
- `components/opportunities/OpportunityDetailWorkspace.tsx` and tests
- `components/opportunities/OpportunitiesWorkspace.tsx`
- `components/opportunities/OpportunityFilters.tsx`
- opportunity list tests
- `components/dashboard/BusinessCommandCenter.tsx` and its focused tests
- PR4.3 documentation and environment-aware E2E tests

Potentially, only if automatic clearing is approved:

- the organization member-removal RPC migration/repository tests

Not expected:

- quote persistence or public quote routes
- Marketplace webhook routes
- service-role browser code
- messaging, scheduling, jobs, notifications, or analytics modules

## 23. Final go/no-go recommendation

**Go for staged PR4.3 implementation only after the role and member-removal
decisions are approved. No-go for assignment UI on the current schema alone.**

The current trigger already provides valuable workspace and role defense, so
the foundation is incremental rather than a redesign. B1 must establish the
narrow RPC and dedicated history transaction before any assignment control is
enabled. Quote behavior, status transitions, trusted workspace reads, RLS,
hidden/not-found behavior, and browser service-role prohibition must remain
unchanged.

## 24. PR4.3B1 implementation record

PR4.3B1 implements the secure foundation in
`022_opportunity_assignment_foundation.sql` without adding UI behavior.

### Assignment RPC

`public.assign_opportunity(p_opportunity_id, p_assigned_user_id,
p_expected_updated_at, p_reason_code)` is the only supported assignment write
boundary. It is `SECURITY DEFINER`, fixes `search_path` to
`public, pg_temp`, requires `auth.uid()`, and never accepts an organization or
workspace ID.

The function selects the caller-visible opportunity `FOR UPDATE`, derives
personal/organization scope from that row, validates current target membership
and actor role, optionally compares `updated_at`, rejects no-ops, changes only
`assigned_user_id`, and inserts history in the same transaction. It returns the
authoritative opportunity ID, assignee, updated timestamp, history ID, and event
timestamp.

Hidden, missing, and cross-workspace opportunity IDs produce the same
`P0002` result. Owners/admins may assign current organization members or clear;
members may assign only themselves. Personal owners may retain the existing
schema behavior of assigning themselves or clearing, but cannot target another
user. No assignment changes status.

`opportunities_require_assignment` mirrors the status-transition guard:
direct changes to `assigned_user_id` fail unless the assignment RPC has enabled
the transaction-local assignment context.

### Assignment history

`public.opportunity_assignment_history` stores the opportunity, previous and
new assignees, actor, constrained source system, optional bounded reason, and
timestamps. The RPC rejects no-op changes; the history table intentionally does
not duplicate that as a check constraint because both user foreign keys use
`ON DELETE SET NULL` and must not prevent eventual auth-user deletion.

The authenticated role has SELECT only. Personal and organization SELECT
policies follow visibility of the parent opportunity. Anonymous users have no
access, and browser roles cannot insert, update, or delete history.

### Repository and domain errors

`lib/opportunities/assignment.ts` exposes `assignOpportunity()` using the normal
authenticated Supabase client. Its payload contains only opportunity ID,
assignee, optional expected timestamp, and optional reason. It maps database
results to typed domain errors:

- `not_authenticated`
- `not_found`
- `forbidden`
- `conflict`
- `invalid`
- `unavailable`

Local Supabase types now include the assignment-history row, source-system
union, and RPC result row.

### Validation and limitations

The SQL validation script checks catalog security plus owner assign/reassign/
clear, member self-assignment, forbidden other-member and clear actions,
pending/removed/cross-workspace targets, hidden opportunities, personal
cross-user rejection, atomic rollback/history, stale timestamps, no-ops, and
the direct-update guard.

B1 intentionally does not alter member-removal behavior. An opportunity already
assigned to a subsequently removed member remains assigned until a later
authorized change. B1 also does not expose history through an application
repository or add Detail/List controls; those remain later stages.
