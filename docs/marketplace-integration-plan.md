# Marketplace Integration Implementation Plan

Status: proposed  
Date: 2026-07-25

## Delivery principles

- Keep each pull request deployable with integration disabled.
- Use additive migrations and expand/migrate/contract.
- Put domain mutation and event creation/processing in one database transaction.
- Add RLS before grants and test anon, unrelated user, member, admin, and integration-server behavior.
- Preserve direct/manual quote creation throughout.
- Do not begin an endpoint PR until Marketplace contract questions in the audit are resolved.

## First vertical slice

`Marketplace lead assigned → event received → customer/property/opportunity created → vendor sees opportunity → vendor generates quote → quote sent → homeowner accepts → acceptance event available to Marketplace`

“Available” means durably written to the Vendor OS outbox and queryable/deliverable under the agreed integration mechanism. Delivery acknowledgement can be a later PR if Marketplace endpoints are not ready.

## PR 1 — Versioned contracts and fixtures

**Goal:** Establish compile-time/runtime v1 event contracts and compatibility rules without network or database changes.

**Implementation status:** Implemented at the application-contract layer in `lib/integrations/events/`; not deployed as a Marketplace API.

**Likely files:** `lib/integrations/events/envelope.ts`, `lib/integrations/events/v1/*.ts`, `lib/integrations/events/registry.ts`, colocated tests, documentation updates.

**Database changes:** None.

**API changes:** None.

**Tests required:** Valid fixture per event; invalid UUID/timestamp/version/source; wrong payload for type; metadata PII-shaped object/nesting rejection; unsupported type/version; strict unknown-key behavior.

**Dependencies:** Marketplace confirms identifiers, required assigned-lead fields, timestamps, and field ownership.

**Risks:** Freezing guessed Marketplace details. Mitigate by keeping transport/auth out and marking the contract proposed until jointly approved.

**Definition of done:** All 13 requested v1 events parse through a typed registry; invalid or mismatched contracts fail predictably; no sensitive data appears in metadata fixtures.

## PR 2 — Additive integration and opportunity schema

**Goal:** Create the tenant-safe persistence foundation.

**Implementation status:** Implemented by `supabase/migrations/020_marketplace_persistence_foundation.sql`, with catalog validation and a documented role-based RLS procedure. No legacy backfill or integration transport is included.

**Likely files:** one monotonic `supabase/migrations/020_*.sql` (or next verified production number), schema/RLS test scripts, `lib/supabase/types.ts` or generated-type workflow decision.

**Database changes:** Add `organizations.marketplace_vendor_id`; add `integration_events`, `customers`, `properties`, `opportunities`, `opportunity_status_history`; add nullable `quotes.opportunity_id`; add constraints, indexes, updated-at triggers, and RLS. No destructive backfill.

**API changes:** Internal SQL functions only: safe opportunity transition and event state operations. No public webhook.

**Tests required:** Migration applies cleanly; unique external IDs; cross-tenant FK rejection; personal versus organization RLS; no browser integration-event mutation; status/history atomicity; replay uniqueness.

**Dependencies:** PR 1 and identifier/tenant decisions.

**Risks:** Security-definer mistakes, duplicate migration numbering, tenant mismatch, policy recursion. Test every role and fix `search_path`/grants explicitly.

**Definition of done:** Existing quote flows still work; new tables are inaccessible cross-tenant; rollback is documented as feature disable/forward fix.

## PR 3 — Idempotent lead-assignment ingestion

**Goal:** Receive one signed `marketplace.lead.assigned` v1 event and atomically project it.

**Likely files:** `app/api/integrations/marketplace/events/route.ts`, `lib/integrations/marketplace/auth.ts`, `lib/integrations/inbox.ts`, a migration adding `process_marketplace_lead_assigned`, tests.

**Database changes:** Transactional RPC/function that locks/deduplicates receipt, resolves `marketplace_vendor_id`, upserts customer/property by immutable external IDs, creates exactly one opportunity, writes initial history, and marks receipt processed.

**API changes:** New server-only POST webhook. Enforce signature/replay window, content type, size, exact schema, observability correlation ID, and stable duplicate responses. Do not log payloads.

**Tests required:** Valid receipt; duplicate sequential/concurrent receipt; bad/missing/expired signature; unknown organization mapping; unsupported version; malformed/oversized payload; transaction rollback; PII redaction; no service credential in client bundle.

**Dependencies:** Marketplace authentication/signature contract and PR 2.

**Risks:** Forgery/replay, duplicate projections, partial PII writes, response ambiguity. Endpoint remains feature-gated until joint test.

**Definition of done:** One valid event creates one scoped customer/property/opportunity/history set; replay creates nothing; failure is durable/actionable without exposing PII.

## PR 4 — Opportunity repository and vendor inbox

**Goal:** Let assigned organization members see and open their opportunities.

**Likely files:** `lib/opportunities/types.ts`, `lib/opportunities/api.ts`, `lib/opportunities/store.ts`, `lib/supabase/opportunities-realtime.ts`, `components/opportunities/*`, `app/opportunities/page.tsx`, navigation.

**Database changes:** Possibly a narrow transition RPC for `new → opened` that writes history and an outbound event atomically.

**API changes:** Authenticated reads use Supabase RLS; transition uses RPC/Route Handler depending on final auth boundary.

**Tests required:** Empty/loading/error states; tenant isolation; Realtime insert/update; reconnect reconciliation; opened transition idempotency; role behavior; accessibility/mobile.

**Dependencies:** PR 3.

**Risks:** Reusing the global `IncomingRepairRequests` pattern would leak assignments. Build against opportunities, not `repair_requests`.

