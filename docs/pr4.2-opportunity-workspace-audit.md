# PR4.2A — Opportunity Workspace repository audit and implementation plan

Status: audit and planning only  
Audit date: 2026-07-26  
Repository state: PR4.1 is present as uncommitted workspace changes

## A. Executive summary

The repository can support the minimum honest Opportunity Workspace without a
database migration:

- `opportunities` already stores organization/personal ownership, customer and
  property links, Marketplace identity, source, status, service/request text,
  assignee, immutable Marketplace context, lifecycle timestamps, and timestamps.
- RLS and database triggers already enforce workspace isolation, valid linked
  records, valid assignees, immutable Marketplace identity, and status changes
  through `transition_opportunity`.
- `opportunity_status_history` already supports a truthful opportunity timeline.
- `quotes.opportunity_id` and its cross-workspace validation trigger already
  support quote linkage.
- PR4.1 already reads bounded, workspace-scoped opportunity summaries.

The principal application gaps are data-access and UI, not schema. There is no
functional list, detail route, full-detail repository, status-history repository,
or opportunity quote-prefill adapter. The quote application model currently
forces `opportunity_id` to `null` on every save and drops it on reads, so quote
linkage requires a small application-model correction.

Marketplace opportunity photos and attachments are not retained. Internal
opportunity notes do not exist. Customer/property notes must not be presented as
opportunity notes. The raw `integration_events.payload` must remain server-only.

Recommended scope:

1. Build a paginated list using exact workspace filters and bounded queries.
2. Build `/opportunities/[id]` using an ID plus trusted active-workspace filter,
   backed again by RLS.
3. Show customer, property, immutable request context, assignment label, linked
   quotes, and status history.
4. Prefill the existing `/quote` workflow from an opportunity and persist the
   existing `quotes.opportunity_id`.
5. Deep-link PR4.1 recent opportunity rows to detail.
6. Defer opportunity photos, attachments, internal notes, assignment mutation,
   and broad cross-relationship text search.

## B. Current opportunity architecture

The application uses one root App Router layout, with client providers for auth,
active workspace, vendor profile, and quote history. There are no route groups or
nested authenticated layouts. `RequireAuth` protects non-public paths in the
client. `AppMain` applies the reusable Vendor Workspace shell to private routes.

Marketplace ingestion is a separate server-only path:

`POST /api/integrations/marketplace/events`
→ strict event validation and signature verification
→ server-only admin client
→ `process_marketplace_lead_assigned`
→ security-definer database transaction
→ customer/property/opportunity/history projection.

Normal opportunity reads use the authenticated browser Supabase client and RLS.
PR4.1's `fetchDashboardData(userId, workspace)` is currently the only application
opportunity read repository.

## C. Exact route map

| Route | Exact file | Current state |
| --- | --- | --- |
| `/opportunities` | `app/opportunities/page.tsx` | Honest coming-soon placeholder |
| Opportunity detail | none | Does not exist |
| `/command-center` | `app/command-center/page.tsx` | Functional PR4.1 dashboard |
| `/quote` | `app/quote/page.tsx` | Existing quote creation/edit workflow |
| `/quote?quoteId=<id>` | `components/quote-flow/QuoteFlow.tsx` | Opens an existing saved quote |
| `/quote?repairRequestId=<id>` | `components/quote-flow/QuoteFlow.tsx` | Prefills from a repair request |
| `/quotes` | `app/quotes/page.tsx` | Existing quote history |
| `/customers` | `app/customers/page.tsx` | Placeholder; no detail route |
| `/properties` | `app/properties/page.tsx` | Placeholder; no detail route |
| `/team` | `app/team/page.tsx` | Existing team/settings composition |
| `/quote/[token]` | `app/quote/[token]/page.tsx` | Public client quote; must remain public |

The root `app/layout.tsx` is the only layout. `components/auth/RequireAuth.tsx`
declares `/login`, `/auth/reset-password`, `/request-repair`, `/invite/*`, and
`/quote/*` public. The query-based `/quote` builder remains private.

PR4.1 links:

- Navigation, priorities, health context, “View all,” quick action, and every
  recent opportunity currently link to `/opportunities`.
- Recent opportunity rows do not yet use their available `item.id`.
- The smallest deep-link change is
  `href={\`/opportunities/${encodeURIComponent(item.id)}\`}` for populated rows;
  list-level links remain `/opportunities`.

