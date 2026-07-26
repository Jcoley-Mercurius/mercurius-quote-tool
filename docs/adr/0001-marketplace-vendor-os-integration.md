# ADR 0001: Marketplace and Vendor OS Integration Foundation

- Status: Proposed
- Date: 2026-07-25
- Decision owners: Mercurius Marketplace and Vendor OS engineering

## Context

The Quote Tool currently stores proposals in `public.quotes`, with customer/property input and generated results embedded in JSONB. A public `repair_requests` intake can prefill a quote, but it has no vendor assignment, tenant-safe lead ownership, durable relationship to the resulting quote, or cross-system delivery mechanism.

The future lifecycle spans two systems with different responsibilities. Marketplace owns discovery, requests, matching, assignments, public profiles, entitlements, and reviews. Vendor OS owns vendor operations, customers/properties, opportunities, quotes/revisions, jobs, and follow-up. Direct/manual quoting must continue without Marketplace provenance.

Network delivery is fallible and duplicated webhook delivery is normal. Supabase Realtime is a transient UI mechanism, not a cross-system integration log. Email cannot serve as identity, and a quote cannot safely represent a lead, operational pipeline record, and fulfillment job simultaneously.

## Decision

### Opportunity is the central vendor workflow record

Vendor OS creates one opportunity for an operational sales/work request. A Marketplace assignment references it through immutable UUIDs. Quotes belong to an opportunity; an accepted quote may later create a job. Direct/manual flows create an `origin = direct` opportunity or temporarily retain a nullable `quotes.opportunity_id` during migration.

### Integration events are versioned facts

Events use a validated envelope with `eventId`, `eventType`, `eventVersion`, `occurredAt`, `sourceSystem`, `organizationId`, optional actor, entity references, bounded non-sensitive metadata, and event-specific data. Breaking contract changes create a new version. Events describe completed facts, not generic remote row mutations.

### Webhook processing is idempotent

Inbound events are uniquely identified by `(sourceSystem, eventId)`. Receipt, validation, organization mapping, projection, and processing outcome are durable. Replays return the prior outcome and never duplicate customers, properties, opportunities, or status-history entries.

### Synchronization is event-driven with reconciliation APIs

State-changing transactions insert outbound events into an outbox in the same transaction. A worker delivers them with retries. Inbound events project in a transaction with their inbox record. Reconciliation APIs/cursors compare canonical records and repair missed or permanently failed delivery; they do not replace event delivery.

### Cross-system UUIDs are immutable

Canonical owners generate UUIDs once. The other system stores them as external references with unique constraints. Email, phone, share tokens, display names, and mutable business identifiers are never identity keys. Attempts to change a mapped external UUID are rejected and audited.

### Canonical field ownership is explicit

Marketplace-canonical and Vendor-OS-canonical fields are mapped field-by-field. Shared projections never apply whole-row last-write-wins updates. Marketplace can seed operational customer/property data, while Vendor OS owns opportunity, quote, and job workflow fields. Conflicts are surfaced for reconciliation.

### Direct/manual quotes continue

Marketplace identifiers remain nullable. Existing personal and organization workspaces remain supported. The migration is additive, existing quote snapshots remain readable, and manual quote creation does not require a Marketplace account or event.

## Alternatives considered

### Use `quotes` as lead, opportunity, and job

Rejected. It conflates assignment, sales workflow, proposal revision, and fulfillment lifecycles; prevents multiple quotes/revisions; and makes direct quoting/provenance ambiguous.

### Synchronous Marketplace API calls only

Rejected. Vendor actions would depend on Marketplace availability and would produce ambiguous partial failures. It also provides no durable local retry record.

### Webhooks without durable inbox/outbox

Rejected. Retries could create duplicate opportunities, and committed Vendor OS state could be lost before publication.

### Supabase Realtime as the integration bus

Rejected. Realtime is appropriate for connected UI refresh, but it is not a versioned, acknowledged, replayable cross-system contract.

### Shared database or iframe embedding

Rejected. Either approach collapses ownership/security boundaries, couples deployments, and does not create a robust integration contract.

### Email as homeowner/vendor identity

Rejected. Email is mutable, may be shared, is PII, and cannot safely represent assignment or tenancy.

### Polling only

Rejected as the primary mechanism because it increases latency and load. A bounded reconciliation/pull API remains necessary as a repair path.

### Separate inbound and outbound tables

Viable. A single `integration_events` table is proposed initially to match the requested schema and centralize retention/inspection, with explicit direction and state. Split inbox/outbox tables later if access patterns, volume, or retention diverge.

## Benefits

- Clear ownership and lifecycle boundaries.
- Multiple proposals/revisions and later jobs can relate to one opportunity.
- Duplicate delivery becomes safe and observable.
- Marketplace downtime does not block committed Vendor OS operations.
- Reconciliation makes eventual consistency repairable.
- Existing direct quote behavior and Supabase tenancy patterns survive.
- UUID references and field ownership reduce accidental identity merges.

## Tradeoffs

- Eventual consistency means systems may temporarily disagree.
- An outbox worker, retries, monitoring, dead-letter handling, and reconciliation add operational complexity.
- Versioned contracts require disciplined compatibility and coordinated rollout.
- Normalizing customer/property data requires careful, incomplete backfill.
- Existing browser-driven mutations must move behind transactional boundaries before they can reliably emit events.
- One event table carries both operational payloads and delivery state; access and retention need care.

## Consequences

- New Marketplace assignments must not be written directly to `quotes` or exposed through global `repair_requests` RLS.
- Quote lifecycle publication must occur from database mutation boundaries, not scattered React handlers.
- `quotes.opportunity_id` starts nullable and is indexed; later enforcement depends on migration success.
- Customer/property records become operational entities while quote JSON remains a historical snapshot.
- Opportunity transitions append history in the same transaction as the current status update.
- Browser clients cannot write integration delivery state. Webhook credentials/signing secrets stay server-side.
- Entitlements must enter through a centralized capability boundary once Marketplace defines the contract.
- RLS and security-definer functions require dedicated database integration tests before production.

## Migration strategy

1. **Decide contracts:** confirm IDs, tenant mapping, field ownership, webhook authentication, retention, revision semantics, and reconciliation.
2. **Expand:** add nullable organization mapping and quote FK; add RLS-protected integration, customer, property, opportunity, and history tables.
3. **Contract tests:** implement Zod v1 schemas and fixtures before exposing an endpoint.
4. **Inbound slice:** add a signed webhook Route Handler and one transactional idempotent lead-assignment projection.
5. **Vendor UI:** show opportunities and generate a quote associated with one, while preserving `/quote` direct creation.
6. **Outbound slice:** move send/view/accept mutations behind transactions that also insert outbox events.
7. **Delivery and reconciliation:** deliver acceptance events with retry, observability, and a Marketplace-agreed repair API.
8. **Backfill:** create normalized records/opportunities only for confidently linked active data. Label synthetic history as migration-generated.
9. **Jobs/revisions:** introduce separately after semantics are agreed.
10. **Contract phase:** only after measured adoption consider stronger constraints; do not delete legacy snapshots as part of rollout.

Application rollback disables integration routes/consumers and restores legacy reads. Additive data remains. Database rollback is forward-fix by default; destructive down migrations are not used on populated production tables.

