# MTS Build Roadmap — Mercurius Quote Tool

## Canonical Strategy
Preserve → harden → extend → visually align → validate.

## Existing Technology Baseline
- Next.js 16.2.9
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Supabase JS 2.x / Postgres / Auth / Storage / Realtime / RLS / RPCs
- AI SDK + OpenAI provider
- Resend
- React PDF
- Vitest + React Testing Library
- Playwright
- GitHub Actions
- Vercel

Verify versions against the repository at execution time.

## Architecture
UI/App Router
→ authenticated/public route boundaries
→ domain/service modules
→ Supabase/Postgres
→ external adapters (Marketplace, AI, property, email, storage, PDF, payment)

Normal application access uses caller identity + RLS.
Service role remains a narrow server-only integration/operations escape hatch.

## Canonical Domain Progression
Customer → Property → Opportunity → Quote → Acceptance → Job/Work → Payment

Marketplace and Direct are immutable origins, not UI guesses.

## Integration Pattern
External system
→ transport
→ authentication
→ version/schema validation
→ domain command
→ transactional state + durable event
→ async side effect
→ retry/reconciliation

## Deployment Flow
Local → feature branch → PR → CI → Vercel Preview → combined validation → main → Vercel Production.

Deployment does not equal integration activation.

## Database Rules
- freeze historical migrations
- next verified monotonic migration for new changes
- expand → migrate → verify → contract
- RLS before grants
- positive and negative tenant tests
- no automatic destructive production down-migration strategy

## Reliability
Tier A core: auth/tenancy/persistence/acceptance/authoritative payment/integration integrity
Tier B retryable: outbound Marketplace/email/payment notifications/reconciliation
Tier C degradable: AI, vision, Places/enrichment, PDF generation

## Recovery
Separate:
- application rollback
- database backup/recovery
- storage recovery
- integration replay/reconciliation

## Observability
Track:
- application errors
- business workflow progress
- integration health/backlog/retries/dead letters/reconciliation
- deployment/release health

Use structured redacted telemetry and correlation IDs. Do not log secrets, signatures, full payloads, photos, or unnecessary PII.

## Implementation Sequence
See `BLUEPRINT.md` and `implementation/SLICE-MANIFEST.yaml`.

## WSL Operating Pattern
```bash
# Start each slice from the latest approved main
git checkout main
git pull --ff-only

# Example
git checkout -b slice/01-foundation-security

# Work, then validate
npm run lint
npm test
npm run build
npm run test:e2e

git status
git add -A
git commit -m "slice 01: foundation and security"
git push -u origin slice/01-foundation-security
```

For DB-bearing slices, add the approved Supabase local/migration/RLS test commands established in Phase Zero.
For UI-bearing slices, add browser/responsive/visual/accessibility evidence before PR completion.
For integration-bearing slices, add contract/idempotency/failure/retry evidence.