No `opportunityId` quote query convention exists today.

## D. Exact file map

### Opportunity and Marketplace domain

- `lib/supabase/types.ts`: `OpportunityRow`, `OpportunityStatusHistoryRow`,
  `CustomerRow`, `PropertyRow`, status/origin unions, `QuoteRow`.
- `lib/integrations/events/v1/marketplace-lead-assigned.ts`: exact inbound v1
  Marketplace assignment contract.
- `lib/integrations/events/v1/opportunity-created.ts`,
  `opportunity-opened.ts`, `opportunity-declined.ts`: integration contracts,
  not an application repository or stored browser activity feed.
- `lib/integrations/marketplace/server.ts`: server-only ingestion RPC adapter.
- `app/api/integrations/marketplace/events/route.ts`: signed webhook handler.
- `supabase/migrations/020_marketplace_persistence_foundation.sql`: tables,
  constraints, RLS, indexes, transitions, quote linkage.
- `supabase/migrations/021_marketplace_lead_assignment_ingestion.sql`: atomic
  lead projection and immutable snapshot.

### PR4.1 opportunity use

- `lib/dashboard/repository.ts`: `fetchDashboardData`.
- `lib/dashboard/types.ts`: `OpportunitySummary`, labels, dashboard results.
- `components/dashboard/BusinessCommandCenter.tsx`: recent rows, status styles,
  priorities, counts, links.
- `app/opportunities/page.tsx`: current placeholder.

### Auth and workspace

- `components/providers/AppProviders.tsx`
- `components/auth/AuthProvider.tsx`
- `components/auth/RequireAuth.tsx`
- `components/organizations/WorkspaceProvider.tsx`
- `lib/organizations/store.ts`
- `lib/organizations/types.ts`
- `lib/organizations/members.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`

### Quote integration

- `app/quote/page.tsx`
- `components/quote-flow/QuoteFlow.tsx`
- `components/quote-form/types.ts`
- `components/quote-form/QuoteForm.tsx`
- `lib/quotes/types.ts`
- `lib/quotes/store.ts`
- `lib/supabase/types.ts`
- `lib/supabase/migrate-local.ts`
- `lib/repair/to-quote-form.ts` (useful adapter precedent)

### Existing tests and documentation

- `supabase/tests/020_marketplace_persistence_validation.sql`
- `supabase/tests/021_marketplace_lead_assignment_ingestion_validation.sql`
- `docs/testing/marketplace-schema-rls.md`
- `docs/testing/marketplace-lead-ingestion.md`
- `app/api/integrations/marketplace/events/route.test.ts`
- `lib/integrations/events/registry.test.ts`
- `lib/dashboard/growth-score.test.ts`
- `components/dashboard/MetricState.test.tsx`
- `components/layout/workspace-navigation.test.tsx`
- `components/layout/AppHeader.test.tsx`
- `e2e/mobile-nav.spec.ts`
- `e2e/helpers/auth.ts`

## E. Database schema and relationships

### `public.opportunities`

Foreign keys:

- `organization_id → organizations.id ON DELETE CASCADE`
- `user_id → auth.users.id ON DELETE CASCADE`
- `customer_id → customers.id ON DELETE SET NULL`
- `property_id → properties.id ON DELETE SET NULL`
- `assigned_user_id → auth.users.id ON DELETE SET NULL`

Indexes:

- unique partial `marketplace_lead_id`
- `(organization_id, status, updated_at DESC)` for organization rows
- `(user_id, status, updated_at DESC)` for personal rows
- partial indexes on `customer_id`, `property_id`, `assigned_user_id`, and
  `marketplace_request_id`

There is no soft-delete, archive, title-specific, text-search, origin, or
`updated_at`-only workspace index.

RLS:

- Personal SELECT/UPDATE requires `organization_id IS NULL` and
  `user_id = auth.uid()`.
- Organization SELECT/UPDATE requires organization membership.
- Browser INSERT allows only direct, `new` personal or organization records.
- Browser DELETE is neither granted nor policy-enabled.

Triggers validate customer/property workspace equality, assignee membership,
immutable workspace/origin/Marketplace fields, state-machine use, and
`updated_at`.

### `public.opportunity_status_history`

`opportunity_id` cascades on opportunity deletion. `actor_user_id` and
`integration_event_id` become null if their source is removed. Authenticated
users receive SELECT only, conditioned through visibility of the parent
opportunity. The `(opportunity_id, occurred_at, id)` index supports a bounded
detail timeline. There is no assignment-history table.

