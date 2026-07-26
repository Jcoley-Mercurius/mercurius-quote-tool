# Opportunity Workspace

## PR4.2B1 and B2 scope

PR4.2B1 replaces the `/opportunities` placeholder with a read-only operational
list. It supports personal and organization workspaces, exact counts, bounded
pagination, responsive cards, and database-backed filters. It does not add a
detail workspace, status or assignment mutations, text search, quote prefill, or
Business Command Center deep links.

PR4.2B2 adds the read-only `/opportunities/[id]` workspace and enables list-card
links to it. Detail includes request, customer, property, assignment, bounded
status history, and bounded linked quote context. Quote creation and prefill
remain deferred to B3.

## Data and security boundary

`lib/opportunities/repository.ts` is the list query boundary. It receives the
authenticated user ID and the trusted `Workspace` already resolved by
`WorkspaceProvider`.

- Organization reads explicitly match `organization_id`.
- Personal reads match `user_id` and require null `organization_id`.
- Existing Supabase RLS independently enforces the same isolation.
- The authenticated browser client is used; no service-role client or new API is
  involved.

The list selects only opportunity ID, summary, service type, origin, status,
assignee ID, and timestamps. Bounded customer and property joins select customer
ID/name and structured address fields. It does not select request description,
source snapshots, Marketplace IDs, webhook payloads, notes, property data, or
attachments.

Organization members are fetched once per list load through the established
member repository and mapped by user ID. The UI shows `Unassigned` for null,
member name/email when known, and `Assigned team member` for an unknown member.
There are no per-row member queries.

## Filters and pagination

The default status filter is Active: `new`, `opened`, `quoting`, and `quoted`.
Terminal opportunities remain available through All statuses or their individual
status filters. Source supports All, Marketplace, Direct, and Repair request.
Assignment supports All, Assigned, and Unassigned.

Filters are validated from URL search parameters. Unknown values fall back to
safe defaults, changing a filter resets to page 1, and filter values never affect
workspace identity.

Results sort by `updated_at DESC`. Each database request uses a page size of 20,
an exact filtered count, and `.range(...)`. The filtered count is resolved before
the list range so oversized page inputs are clamped before becoming offsets. A
separate exact workspace count
distinguishes a genuinely empty workspace from filters with no matches. Invalid
page values become page 1; pages above the final page are clamped and re-read at
the valid bounded range.

## List states and B2 links

Loading uses stable skeleton cards. Initial empty, filtered empty, repository
error, valid zero, and partial-record fallbacks render distinctly. With the B2
route present, populated cards link to their encoded opportunity ID.

Deferred:

- text search and new indexes
- status and assignment changes
- quote creation/prefill
- photos, attachments, and internal notes
- customer and property detail pages
- messaging, scheduling, and job conversion

No migration or environment variable is added by B1 or B2.

## Detail data and workspace boundary

The core detail query combines the route opportunity ID with the trusted active
workspace. Organization reads require the active `organization_id`; personal
reads require the authenticated `user_id` and null `organization_id`. RLS
enforces the same boundary independently. Missing, cross-workspace, and
RLS-hidden records use one not-found experience.

The detail allowlist includes the operational request fields, lifecycle
timestamps, assignee ID, and bounded customer/property joins. Customer notes,
property notes/data/access instructions, integration payloads, and Marketplace
identity UUIDs are neither selected for display nor rendered.

## Marketplace context

Marketplace `source_snapshot` is parsed through a display allowlist. Only
assigned time, service category, request title/details, preferred timing, and a
valid budget range are retained; unknown keys and malformed values are ignored.
The raw object is never rendered.

Budget minor units are converted using the stored ISO currency. Full,
minimum-only, and maximum-only ranges are supported and always labeled
“Homeowner-provided budget range,” never as an estimate or quote. Direct and
repair-request opportunities omit the Marketplace section.

## Timeline, assignment, and linked quotes

`opportunity_status_history` powers a newest-first timeline capped at 25
records. If no history exists, the UI shows one created fallback based on the
opportunity creation time. It never invents assignment or quote events.

Assignment is read-only. Organization members are loaded once for safe
name/email labels; personal ownership uses the authenticated user label.
Unknown assignees show “Assigned team member” and null assignees show
“Unassigned.”

Linked quotes are workspace-scoped, newest-first, and capped at 10. Each result
uses the existing `/quote?quoteId=...` route. History and quote errors remain
section-local so the core opportunity stays visible.

Deferred after B2:

- B3 quote prefill and opportunity-to-quote creation
- status and assignment mutations
- photos, attachments, internal notes, messaging, scheduling, and job conversion
- customer/property detail pages and Business Command Center deep links
