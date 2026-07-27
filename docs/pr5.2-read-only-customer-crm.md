# PR5.2 Read-Only Customer CRM

Status: implemented application slice; no database migration

## Architecture and query strategy

`lib/customers/repository.ts` is the authenticated browser repository. Every
customer/property/opportunity/quote read applies the active personal or
organization workspace before application mapping; database RLS remains the
authoritative boundary. Customer Detail returns null for an invalidly scoped
record, so hidden and missing customers share the same UI.

The directory uses `updated_at DESC, id DESC` cursor pagination. Search remains
in component state and never enters the URL. It performs bounded, scoped
customer-contact and associated-property searches, merges unique results, and
then enriches the page with bulk property, opportunity, and quote queries.
There are no per-customer relationship queries. Aggregate queries are capped;
partial failures keep core customer rows visible with unavailable counts and a
warning.

Detail first reads the scoped customer, then loads bounded properties and
opportunities in parallel. Quote and history reads use the resulting trusted
opportunity IDs. Independent failures produce section-level or timeline
warnings rather than hiding core customer identity.

## Timeline and linked quote behavior

The customer timeline is a bounded in-memory merge of authoritative
opportunity creation/status/assignment, quote creation/share state,
acceptances, and change-request timestamps. Typed source IDs prevent duplicate
events and ordering is deterministic by timestamp then ID. Raw integration
payloads, signatures, IP addresses, access instructions, and UUID labels are
not rendered.

Linked quotes means only quotes connected through customer opportunities.
Copy explicitly states that legacy or direct unlinked quotes may be absent.
PR5.2 does not calculate lifetime value or label accepted quote value as
revenue.

## Workspace, accessibility, responsive, and security behavior

Directory and Detail request identity includes authenticated user, active
workspace, customer/search/cursor state as applicable. Workspace changes remount
directory state, clear search/cursors, hide prior data immediately, and ignore
late requests. Detail likewise renders only state matching its current request
key. Personal mode receives equivalent records while omitting team assignment
copy.

The pages use one visible H1, labeled search, explicit live result count,
keyboard links and Load more control, logical section headings, semantic
timeline lists, associated loading/error/empty states, text source/status
labels, and practical 44px targets. Cards, contact data, addresses, status
badges, and timeline metadata wrap at phone widths without introducing a
desktop-only table.

No service role, mutation, entitlement check, raw database error, client role
authorization, customer/property transfer, Marketplace reconciliation, or new
top-level navigation was added.

## Tests and known limitations

Focused repository, formatter, directory card, timeline, and rapid
workspace-switch tests cover scoping, search, cursor ordering, bulk aggregates,
partial failures, safe labels, and stale-response rejection. Environment-gated
Playwright checks cover PII-free URL search, safe invalid/not-found behavior,
and 320/375/tablet/desktop overflow when disposable credentials exist.

Current limitations:

- search uses bounded `ILIKE` queries without new normalization/search indexes;
- phone matching is best-effort because stored phone values are not normalized;
- the directory result count is the currently loaded count, not a costly global
  search total;
- aggregate bulk reads cap at 500 related rows per page;
- quotes without an opportunity link are intentionally absent;
- no property detail route was added, so property cards are non-linked;
- organization acceptance/change-request RLS may make those timeline sources
  partial for teammates who did not create the quote;
- no customer editing, creation, archive, merge, notes, tasks, attachments,
  export, tier gating, AI, or automation exists.

The recommended PR5.3 is a separately approved data-hardening and
edit/archive slice: decide field ownership and archive semantics first, then
add narrow audited mutations and any query-plan-proven indexes.