### Quote linkage

`quotes.opportunity_id → opportunities.id ON DELETE SET NULL`, indexed by
`(opportunity_id, created_at DESC)`. A trigger rejects cross-workspace quote
links. This relationship exists in SQL and `QuoteRow`, but not in `SavedQuote`.

### Relationships that do not exist

- Opportunity → photos/attachments
- Opportunity → internal notes
- Opportunity → repair request ID
- Opportunity → job
- Opportunity → messages
- Opportunity → assignment-history record
- Customer/property → dedicated detail UI
- `integration_events` browser-readable linkage (intentionally forbidden)

## F. Opportunity fields currently available

Exact `OpportunityRow` contract:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | UUID primary key |
| `organization_id` | `string \| null` | Organization workspace |
| `user_id` | `string \| null` | Personal owner; Marketplace org rows are system-owned/null |
| `customer_id` | `string \| null` | Optional customer FK |
| `property_id` | `string \| null` | Optional property FK |
| `marketplace_lead_id` | `string \| null` | Immutable Marketplace lead UUID |
| `marketplace_request_id` | `string \| null` | Immutable Marketplace request UUID |
| `origin` | `"marketplace" \| "direct" \| "repair_request"` | Immutable source |
| `status` | `OpportunityStatus` | State-machine status |
| `service_type` | `string` | Required, 1–100 trimmed characters |
| `summary` | `string` | Request title/fallback title |
| `description` | `string` | Request description |
| `assigned_user_id` | `string \| null` | Auth user; validated against workspace |
| `source_snapshot` | JSON object | Immutable for Marketplace opportunities |
| `opened_at` | `string \| null` | First opened transition |
| `declined_at` | `string \| null` | First declined transition |
| `closed_at` | `string \| null` | First closed transition |
| `created_at` | `string` | Creation time |
| `updated_at` | `string` | Last row update |

There is no separate title field; `summary` is the title-like field. There is no
archived/deleted flag or direct quote reference on the opportunity; quote
association is the reverse `quotes.opportunity_id` relationship.

## G. Marketplace data currently retained

The operational columns retain lead ID, request ID, service category code,
request title in `summary`, request description in `description`, and assignment
time indirectly in the immutable snapshot and initial history occurrence.

`source_snapshot` retains:

- `contractVersion`
- `marketplaceLeadId`
- `marketplaceRequestId`
- optional `marketplaceHomeownerId`
- optional `marketplacePropertyId`
- `assignedAt`
- `{ code, displayName }` service category
- `requestTitle`
- `requestDescription`
- optional `preferredTiming`
- optional `{ minimumAmountMinor, maximumAmountMinor, currency }` budget range
- `{ displayName, email, optional phone }` customer
- structured property address

The customer and property are also projected to their operational tables.
Marketplace ingestion always creates or reuses a customer and property because
the v1 contract requires both nested objects; external homeowner/property UUIDs
are optional, not the records themselves.

No photos, attachments, consent flags, communication preferences, or general raw
metadata are included in `source_snapshot`. The full validated envelope is
stored as `integration_events.payload`, but authenticated clients have no table
privileges or policies. It is internal and must not be exposed by PR4.2. Budget
may be displayed only with currency/minor-unit formatting and copy that makes
clear it is homeowner-supplied Marketplace request context, not an estimate.

## H. Customer and property integration

`CustomerRow` provides display name, email, phone, preferred contact method,
notes, tags, Marketplace homeowner ID, and timestamps. `PropertyRow` provides
customer link, complete structured address, country, coordinates, `property_data`,
notes, access instructions, tags, Marketplace property ID, and timestamps.

There are no customer/property repositories beyond PR4.1 count and join queries,
and both `/customers` and `/properties` are placeholders. There are no detail,
create, or edit flows to link from PR4.2.

For detail, safely select a bounded field allowlist through the opportunity join:

- Customer: `id`, `display_name`, `email`, `phone`,
  `preferred_contact_method`.
- Property: `id`, address fields, `country_code`; optionally
  `access_instructions` only if product/privacy review approves it.

Do not expose Marketplace identity UUIDs in primary UI. Treat null joined rows as
“Customer details unavailable” or “Property details unavailable.” Do not link
cards until real customer/property detail routes exist.

