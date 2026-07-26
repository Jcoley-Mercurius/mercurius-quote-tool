# Opportunity Workspace

## PR4.2B1 scope

PR4.2B1 replaces the `/opportunities` placeholder with a read-only operational
list. It supports personal and organization workspaces, exact counts, bounded
pagination, responsive cards, and database-backed filters. It does not add a
detail workspace, status or assignment mutations, text search, quote prefill, or
Business Command Center deep links.

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

## UI states and limitations

Loading uses stable skeleton cards. Initial empty, filtered empty, repository
error, valid zero, and partial-record fallbacks render distinctly. B1 cards are
intentionally non-clickable because `/opportunities/[id]` belongs to B2; no
broken detail link is emitted.

Deferred:

- text search and new indexes
- opportunity detail and deep links
- status and assignment changes
- quote creation/prefill
- photos, attachments, and internal notes
- customer and property detail pages
- messaging, scheduling, and job conversion

No migration or environment variable is added by B1.
