# Opportunity Workspace

## Final PR4.2 feature overview

PR4.2B1 replaces the `/opportunities` placeholder with a read-only operational
list. It supports personal and organization workspaces, exact counts, bounded
pagination, responsive cards, and database-backed filters. It does not add a
detail workspace, status or assignment mutations, text search, quote prefill, or
Business Command Center deep links.

PR4.2B2 adds the read-only `/opportunities/[id]` workspace and enables list-card
links to it. Detail includes request, customer, property, assignment, bounded
status history, and bounded linked quote context.

PR4.2B3 connects that detail workspace to the existing quote builder through
`/quote?opportunityId=<uuid>`, persists the existing quote-to-opportunity
relationship, and deep-links Business Command Center opportunity rows.

PR4.2B4 adds final accessibility refinements, responsive and security regression
coverage, environment-aware Playwright scenarios, and release validation. It
does not add product behavior.

Routes:

- `/command-center` — recent opportunity deep links
- `/opportunities` — filtered and paginated operational list
- `/opportunities/[id]` — read-only detail workspace
- `/quote?opportunityId=<uuid>` — workspace-bound opportunity prefill
- `/quote?quoteId=<id>` — authoritative stored quote edit/view mode
- `/quote?repairRequestId=<id>` — existing repair-request prefill
- `/quote/[token]` — unchanged public quote route

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
- photos, attachments, and internal notes
- customer and property detail pages
- messaging, scheduling, and job conversion

No migration or environment variable is added by B1, B2, or B3.

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

## Opportunity-to-quote integration

Opportunity detail provides a real Create Quote link using the encoded
opportunity ID. Quote route parameters use explicit precedence: `quoteId`,
`opportunityId`, `repairRequestId`, then blank creation. Therefore, a stored
quote opened for editing is authoritative and cannot be silently relinked by an
additional opportunity parameter.

Opportunity prefill reuses `fetchOpportunityDetail` with the authenticated user
and trusted active workspace. Invalid, missing, cross-workspace, and RLS-hidden
IDs never fall through to a blank quote. Repository errors use a separate safe
message.

The pure adapter prefills:

- explicitly recognized service codes
- operational description, with opportunity title fallback
- structured property address and postal code

Unsupported service values leave service selection empty for the vendor to
choose. Customer fields are not added, photos remain empty, and Marketplace
budget or snapshot data never becomes quote form pricing.

Opportunity-originated quotes are locked to the active workspace that
successfully loaded the opportunity; the ordinary save-target selector is not
shown. `SavedQuote.opportunityId` maps bidirectionally to
`quotes.opportunity_id`. Existing null or missing linkage remains compatible,
and edits spread the stored model so linkage is preserved without requiring the
URL parameter.

No action in B3 changes opportunity status. Viewing, starting, generating, and
saving a quote do not call the opportunity transition function. Public quote
routes and blank/repair-request creation remain unchanged. Recent populated
Business Command Center opportunities now link to `/opportunities/[id]`, while
list-level links remain `/opportunities`.

Deferred beyond PR4.2:

- status and assignment mutations
- photos, attachments, internal notes, messaging, scheduling, and job conversion
- customer/property detail pages

## Accessibility and responsive behavior

The flow uses one page `h1`, logical section headings, native labeled selects,
semantic definition lists and timeline lists, textual status/source labels,
real links, labeled pagination navigation, disabled native pagination buttons,
and accessible loading/error states. Opportunity cards, back links, and Create
Quote links have visible keyboard focus.

The opportunity quote context is an explicitly labelled complementary region.
Mobile navigation traps focus, closes on Escape or backdrop selection, and
returns focus to the opening control. Drawer controls and primary actions meet
the approximately 44px touch-target goal and use visible focus rings.
Opportunity skeletons honor reduced-motion preferences.

List cards and detail sections stack without horizontal tables. Long customer
contact details, addresses, descriptions, currency values, and context copy use
wrapping-safe layouts. Playwright checks document overflow at 320px and a
standard phone viewport.

## E2E fixture requirements

Playwright never embeds credentials or uses a service-role key. Authentication
tests require:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

The account should be a normal authenticated vendor in a disposable or staging
Supabase project. Optional seeded coverage uses:

- `E2E_OPPORTUNITY_ID` — visible opportunity on the first all-status page,
  preferably with supported service and complete context
- `E2E_DIRECT_OPPORTUNITY_ID` — visible direct opportunity
- `E2E_CROSS_WORKSPACE_OPPORTUNITY_ID` — real opportunity hidden from the
  active workspace
- `E2E_LINKED_QUOTE_ID` — visible quote linked to `E2E_OPPORTUNITY_ID`
- `E2E_PUBLIC_QUOTE_TOKEN` — valid seeded token used to verify the public route

The quote-save scenario is skipped unless `E2E_ALLOW_MUTATIONS=true`. Enable it
only against disposable test data; it generates a linked quote through ordinary
authenticated browser access. Missing credentials or fixture IDs produce
explicit Playwright skips, not fabricated passes.

## Release validation notes

PR4.2 adds no migration, dependency, API route, environment requirement, or
service-role access. It does not modify the public quote route or call
`transition_opportunity`. Workspace identity never comes from opportunity URL
parameters.

Known unrelated baseline diagnostics remain in:

- ESLint: `QuoteResult.tsx`, `SendQuoteModal.tsx`, `SetupChecklist.tsx`, and
  `VendorProfileNudge.tsx`
- standalone TypeScript test fixtures: `public-quote.test.ts` and
  `vendor-snapshot.test.ts`

These files are outside PR4.2 and remain unchanged by B4.

## Manual release checklist

- Login redirects to `/command-center` and the Vendor Workspace loads.
- Personal and organization Opportunities lists reload with scoped records.
- Status, source, and assignment filters serialize safely and reset page 1.
- Previous/Next states, count copy, filter preservation, and page clamping work.
- List cards open detail and browser Back preserves the prior list URL.
- Invalid, nonexistent, and cross-workspace IDs show the same not-found state.
- Marketplace context is allowlisted and budget copy is homeowner-provided.
- Direct opportunities omit Marketplace-only context.
- Missing customer, property, assignee, description, history, and quotes use
  honest fallbacks.
- Create Quote prefills supported service, description, address, and ZIP.
- Unsupported service codes require manual selection.
- Opportunity quote workspace is locked and no alternate target is offered.
- Saved quote appears under Linked Quotes after returning to detail.
- Linked quote edits preserve linkage without `opportunityId` in the URL.
- Conflicting parameters follow quote → opportunity → repair → blank precedence.
- Business Command Center populated opportunity rows open detail.
- Blank, repair-request, linked-edit, and public quote routes still work.
- Quotes, Team, and Settings navigation still works.
- Mobile drawer traps focus, closes with Escape, and restores focus.
- List, detail, Create Quote, and context banner have no horizontal overflow.
- Keyboard focus is visible and raw payloads/internal IDs never appear.
