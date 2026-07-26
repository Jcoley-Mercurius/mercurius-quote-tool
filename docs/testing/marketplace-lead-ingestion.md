# Marketplace Lead Ingestion Verification

Never run behavioral fixtures against production.

## Automated application tests

```sh
npm test -- \
  lib/integrations/marketplace/auth.test.ts \
  app/api/integrations/marketplace/events/route.test.ts \
  --pool=threads --maxWorkers=1
```

These tests reuse the PR 1 fixture and cover signature/timestamp behavior,
raw-body signing, restrictions, strict contract routing, feature gating, stable
result mapping, duplicates, and redaction. Only the database boundary is mocked.

## SQL validation

After applying migrations through 021 to a disposable Supabase database:

```sh
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file supabase/tests/021_marketplace_lead_assignment_ingestion_validation.sql
```

The script checks function security/grants and unchanged browser event
privileges. Transaction fixtures verify first projection counts, initial history
linkage, same-event replay, same-lead/different-event reuse, workspace-conflict
rollback with durable redacted failure, and unknown-vendor behavior. Fixtures
are rolled back.

## Additional concurrency and role procedure

The repository has no local Supabase CLI project. Against a disposable project,
run two sessions simultaneously with the same event, then different event IDs
sharing one lead. Verify:

1. One opportunity and one initial history row exist.
2. Each event ID has at most one event row.
3. Both callers resolve the same opportunity; an observed unprocessed event
   returns `EVENT_PROCESSING`.
4. Scoped homeowner/property UUIDs reuse rows.
5. Separate leads with equal email/phone/address and absent external IDs create
   separate customer/property rows.
6. Conflicting immutable identity does not mutate existing records.
7. `anon` and `authenticated` cannot execute the RPC or access event rows.
8. A direct quote with `opportunity_id = null` still succeeds.

Advisory locks and unique indexes enforce these conditions, but this procedure
must run before claiming real database concurrency was tested.