Customer/property `notes` are valid data but have different ownership semantics;
do not label them as opportunity notes. `property_data` is untyped JSON and
should not be rendered generically.

## I. Photos and attachment availability

Opportunity photos are unavailable.

Existing photo systems are unrelated:

- `repair_requests.photos` stores repair-request data URLs.
- `quote-photos` stores public quote thumbnails.
- `quote-photo-originals` stores private originals with signed URLs.
- `lib/supabase/quote-photo-storage.ts` is quote-ID/path specific.
- `QuotePhotoThumbnails`, `PhotoViewerModal`, `JobPhotosGallery`, and
  `PhotoUpload` are reusable presentation references only after a real
  opportunity attachment source exists.

Marketplace v1 explicitly retains no photos. PR4.2 should render a clearly
unavailable/omitted attachments section, not inspect raw event payloads or reuse
another entity's bucket.

## J. Notes availability

There is no opportunity-note table or field. Customer and property have `notes`;
quotes have generated/form notes, and organization audit metadata is not a note
system. There is no reusable rich-text editor.

PR4.2 cannot safely create internal opportunity notes without a migration.
Defer note creation. If customer/property notes are displayed at all, label their
entity explicitly and make them read-only; the safer initial scope is to omit
them.

## K. Activity and timeline availability

The honest opportunity timeline source is `opportunity_status_history`:

- initial Marketplace `null → new` at `assignedAt`
- vendor transitions with prior/new status, actor UUID, source system,
  optional reason/details, and occurrence time

The opportunity's creation/update/lifecycle timestamps can supplement an empty
or partial timeline, but must not duplicate history events.

`integration_events` is inaccessible and contains private raw payloads.
`organization_audit_log` covers team and quote-accepted actions, not general
opportunity history. PR4.1 recent activity is only recent quote updates and is
not reusable as an opportunity timeline.

Linked quotes can be shown as a separate “Quotes” section. They do not currently
produce locally persisted opportunity history entries.

## L. Assignment context availability

`assigned_user_id` supports assigned/unassigned display. For organization
workspaces, `fetchOrganizationMembers(organizationId)` returns member user ID,
email, display name, role, and joined date through
`get_organization_members`. `getOrganizationMemberLabel` provides the established
name/email fallback.

Personal opportunities may only be assigned to their owner. Marketplace rows
start unassigned. There is no `assigned_at` or assignment-history field. Therefore:

- Assigned member and unassigned state: available.
- Assignment timestamp/history: unavailable.
- Assignment mutation: technically constrained in SQL but explicitly out of
  PR4.2 scope; display only.

Member lookup should be one bounded organization query, not one request per row.

## M. Current status model

Valid values and PR4.1 labels:

| Value | Label |
| --- | --- |
| `new` | New |
| `opened` | Opened |
| `quoting` | Ready to quote |
| `quoted` | Quoted |
| `won` | Won |
| `lost` | Lost |
| `declined` | Declined |
| `closed` | Closed |

Marketplace ingestion creates only `new`. SQL transition edges are:

- `new → opened | declined`
- `opened → quoting | declined`
- `quoting → quoted | declined`
- `quoted → won | lost`
- active (`new|opened|quoting|quoted`) → `closed`, owner/admin only for orgs

Direct UPDATE is blocked; `transition_opportunity` is executable by authenticated
users and performs authorization plus history append. No application function
calls it today. Status editing should be deferred unless separately approved;
PR4.2 can display current status and history without inventing transitions.

The labels in `lib/dashboard/types.ts` are reusable. Move visual variants and
labels to an opportunity-domain module rather than importing dashboard code into
the workspace.

## N. Existing quote-prefill capabilities

`/quote` supports:

- blank create
- `?quoteId=<id>` edit/view
- `?repairRequestId=<id>` repair-request prefill

Repair prefill demonstrates the correct pattern: a focused fetch plus pure-ish
adapter into `QuoteFormData`, then reuse `QuoteFlow`. Opportunity prefill does not
exist. The form supports service type, address, property facts, ZIP, description,
and photos. It has no customer fields.

Smallest safe integration:

1. Add `?opportunityId=<uuid>` mutually exclusive with `quoteId` and
   `repairRequestId`.
2. Fetch through the same trusted, scoped opportunity-detail repository used by
   detail UI.
3. Convert recognized `service_type` values, formatted property address/ZIP, and
   `description` into `QuoteFormData`; preserve unsupported service types as an
   explicit user choice rather than guessing.
