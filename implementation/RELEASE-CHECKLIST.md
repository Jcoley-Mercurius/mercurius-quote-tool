# Release Checklist — Mercurius Quote Tool

## Product
- [ ] Applicable MPS acceptance criteria pass
- [ ] GAP-001 dependent behavior is resolved or disabled
- [ ] GAP-002 dependent behavior is resolved or disabled
- [ ] GAP-003 dependent behavior is resolved or disabled
- [ ] GAP-004 claims are evidence-backed or omitted

## Design
- [ ] Exact Mercurius logo/assets used
- [ ] All approved pages/layouts implemented
- [ ] Loading/empty/error/permission/commercial states covered
- [ ] Mobile/intermediate/desktop review complete
- [ ] Screenshot/reference comparison complete
- [ ] Accessibility automated checks complete
- [ ] Keyboard/focus/manual accessibility review complete
- [ ] MDS deviations documented/approved
- [ ] MDS Gate 8 compliance ready to close

## Technology & Security
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] Production build passes
- [ ] E2E passes
- [ ] Supabase migrations validated
- [ ] Positive RLS tests pass
- [ ] Negative cross-tenant RLS tests pass
- [ ] SECURITY DEFINER grants/search_path/auth checks pass
- [ ] Service-role boundary reviewed
- [ ] Marketplace secret rotated and old secret rejected
- [ ] Private photo/storage behavior verified
- [ ] Payment authority cannot be asserted by browser

## Integrations
- [ ] Marketplace signature/replay tests pass
- [ ] Marketplace duplicate event is idempotent
- [ ] Outbound retries preserve logical event identity
- [ ] Dead-letter/redrive path tested where enabled
- [ ] Reconciliation tested where enabled
- [ ] Resend failure state tested
- [ ] AI fallback tested
- [ ] Vision fallback tested
- [ ] Property/manual fallback tested
- [ ] Payment webhook/reconciliation tested for enabled provider

## Commercial Artifacts
- [ ] PDF matches quote revision
- [ ] Email matches quote revision
- [ ] Origin-sensitive payment language correct
- [ ] Acceptance evidence protected/immutable as required

## Operations
- [ ] Preview environment separated from production side effects
- [ ] Feature flags/kill switches verified
- [ ] Correlation IDs/structured redacted telemetry verified
- [ ] Integration diagnostics available
- [ ] Runbooks present
- [ ] Database recovery plan verified
- [ ] Storage recovery plan verified
- [ ] App rollback path verified
- [ ] Integration replay/reconciliation path verified

## Release Evidence
- [ ] Commit SHA recorded
- [ ] Migration IDs recorded
- [ ] CI result recorded
- [ ] Preview URL recorded
- [ ] Preview smoke result recorded
- [ ] Visual QA evidence recorded
- [ ] Accessibility evidence recorded
- [ ] RLS evidence recorded
- [ ] Integration fixture evidence recorded
- [ ] Deployment ID recorded
- [ ] Production smoke result recorded
