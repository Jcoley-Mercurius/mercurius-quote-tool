# Marketplace Lead-Assignment Ingestion

Status: PR 3 inbound ingestion only  
Migration: `supabase/migrations/021_marketplace_lead_assignment_ingestion.sql`

## Endpoint contract

`POST /api/integrations/marketplace/events` accepts only
`marketplace.lead.assigned` version 1 through the strict PR 1 parser. The Node.js
route accepts `application/json` with an optional charset and reads at most 256
KiB of raw bytes before parsing.

Requests require `x-mercurius-timestamp` (Unix seconds) and
`x-mercurius-signature` (lowercase hexadecimal HMAC-SHA256). The signing input
is `<timestamp>.<exact raw request body>`. Timestamps may be at most 300 seconds
old or 300 seconds in the future. Digests use constant-time comparison.

Server-only environment variables are
`MERCURIUS_MARKETPLACE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and
`MERCURIUS_MARKETPLACE_INGESTION_ENABLED`. The existing
`NEXT_PUBLIC_SUPABASE_URL` supplies only the public project URL. Production is
disabled unless the feature flag is explicitly `true` (case-insensitive). An
explicit value other than `true` disables every environment.

| Condition | HTTP | Stable code/status |
| --- | ---: | --- |
| New projection | 200 | `processed` |
| Processed event or compatible repeated lead | 200 | `already_processed` |
| Existing unprocessed event | 409 | `EVENT_PROCESSING` |
| Immutable/workspace conflict | 409 | `PROJECTION_CONFLICT` |
| Invalid signature or timestamp | 401 | `INVALID_SIGNATURE` |
| Invalid JSON or contract | 400 | `INVALID_EVENT` |
| Unsupported type/version | 422 | `UNSUPPORTED_EVENT` |
| Unknown vendor mapping | 422 | `UNKNOWN_MARKETPLACE_VENDOR` |
| Unsupported content type | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Body over 256 KiB | 413 | `PAYLOAD_TOO_LARGE` |
| Disabled | 503 | `INGESTION_DISABLED` |
| Unexpected failure | 500 | `INTERNAL_ERROR` |

## Atomic processing and ownership

`process_marketplace_lead_assigned(jsonb, timestamptz)` is a
fixed-search-path security-definer RPC executable only by `service_role`.
Browser roles retain no access to `integration_events`. The dedicated admin
client is not exported from a shared barrel or used for normal CRUD.

The function resolves `data.marketplaceVendorId` through
`organizations.marketplace_vendor_id`; it never creates an organization. The
signed envelope's `organizationId` must match the resolved organization.
Webhook-created organization customers, properties, and opportunities are
system-owned (`user_id = null`). Migration 021 permits that only for
organization rows; personal rows still require a user. No member is implicitly
selected or assigned.

- A homeowner UUID reuses the scoped customer. Without one, a new customer is
  created for the lead; email and phone are never identity keys.
- A property UUID reuses the scoped property when its customer relationship is
  compatible. Without one, a new property is created; address is never an
  identity key.
- The opportunity starts as unassigned, `origin = marketplace`, `status = new`,
  with immutable lead/request IDs and the service/request fields.
- Initial history uses `from_status = null`, `to_status = new`,
  `source_system = marketplace`, no actor, the inbound event, and `assignedAt`.

The immutable source snapshot contains contract version, Marketplace lead,
request, optional homeowner/property IDs, assignment time, service category,
title, description, preferred timing, budget range, original customer contact,
and structured property values. It excludes headers, signatures, credentials,
photos, prompts, AI data, and errors.

## Idempotency, failures, and privacy

Transaction advisory locks serialize both event ID and lead ID. Unique indexes
remain authoritative for event, scoped homeowner/property, lead, and
event-linked history identity.

- Same event ID returns its prior opportunity.
- A different event ID for the same compatible lead records the later event as
  processed and returns the existing opportunity without another history row.
- Conflicting request, organization, homeowner, or property identity is not
  overwritten.
- A nested subtransaction rolls back partial business projection while retaining
  only a bounded redacted event failure category.

PR 2 requires non-null event organizations, so an unknown vendor cannot be
safely recorded; it returns 422 without rows. A quarantine model would require
a separately reviewed migration.

Validated payloads remain server-only under the approved 12-month retention
policy. Payloads, customer/property details, signatures, and secrets are not
logged or returned. There is no retry worker.

## Operations

Generate a synthetic signature:

```sh
body='{"eventId":"use-a-valid-fixture"}'
timestamp="$(date +%s)"
signature="$(printf '%s.%s' "$timestamp" "$body" |
  openssl dgst -sha256 -hmac 'local-test-secret' -hex |
  sed 's/^.* //')"
curl -X POST http://localhost:3000/api/integrations/marketplace/events \
  -H 'content-type: application/json' \
  -H "x-mercurius-timestamp: $timestamp" \
  -H "x-mercurius-signature: $signature" \
  --data-binary "$body"
```

Use synthetic fixtures only. Inspect event ID/type/state and related IDs through
a protected SQL/admin session; never print payloads. Disable using the feature
flag. Secret rotation requires coordinated sender/deployment change because v1
supports one active secret without overlap.

There is intentionally no manual retry RPC. Diagnose through redacted
`last_error`; a future reviewed operation may reinvoke projection from the
stored validated payload with the same event ID.