4. Add `opportunityId?: string | null` to `SavedQuote`.
5. Map `SavedQuote.opportunityId ↔ QuoteRow.opportunity_id`; remove the current
   hard-coded `opportunity_id: null`.
6. Ensure quote save target matches the opportunity workspace. Do not allow the
   existing save-target selector to create a cross-workspace link; lock or
   validate the target for opportunity-originated creation.
7. After successful create, optionally call the already-approved
   `transition_opportunity` only if a later product decision explicitly approves
   automatic `opened/quoting/quoted` behavior. Do not assume it in B3.

No quote builder duplication or migration is required.

## O. Search, filter, sort, and pagination capabilities

Supported now with bounded Supabase queries:

- Filter exact `status` using the composite workspace/status indexes.
- Filter exact `origin`; valid but not specifically indexed.
- Filter `assigned_user_id = <member>` or `IS NULL`; assignee has a partial
  global index.
- Sort recently updated or newest with `.order(...)`.
- Offset pagination using `.range(from, to)` plus `{ count: "exact" }`.

Limitations:

- `summary`, `description`, and `service_type` can use escaped `ILIKE`, but no
  text-search/trigram index exists; do not claim scalable search.
- Search across joined customer name or property address is not safely supported
  by the current repository/index set in one efficient query.
- The current workspace indexes optimize status plus updated time, not origin,
  assignment, created-time, or general updated-time queries.
- Supabase cursor pagination is not implemented and no stable compound cursor
  repository exists.

Recommendation for B1: server-side/database filtering with a page size of 20–25,
exact status and origin filters, assigned/unassigned filter, `updated_at DESC`
default, and offset pagination. Either defer text search or label a bounded
title/service-only search as initial and measure it. Never fetch all rows for
client-side filtering. Escape `%`, `_`, and filter syntax if text search is added.
A future measured migration may add trigram/full-text and composite workspace
indexes.

## P. Reusable UI components

Reusable directly:

- Workspace shell/navigation: `components/layout/AppMain.tsx`,
  `components/layout/workspace-navigation.tsx`
- Loading: `components/ui/LoadingState.tsx`,
  `components/ui/LoadingSpinner.tsx`
- Error: `components/ui/ErrorFallback.tsx`,
  `components/ui/ErrorBoundary.tsx`
- Status/result precedent: `components/dashboard/MetricState.tsx`
- Empty-state visual precedent: `components/workspace/ModulePlaceholder.tsx`
- Organization member labels: `lib/organizations/types.ts`
- Date formatting precedent: `lib/dashboard/format.ts`
- Focus-trap/modal precedent: `lib/hooks/useFocusTrap.ts`,
  `components/photos/PhotoViewerModal.tsx`

Reusable by extraction rather than direct import:

- PR4.1 status labels/styles and opportunity row visual language in
  `BusinessCommandCenter.tsx` and `lib/dashboard/types.ts`
- Rounded card, section title, loading row, and empty-message patterns currently
  local to `BusinessCommandCenter.tsx`
- Quote status badge patterns in `lib/quotes/types.ts`

Not present as shared primitives: breadcrumbs, tabs, generic card, badge, table,
pagination, timeline, definition list, drawer, or generic skeleton. Create
opportunity-focused components rather than a speculative design system.

## Q. Recommended PR4.2 page architecture

### Opportunities list

- Semantic page header and total result count
- Status, source, and assignment filters
- Optional deferred title/service search
- Desktop rows that become stacked cards at narrow widths
- Title/service, source, status, customer fallback, property fallback,
  assignment label, updated time
- Bounded page controls
- Loading skeleton with stable dimensions
- Distinct zero-result, filtered-zero, query-error, and unsupported states

### Opportunity detail

- Back link and header with title, service, source, status, created date
- Primary Create Quote action
- Request overview (`description`, preferred timing, carefully formatted budget)
- Customer context card
- Property context card
- Assignment context (read-only)
- Linked quotes
- Status timeline
- Attachments explicitly unavailable/omitted
- No opportunity-note composer

## R. Recommended component hierarchy

```text
app/opportunities/page.tsx
  OpportunitiesWorkspace
    OpportunitiesHeader
    OpportunityFilters
    OpportunityListState
      OpportunityList
        OpportunityListItem
    OpportunityPagination

app/opportunities/[id]/page.tsx
  OpportunityDetailWorkspace
    OpportunityBreadcrumb
    OpportunityHeader
      OpportunityOriginBadge
      OpportunityStatusBadge
      CreateQuoteLink
    OpportunityRequestCard
    CustomerContextCard
    PropertyContextCard
    AssignmentContextCard
    LinkedQuotesSection
    OpportunityTimeline
      OpportunityTimelineItem
```

