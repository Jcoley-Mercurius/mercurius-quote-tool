# Marketplace Persistence Foundation

Status: implemented schema foundation; no ingestion or delivery  
Migration: `supabase/migrations/020_marketplace_persistence_foundation.sql`

## Additive schema

Migration `020` adds nullable `organizations.marketplace_vendor_id`, nullable `quotes.opportunity_id`, and five tables: `integration_events`, `customers`, `properties`, `opportunities`, and `opportunity_status_history`. It does not backfill or rewrite quotes, repair requests, or JSON snapshots.

External identifiers use scoped partial unique indexes and are never inferred from email, phone, name, or address. Database triggers prevent changing a record’s workspace, changing an opportunity’s origin, and replacing or clearing an external UUID after it is set. Cross-workspace customer/property/opportunity/quote links and invalid assignees fail at the database boundary.

`organizations.marketplace_vendor_id` is nullable and globally unique when present. Authenticated clients have only column-level organization UPDATE permission for `name`, so they cannot set the mapping. A future narrowly authorized server function may set a null mapping. Once set, the trigger makes the UUID immutable; an exceptional correction requires an explicitly reviewed administrative migration or replacement function.

## Integration events and retention

`integration_events` is a combined durable inbox/outbox with unique `(source_system, event_id)`, JSON shape constraints, non-negative attempts, inbound/outbound availability indexes, and organization/type/time lookup. Organization deletion is restricted while events refer to it.

Event records are retained for 12 months initially. This migration intentionally adds no deletion, archival, lease, retry, or retention function. A later server-owned retention job must delete/archive eligible records without exposing payloads. There are no browser table privileges or RLS policies, so anon and authenticated clients cannot read or mutate payloads.

## Operational RLS

- Personal customers, properties, and direct opportunities are readable/writable only by their owning `user_id`.
- All organization members can read, create, and update organization customer/property operational records.
- All organization members can read organization opportunities and create direct opportunities in `new` status.
- Marketplace opportunity insertion is not available through browser RLS.
- Members may assign opportunities to themselves. Owners/admins may assign to organization members.
- There are no browser hard-delete policies or grants for customers, properties, or opportunities.
- History is readable with its parent opportunity and has no browser mutation policies/grants.
- Full integration events have no browser access.

Normal opportunity status updates are blocked by a trigger. `transition_opportunity` locks the record, authorizes the caller, applies one allowed transition, updates lifecycle timestamps, and appends exactly one history row transactionally.

## Transition matrix

| From | To | Who |
| --- | --- | --- |
| `new` | `opened`, `declined` | Personal owner or organization member |
| `opened` | `quoting`, `declined` | Personal owner or organization member |
| `quoting` | `quoted`, `declined` | Personal owner or organization member |
| `quoted` | `won`, `lost` | Personal owner or organization member |
| `new`, `opened`, `quoting`, `quoted` | `closed` | Personal owner or organization owner/admin |

Duplicate transitions, unsupported edges, and transitions out of terminal states fail predictably. The function does not emit integration events or create jobs.

## Rollback and verification

Rollback is feature disable plus forward fix. The migration is expand-only and has no destructive down migration. Existing quotes remain valid with null `opportunity_id`, and existing organizations require no Marketplace mapping.

Catalog validation lives at `supabase/tests/020_marketplace_persistence_validation.sql`; role-based verification is documented in `docs/testing/marketplace-schema-rls.md`.

## Decisions before PR 3

- Webhook authentication/signature and replay-window contract.
- The narrow server credential/RPC boundary for inserting inbound events and atomically projecting assignments.
- Exact retention-job hosting and archival destination (needed before the 12-month deadline, not for ingestion).
- Error redaction rules and stable duplicate webhook response semantics.
- Final field mapping for the immutable opportunity `source_snapshot`.
