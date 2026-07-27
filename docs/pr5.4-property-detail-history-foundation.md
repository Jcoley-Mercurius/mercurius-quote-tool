# PR5.4 Property Detail and Property History Foundation

Status: implemented; disposable database/browser validation remains required

## Database audit and migration

Before PR5.4, `properties` contained workspace/customer/Marketplace IDs,
address fields, ISO-like two-letter country code, bounded coordinates,
object-shaped `property_data`, `notes`, sensitive `access_instructions`, tags,
and database timestamps. It had scoped Marketplace uniqueness, workspace and
customer indexes, personal/current-member RLS, authenticated
SELECT/INSERT/UPDATE without DELETE, `set_updated_at`, same-workspace customer
validation, and immutable workspace/Marketplace-field protection.
`customer_id` was nullable with `ON DELETE SET NULL`; no multi-contact model
existed.

Migration `025_property_detail_history_foundation.sql` adds no property
columns. It adds narrow append-only `property_audit_history`, a guarded
`update_property` RPC, and a trigger that rejects ordinary table updates.
Personal audit rows use `user_id`; organization rows use `organization_id`.
No fabricated organization is used.

## Repository and route

`lib/properties/repository.ts` is a dedicated authenticated detail repository.
It first loads one property under explicit active-workspace scope and RLS,
then performs bounded grouped reads for the associated customer, property
opportunities, opportunity-linked quotes, status/assignment history,
acceptances, change requests, and property audit events. Secondary failures
produce section-level or incomplete-history states without hiding core
property information. Missing, malformed, hidden, removed-member, and
cross-workspace records share safe not-found behavior.

`/properties/[id]` presents overview, formatted address, associated customer,
allowlisted attributes, tags, summary, private access instructions, factual
relationship indicators, linked opportunities and quotes, Marketplace
provenance, management actions, and Recorded property history. Customer Detail
property cards link here without selecting or displaying access instructions.

## Editing, concurrency, and protected fields

The accessible edit dialog supports address lines, city, region, postal code,
country code, the existing notes field as one operational summary, private
access instructions, tags, and allowlisted structured attributes. Latitude
and longitude remain protected because no existing product flow provides
reliable manual coordinate input.

The RPC derives `auth.uid()`, verifies personal ownership/current organization
membership, locks the property, compares expected `updated_at`, validates
lengths/country/tags/attribute shapes, merges approved attributes without
deleting unknown source JSON, updates via the guarded boundary, and audits
field categories in one transaction. Property/workspace/customer/Marketplace
IDs, timestamps, coordinates, provenance, and unknown source data are not
accepted. Stale changes fail without overwrite or retry and offer an explicit
reload.

## Attributes and sensitive information

Only `propertyType`, `yearBuilt`, `stories`, `squareFootage`, `roofType`,
`exteriorType`, and `usage` are rendered or editable. Values are deterministic
strings/numbers; unknown JSON is preserved and hidden. No arbitrary JSON, AI
observation, or unsupported inference is rendered.

Access instructions are fetched only by the single-record Property Detail
projection. They are visually separated, labeled private, collapsed behind a
reveal control, wrapped safely, and excluded from list cards, URLs, logs,
analytics, timeline descriptions, audit metadata, Marketplace behavior, and
duplicate/search responses. Audit history records only the category
`access_instructions`.

## Relationships, history, and indicators

The current customer is labeled “Primary operational customer”; this does not
claim legal ownership, tenancy, billing authority, or exclusivity. Changing
the relationship was intentionally deferred: doing it well needs a separate
same-workspace candidate/confirmation experience and should not be bundled
into basic editing.

Linked opportunities use the existing status/origin labels, property
relationship, assignee labels in organization mode, activity date, and
Opportunity Detail link. Linked quotes include only opportunity-connected
quotes and explicitly do not claim all quotes, completed work, service
history, collected revenue, or jobs.

Recorded property history is a bounded, deduplicated, descending merge of
property creation, curated property audit events, opportunity creation/status/
assignment, linked quote creation/share, acceptance, and change requests. It
never includes raw addresses, coordinates, access instructions, signatures,
IP addresses, source payloads, or UUID labels.

Indicators mean:

- Active opportunities: linked opportunities in the existing active statuses.
- Linked quotes: bounded opportunity-connected quotes.
- Accepted linked quotes: linked quotes with authoritative acceptance/status.
- Latest recorded activity: latest timestamp in the bounded trusted property,
  opportunity, and linked-quote sources.
- Marketplace source: a populated immutable Marketplace property UUID.

“Recorded in Mercurius since” is the earliest property creation, linked
opportunity creation, or opportunity-linked quote creation date. Unlinked
legacy snapshots are excluded.

## Legacy linking and Marketplace boundary

No safe legacy linking UI was added. Existing unlinked quote snapshots do not
provide a deterministic, conflict-free property identity. ZIP, city,
free-text, names, and loose addresses are insufficient and automatic fuzzy
linking is prohibited. A later focused feature may add explicit preview,
confirmation, audit, and reversibility once a trusted candidate contract
exists.

Operational edits do not mutate Marketplace UUIDs/snapshots, synchronize
outward, reconcile records, or establish new canonical ownership rules.

## Security, accessibility, performance, and validation

RLS remains authoritative. No service role, client-controlled workspace,
generic JSON update, raw error display, browser delete, cross-workspace
enumeration, or access-data logging was added. Owners/admins/members share the
current organization behavior; pending/removed/outside users fail the
membership predicate. Personal users receive equivalent behavior without team
concepts.

Request identity contains user, workspace, property, and refresh/version.
Workspace changes unmount editing, hide prior content, and reject late reads.
Reads are bounded and grouped; no per-event/card query or broad scan was added.
Existing property indexes match the single-property and relationship queries,
so no speculative property index was introduced.

The UI uses one heading, logical sections, labeled fields, focus trap/return,
Escape and unsaved-change behavior, live save/conflict announcements,
semantic lists/timeline, non-color-only labels, 44px targets, wrapping grids,
and vertically scrollable dialogs at phone widths.

Focused mutation, customer integration, SQL, and environment-gated Playwright
coverage accompanies the implementation. SQL requires a disposable migrated
Supabase database. Browser scenarios require credentials plus
`E2E_PROPERTY_ID` and associated `E2E_CUSTOMER_ID`.

Known limitations: bounded data can make indicators incomplete; unknown
attributes remain hidden; customer reassignment and legacy linking are
deferred; there is no Property Directory redesign, archive, job/service
history, scheduling, warranties, AI, communications, billing, or automation.

Recommended PR5.5: only the separately approved CRM timeline/notes/task
foundation, with private property information excluded by default.