Keep status/origin labels, styles, address formatting, source-snapshot parsing,
and quote-prefill conversion in domain modules outside presentation.

## S. Recommended server/data flow

The current authenticated application is client-context based; the browser owns
the Supabase session. `lib/supabase/server.ts` can create a token-bound client
only when a bearer token is explicitly supplied, and there is no cookie-based
server session helper. For B1/B2, extending the established browser repository
pattern is the smallest coherent approach:

1. `RequireAuth` resolves the authenticated user.
2. `WorkspaceProvider` supplies a workspace selected only from fetched
   memberships.
3. A focused opportunity repository receives `user.id`, trusted `Workspace`,
   and validated list/detail parameters.
4. Every query applies explicit personal or organization scope.
5. Supabase RLS independently enforces the same boundary.
6. List and detail components consume discriminated loading/ready/not-found/error
   states.

Recommended repository functions:

- `fetchOpportunityPage(userId, workspace, filters, page)`
- `fetchOpportunityDetail(userId, workspace, opportunityId)`
- `fetchOpportunityHistory(userId, workspace, opportunityId, limit)`
- `fetchOpportunityQuotes(userId, workspace, opportunityId, limit)`

Detail can use one opportunity query with customer/property joins. Load history
and linked quotes in parallel as independent results so their failure does not
erase the core record. Organization members can load once per detail; for a list,
load member labels once and map locally.

Do not use the service-role client. Do not add a public route handler merely to
proxy ordinary authenticated reads. A future broader server-rendering migration
should first establish a repository-wide cookie/session strategy rather than
creating an Opportunities-only auth architecture.

## T. Security and organization-isolation plan

- Validate IDs as UUID-shaped input for friendly failures, but never treat shape
  validation as authorization.
- Detail query must combine `.eq("id", opportunityId)` with the same explicit
  active workspace scope used by PR4.1, then `.maybeSingle()`.
- Return one indistinguishable not-found state for absent and RLS-hidden records.
- Never accept organization ID from URL/search parameters.
- `WorkspaceProvider` membership validation and RLS remain mandatory defense in
  depth.
- Select allowlisted columns. Never select/display `integration_events.payload`.
- Parse `source_snapshot` with a strict display schema and ignore unknown keys.
- Keep Marketplace IDs secondary/internal; avoid exposing them unless a support
  use case is approved.
- Quote prefill must re-query the opportunity in the active workspace and bind
  quote save target to that workspace.
- Preserve public `/quote/[token]` behavior; it is unrelated to opportunity
  detail.
- Do not import or expose `createAdminSupabaseClient`.

## U. Testing strategy

### Unit tests

- Opportunity status/origin label and variant exhaustiveness.
- Address/customer fallback formatting.
- Strict Marketplace snapshot parsing, missing/unknown fields, currency minor
  units, and no raw-object rendering.
- Filter serialization/escaping and pagination bounds.
- Opportunity-to-quote prefill for recognized/unknown services, partial address,
  empty description, and no photos.
- `SavedQuote` row mapping preserves `opportunity_id` both directions.

### Repository tests with mocked Supabase chains

- List always applies active organization scope or personal user/null-org scope.
- Detail applies both ID and trusted workspace scope.
- Filters, ordering, limits/ranges, and counts are database-side.
- Detail maps missing customer/property safely.
- Not found and errors remain distinct.
- History and linked quotes are bounded.
- Arbitrary URL ID cannot remove workspace predicates.

The repository currently has store mocks but no opportunity repository mock
harness; add a small typed query-client seam if chain mocks become brittle.

### React Testing Library

- List populated, empty, filtered-empty, loading, error, partial fields.
- Filters have labels and keyboard operation.
- List links use `/opportunities/<id>`.
- Detail renders partial customer/property/snapshot/history independently.
- Unassigned and unknown-member fallbacks.
- Create Quote URL contains only the opportunity ID.
- No raw payload, fake attachment, or fake note controls render.

### Database/security validation

Extend the existing disposable-database procedure, not production:

- organization member can read same-org list/detail/history/quotes
- nonmember and other personal owner cannot read by guessed UUID
- quote link accepts same workspace and rejects cross-workspace
- browser cannot read `integration_events`

No local Supabase CLI config or seeded database runner exists, so SQL behavioral
tests remain documented/manual until that infrastructure is added.

### Playwright

- Authenticated list → detail → Create Quote flow
- Deep link from command center
- direct cross-workspace/not-found detail behavior with seeded fixtures
- filter state and pagination
- 320px no-overflow and mobile navigation
- keyboard focus order and visible focus

Current E2E tests require real Supabase credentials and are skipped without them.
`e2e/helpers/auth.ts` is stale after PR4.1: it waits for `/` and the landing-page
heading, while login now redirects to `/command-center`. Fix that helper during
B4.

## V. Performance considerations

- Select only list columns and joins; never list `description` or
  `source_snapshot`.
- Use 20–25 row pages and an exact count only when needed.
- Avoid per-row customer/property/member queries: use PostgREST joins and one
  member lookup.
- One detail query can return core opportunity/customer/property context.
- Load status history and linked quotes in parallel and cap both.
- No photo signed URLs are required because opportunity photos do not exist.
- Avoid client filtering over unbounded results.
- Debounce only if title/service database search is approved.
- Authenticated data must not be shared across workspace cache keys. Follow
  PR4.1's `userId + workspace` key/cancellation pattern.
- Current indexes make status+updated queries strongest. Measure origin,
  assignment, search, and created-sort plans before adding indexes.

## W. Migration recommendation

No migration is required for the minimum PR4.2 plan.

Deferrable future migrations:

- Opportunity attachments: new metadata table/private bucket/RLS and ingestion
  contract; essential only if product requires photos.
- Internal opportunity notes: additive notes table with author, timestamps, RLS,
  and append/update policy.
- Scalable search: measured trigram/full-text and composite workspace indexes.
- Assignment history/timestamp: additive history model only when assignment
  workflows are approved.

Do not add any of these speculatively in PR4.2.

## X. Metrics or features that cannot be implemented honestly yet

- Opportunity photos or attachments
- Internal opportunity notes or note creation
- Assignment timestamp/history
- Full unified event timeline
- Messaging, scheduling, jobs, or job conversion
- Customer/property detail links or editing
- Scalable search across title + customer + property address
- Marketplace consent/communication preferences
- Marketplace request metadata outside the validated snapshot
- Review/rating/value/response-time metrics
- Automatic status change on viewing or quoting without a product decision

## Y. Exact files recommended for creation or modification

### PR4.2B1 — list and data access

Create:

- `lib/opportunities/types.ts`
- `lib/opportunities/repository.ts`
- `lib/opportunities/format.ts`
- `lib/opportunities/repository.test.ts`
- `lib/opportunities/format.test.ts`
- `components/opportunities/OpportunitiesWorkspace.tsx`
- `components/opportunities/OpportunityFilters.tsx`
- `components/opportunities/OpportunityList.tsx`
- `components/opportunities/OpportunityListItem.tsx`
- `components/opportunities/OpportunityList.test.tsx`

Modify:

- `app/opportunities/page.tsx`
- `lib/dashboard/types.ts` (import/re-export shared domain labels if needed)
- `components/dashboard/BusinessCommandCenter.tsx` (only shared status imports if
  extracted in B1; deep links wait for B3)

### PR4.2B2 — detail workspace

Create:

- `app/opportunities/[id]/page.tsx`
- `components/opportunities/OpportunityDetailWorkspace.tsx`
- `components/opportunities/OpportunityHeader.tsx`
- `components/opportunities/OpportunityRequestCard.tsx`
- `components/opportunities/CustomerContextCard.tsx`
- `components/opportunities/PropertyContextCard.tsx`
- `components/opportunities/AssignmentContextCard.tsx`
- `components/opportunities/OpportunityTimeline.tsx`
- focused RTL tests for the detail states

Modify:

- `lib/opportunities/types.ts`
- `lib/opportunities/repository.ts`

### PR4.2B3 — quote integration and deep links

Create:

- `lib/opportunities/to-quote-form.ts`
- `lib/opportunities/to-quote-form.test.ts`

Modify:

- `components/quote-flow/QuoteFlow.tsx`
- `lib/quotes/types.ts`
- `lib/supabase/types.ts`
- `lib/quotes/store.test.ts` and mapper tests
- `components/dashboard/BusinessCommandCenter.tsx`
- opportunity detail header/action

