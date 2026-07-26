# Marketplace Persistence RLS Verification

Migration under test: `supabase/migrations/020_marketplace_persistence_foundation.sql`

The repository does not currently contain a Supabase CLI project (`supabase/config.toml`), seeded auth users, or a database integration-test runner. The catalog validation script at `supabase/tests/020_marketplace_persistence_validation.sql` is repeatable after applying migrations. The behavioral procedure below requires a disposable Supabase project or a future local Supabase setup.

## Catalog validation

Apply all migrations through `020`, then execute:

```sh
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file supabase/tests/020_marketplace_persistence_validation.sql
```

The script checks table/column presence, RLS enablement, browser denial for integration events, lack of browser hard-delete/history-insert privileges, organization mapping column protection, and transition-function grants.

## Behavioral fixtures

Create five disposable auth users: unrelated user, personal owner, organization member, organization admin, and organization owner. Create two organizations, with member/admin/owner in the first and the unrelated user in the second. Run requests as each user through PostgREST or by setting the same JWT claims used by Supabase.

Never run these checks against production.

### Customers and properties

1. As personal owner, insert/select/update a personal customer and property with `organization_id = null` and their own `user_id`; expect success.
2. As unrelated user, select/update those rows; expect zero visible rows/no update.
3. As each organization role, insert/select/update records in its organization using its own `user_id`; expect success.
4. As a nonmember, perform the same operations; expect denial/no visible rows.
5. Link an organization property to a customer from the second organization, and link personal records owned by different users; expect `23514`.
6. Set an external Marketplace UUID, then attempt to replace or clear it; expect `22023`.
7. Insert two rows with the same scoped external UUID; expect unique-constraint failure. Confirm duplicate email, phone, name, and address remain allowed.

### Opportunities and history

1. Confirm all three organization roles can read organization opportunities and a nonmember cannot.
2. Insert personal `origin = 'direct'`, `status = 'new'` as its owner; expect success. Try personal `origin = 'marketplace'` or a direct opportunity whose initial status is not `new`; expect constraint/RLS failure.
3. As a member, insert an organization direct opportunity in `new`; expect success. Try browser insertion with `origin = 'marketplace'` or any other initial status; expect RLS failure.
4. Attempt a duplicate `marketplace_lead_id`; expect unique-constraint failure.
5. Assign to a nonmember; expect `23514`. As a member assign to another member; expect `42501`. Assign to self; expect success. As admin/owner assign to a member; expect success.
6. Attempt a direct status update; expect `42501`.
7. Call `transition_opportunity` for every allowed edge and verify one history row with the prior/current status, caller UUID, and `source_system = 'vendor_os'`.
8. Repeat a status or attempt an invalid/terminal transition; expect `22023`.
9. As a member, attempt an active-to-`closed` transition; expect `42501`; admin/owner succeeds.
10. Attempt direct INSERT/UPDATE/DELETE on history and DELETE on opportunities; expect privilege denial.

### Quotes

1. Insert/update an existing-format quote with `opportunity_id = null`; expect success.
2. Link a personal quote to its owner’s personal opportunity and an organization quote to an opportunity in the same organization; expect success.
3. Attempt cross-organization or cross-personal-owner links; expect `23514`.

### Integration events

As anon and each authenticated actor, attempt SELECT, INSERT, UPDATE, and DELETE on `integration_events`; expect privilege or RLS denial in every case. A future integration-server test must use the narrowly approved server boundary introduced by PR 3; this PR intentionally provides no browser-callable insert or state RPC.