**Definition of done:** Only assigned organization members see the opportunity; opening produces one history row and one `opportunity.opened` outbox event.

## PR 5 — Generate and persist a quote for an opportunity

**Goal:** Reuse the current AI/Photo Vision flow while keeping explicit opportunity provenance.

**Likely files:** `components/quote-flow/QuoteFlow.tsx`, `lib/quotes/types.ts`, `lib/supabase/types.ts`, `lib/supabase/migrate-local.ts`, opportunity-to-form mapper, quote/store tests.

**Database changes:** Transactional quote-start/create association function if required; workspace consistency trigger; outbox events for `quote.started` and `quote.generated`.

**API changes:** Extend quote generation/persistence input with `opportunityId`; validate membership and association server-side. Existing direct `/quote` path keeps it optional.

**Tests required:** Marketplace opportunity prefill; direct quote unchanged; wrong-tenant opportunity rejected; quote/opportunity link persisted; failed generation behavior; event idempotency; photos remain in Storage and out of events.

**Dependencies:** PR 4.

**Risks:** Current browser upsert cannot atomically publish. Route quote creation through a transaction boundary for opportunity quotes rather than adding a second loose write.

**Definition of done:** Vendor generates a linked quote from an opportunity, while direct/manual creation passes existing unit/e2e tests.

## PR 6 — Transactional quote send and acceptance outbox

**Goal:** Make send/view/change/accept lifecycle changes reliably publishable, with acceptance available to Marketplace.

**Likely files:** existing quote share/public Route Handlers, new quote lifecycle RPC migration, `lib/integrations/outbox.ts`, contract fixtures/tests.

**Database changes:** Extend/replace RPCs so state transition, audit entry, opportunity transition, optional job creation decision, and outbox insert are atomic. Add explicit persisted `expires_at`/revision number only if agreed. Repair organization-aware acceptance/change-request reads.

**API changes:** Preserve public response shapes. Share token and signatures never enter events. Add a server-only outbox read/lease operation for the delivery mechanism.

**Tests required:** send/view/accept idempotency; expired quote rejection; concurrent acceptance; organization teammate visibility; exactly one event; transaction rollback; direct quote behavior (no Marketplace destination, but domain event policy explicit); PII redaction.

**Dependencies:** PR 5 and revision/job semantics.

**Risks:** Editing mature public RPCs, duplicate acceptance, email/event partial failures. Keep email outside the state transaction but drive it from durable work if practical.

**Definition of done:** A homeowner acceptance updates the quote once and creates one valid `quote.accepted` outbound event in the same transaction; Marketplace can retrieve/deliver it through the agreed protected mechanism.

## PR 7 — Outbox delivery, retries, and operational visibility

**Goal:** Reliably deliver Vendor OS facts to Marketplace.

**Likely files:** worker/function entry point, `lib/integrations/delivery.ts`, admin diagnostics UI/API, deployment configuration/runbook.

**Database changes:** Lease/claim RPC if necessary; retry/dead-letter fields finalized.

**API changes:** Marketplace delivery call or protected pull endpoint, exactly as jointly specified.

**Tests required:** success acknowledgement, timeouts, 4xx/5xx policy, exponential retry with jitter, concurrent worker lease, crash recovery, dead-letter/redrive, secret redaction.

**Dependencies:** Marketplace endpoint/SLA and hosting choice.

**Risks:** Duplicate remote processing and stuck leases. Preserve event ID across retries; require Marketplace idempotency.

**Definition of done:** Acceptance and other events reach a test Marketplace receiver with observable retries and no duplicate logical outcome.

## PR 8 — Reconciliation APIs and monitoring

**Goal:** Detect and repair missed/out-of-order events and mapping drift.

**Likely files:** reconciliation Route Handlers/client, cursor models, scheduled worker, metrics/runbook.

**Database changes:** Watermark/checkpoint table only if the agreed protocol needs it.

**API changes:** Bounded, paginated, authenticated reconciliation by updated cursor/entity UUID; no invented bulk endpoint.

**Tests required:** pagination, cursor replay, drift detection, missing entity, conflicting canonical field, rate limit, partial failure.

**Dependencies:** Marketplace reconciliation contract.

**Risks:** Reconciliation accidentally becoming unrestricted replication. Apply field ownership and bounded scopes.

**Definition of done:** A deliberately dropped event is detected and repaired without overwriting locally canonical fields.

## PR 9 — Controlled repair-request/direct-quote migration

**Goal:** Normalize useful legacy data without inventing provenance or breaking manual quotes.

**Likely files:** resumable SQL/backfill script, dry-run report, mapping tests, operations runbook.

**Database changes:** Transitional `repair_request_id` mapping if approved; synthetic history explicitly tagged `migration`.

**API changes:** None.

**Tests required:** dry run, repeat run idempotency, ambiguous duplicates, malformed JSON/data URLs, counts/checksums, rollback/exception report.

**Dependencies:** Stable production usage and retention decisions.

**Risks:** Merging different homeowners by email, corrupting snapshots, loading large photo JSON. Never email-dedupe and never rewrite quote JSON.

**Definition of done:** Approved active rows are linked with auditable counts; ambiguous rows remain untouched; direct quotes still work.

## Recommended first implementation PR

Start with **PR 1 — Versioned contracts and fixtures**, after Marketplace confirms the identifier and assigned-lead payload questions. It is the smallest reversible change, exposes disagreement before schema/API commitments, and supplies fixtures used by every later PR.

If the teams need a deployable product slice rather than a single review, PRs 1–6 together are the minimum first vertical slice.