No migration should be created.

### PR4.2B4 — validation and refinement

Create/modify:

- opportunity component/repository tests above
- `e2e/opportunities.spec.ts`
- `e2e/mobile-nav.spec.ts`
- `e2e/helpers/auth.ts`
- `docs/pr4.2-opportunity-workspace.md`
- SQL validation documentation only if new behavioral coverage is added

## Z. Risks, assumptions, and open questions

### Risks

- `quotes.opportunity_id` is silently nulled by current mapping; B3 must correct
  reads and writes atomically at the application level.
- The quote save-target selector can choose a different workspace and must not
  be allowed to produce a cross-workspace opportunity link.
- Marketplace `serviceCategory.code` is an arbitrary bounded string, while the
  quote builder accepts seven fixed service values.
- `source_snapshot` is typed as generic JSON; direct rendering could leak
  unsupported data or crash on malformed legacy rows.
- Joined search may become slow without indexes.
- The root client-only auth guard can briefly render loading/redirect states;
  PR4.2 should follow current architecture rather than claim server enforcement.
- PR4.1 is currently uncommitted, so future implementation must preserve those
  workspace changes and avoid treating them as clean baseline files.

### Assumptions

- Migrations 020 and 021 are deployed together in target environments.
- Active workspace membership data is trustworthy because
  `parseStoredWorkspace` only restores fetched memberships.
- RLS behavior matches the committed migration and validation documentation.
- Status mutation, assignment mutation, and internal notes remain out of scope.

### Open product decisions

1. Should viewing detail transition `new → opened`, or remain read-only?
   Recommendation: remain read-only until explicitly approved.
2. Should starting/saving a quote transition to `quoting`/`quoted`?
   Recommendation: persist linkage first; decide transitions separately.
3. Should Marketplace budget be displayed to every organization member?
4. Should property access instructions appear in detail?
5. Is limited title/service search acceptable for v1, or should all text search
   be deferred pending indexing?
6. Should terminal opportunities remain in default list results?
7. Should personal workspaces show Opportunities, given Marketplace opportunities
   are organization-only but direct personal opportunities are schema-supported?

## Recommended implementation phases

The proposed division is sound with two refinements:

- **PR4.2B1 — List and data access:** shared opportunity domain types/labels,
  paginated list repository, status/source/assignment filters, responsive list.
  Do not include broad text search unless limited scope is approved.
- **PR4.2B2 — Detail Workspace:** scoped detail query, request/customer/property/
  assignment cards, bounded history, linked quotes, partial/error states.
- **PR4.2B3 — Quote integration and deep links:** fix quote opportunity mapping,
  add opportunity prefill, bind workspace, add detail CTA and dashboard deep
  links. Keep status transitions out unless separately approved.
- **PR4.2B4 — Tests and refinement:** repository/RTL/security/E2E coverage,
  accessibility, 320px layout, stale auth-helper correction, documentation and
  full validation.

## Commands run

- `sed` over the supplied PR4.2A specification, relevant migrations, source,
  tests, and documentation
- `rg` for routes, opportunity/customer/property types, schema objects, indexes,
  RLS, status transitions, quote linkage/prefill, notes, photos, attachments,
  activity, assignment, and test patterns
- `find app` for the exact App Router route/layout tree
- `rg --files` for reusable UI, data, test, and documentation files
- `git status --short` to preserve the existing uncommitted PR4.1 state

## Files inspected

The exact high-value files are listed in section D. The audit also inspected all
App Router page/layout paths, all opportunity references outside dependencies,
photo-related migrations/helpers/components, quote flow/storage mapping, repair
prefill, organization member/audit helpers, Vitest/Playwright configuration, E2E
auth helpers, Marketplace schema/ingestion docs, and both Marketplace SQL
validation scripts.

## Validation performed and blockers

This was a read-only architecture audit except for this documentation file. No
application code, migration, production behavior, database, or external service
was changed. Findings were cross-checked among TypeScript row contracts, SQL
schema/constraints/policies, ingestion projection, current application queries,
and existing tests/docs.

No build or test run was necessary because no executable code changed. Database
behavior was not executed: the repository has no `supabase/config.toml`, seeded
auth fixtures, or local database integration runner. That is the only validation
infrastructure blocker. E2E opportunity/security validation also requires
configured Supabase and seeded cross-workspace fixtures.
