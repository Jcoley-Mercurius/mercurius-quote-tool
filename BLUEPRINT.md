# BLUEPRINT.md — Mercurius Quote Tool Implementation Conductor

## Purpose
This is the master execution conductor for the Mercurius Quote Tool.

**Start with `AGENTS.md`.** `AGENTS.md` defines how work must be performed. This file defines what to execute and in what order.

## System Status
- MPS v1.0: approved
- MDS v1.1 Gates 1–7: approved; Gate 8 closes after implementation compliance
- MTS v1.3: approved externally; complete canonical package placement remains a Phase Zero requirement
- Strategy: preserve → harden → extend → visually align → validate
- Rebuild: no

## Hard Pre-Slice-1 Requirements
Do not begin Slice 01 until:
- approved MPS handoff is present in the repo
- approved MDS handoff is present in the repo
- canonical MDS reference images are present and mapped
- approved MTS handoff is present
- `AGENTS.md` is the unified root authority
- `mts/AGENT-SKILL-MANIFEST.yaml` has been verified
- Phase Zero passes
- environment/secrets baseline is established

This branch includes the approved MDS v1.1 written package and the design images available during packaging. Read `implementation/AUTHORITY-STATUS.md` for the exact files still missing; a reference-manifest entry is not proof that its binary exists.

## Bounded Upstream Gates
Never invent answers:
- GAP-001: Direct payment provider/commercial/support/refund-dispute/protection policy — MPS
- GAP-002: homeowner job-board vendor visibility/competition model — MPS
- GAP-003: homeowner multi-quote comparison model — MPS + MDS
- GAP-004: public trust/scale claims — evidence/business approval

These gaps block only the dependent functionality, not unrelated slices.

## Phase Zero
Execute `implementation/PHASE-ZERO.md`.

Exit only when:
- authority files are present
- canonical references are present
- required capabilities are verified
- dependencies install
- lint passes
- unit tests pass
- production build passes
- baseline E2E/browser verification passes or failures are documented as pre-existing
- Node runtime is standardized across local/CI/Vercel
- committed Marketplace webhook secret is treated as exposed and rotation plan is active
- Supabase migration inventory is captured
- security baseline is documented

## Slice Order

### Slice 01 — Foundation & Security
Goal: establish the safe implementation foundation before expanding homeowner/vendor exposure.

Scope:
- unify root agent governance
- normalize Node/CI/runtime
- secrets/environment cleanup
- Supabase local/testing foundation
- generated database type workflow
- executable behavioral RLS test harness
- repair-request authorization correction
- organization quote-child authorization correction
- SECURITY DEFINER audit

Exit:
- cross-tenant negative tests pass
- no global authenticated repair-request read/update remains as production authorization
- no browser service-role exposure
- CI/build/test baseline green

### Slice 02 — MDS Foundation
Goal: implement the approved design primitives and exact Mercurius identity.

Scope:
- exact Mercurius logo/assets
- semantic tokens
- typography/spacing/surfaces
- controls/components
- navigation/shell
- responsive rules
- loading/empty/error/permission states
- accessibility primitives

Preserve MDS D0→D9 dependencies.

Exit:
- canonical reference mapping complete
- mobile/intermediate/desktop verification
- accessibility baseline
- screenshot/reference evidence

### Slice 03 — Quote Workspace
Goal: align and harden the core vendor quoting experience without breaking mature behavior.

Scope:
- dashboard
- quote creation/editing
- AI quote generation
- Photo Vision
- customer/property context
- line items/pricing
- expiration
- save/preview/send states

Required capabilities:
- Next.js
- component/token governance
- Supabase/RLS
- AI SDK when AI paths touched
- browser verification
- visual comparison
- accessibility
- full-story verification

Exit:
- Direct/manual quote path remains working
- AI failure preserves deterministic fallback
- photos respect privacy model
- approved MDS states pass

### Slice 04 — Direct Customer Lifecycle
Goal:
`vendor-created customer/opportunity → quote → delivery → customer view → change/acceptance → vendor pipeline`

Do not implement final Direct payment processor behavior until GAP-001 is resolved.

Exit:
- origin remains Direct
- acceptance evidence protected
- delivery evidence durable enough for approved architecture
- source-aware UI does not imply Marketplace protection/payment for Direct work

### Slice 05 — Homeowner Job Board
Goal:
`issue + property + photos → homeowner request → vendor opportunity`

Prerequisite:
- security remediation from Slice 01

Blocked production decision:
- GAP-002 visibility/competition model

Do not reuse broad global `repair_requests` access.

Exit:
- no cross-tenant homeowner request exposure
- photo/privacy rules pass
- approved job-board policy implemented only after GAP-002 resolution

### Slice 06 — Marketplace Lifecycle
Goal:
`Marketplace lead assigned → signed ingress → tenant projection → vendor opportunity → quote → acceptance → durable Marketplace event`

Preserve:
- versioned contracts
- HMAC/replay protection
- trusted Marketplace vendor → organization mapping
- idempotency
- integration_events durability
- Direct/manual quote path

Exit:
- duplicate ingress produces one logical outcome
- tenant mismatch fails safely
- acceptance creates one durable outbound logical event
- Marketplace provenance cannot switch to Direct

### Slice 07 — Durable Delivery & Commercial Artifacts
Scope:
- Resend delivery orchestration
- retryable delivery evidence
- PDF
- exact quote revision binding
- outbound Marketplace delivery/retry/dead-letter/redrive
- customer-delivery records
- integration diagnostics

Exit:
- email failure cannot masquerade as successful delivery
- commercially significant PDF maps to exact quote revision
- outbound retry does not duplicate logical events
- failures are inspectable/redrivable

### Slice 08 — Payments & Job Conversion
Marketplace:
`accepted Marketplace quote → Marketplace checkout/payment authority → signed event → Quote Tool projection`

Direct:
`accepted Direct quote → approved provider → checkout → signed webhook → durable event → payment projection`

Prerequisite for Direct:
- GAP-001 resolved
- provider-specific capability approved

Rules:
- browser never asserts paid/refunded/disputed
- origin immutable
- external payment IDs immutable
- payment lifecycle append-only/auditable

### Slice 09 — Production Readiness & Combined QA
Run combined:
- MPS acceptance
- MDS compliance
- MTS security/integration/reliability
- runtime full-story verification

Required evidence:
- lint
- unit
- build
- E2E
- RLS isolation
- accessibility
- visual QA
- photo fixtures
- PDF/email
- Marketplace flow
- Direct flow
- enabled payment flows
- observability
- secrets
- migrations
- rollback
- preview smoke
- production smoke

This slice closes MDS Gate 8 only after implementation evidence passes.

## Branching
Create only the next branch from the latest approved/merged baseline:
- `implementation/phase-zero`
- `slice/01-foundation-security`
- `slice/02-mds-foundation`
- `slice/03-quote-workspace`
- `slice/04-direct-lifecycle`
- `slice/05-job-board`
- `slice/06-marketplace-lifecycle`
- `slice/07-delivery-artifacts`
- `slice/08-payments-jobs`
- `slice/09-production-readiness`

## Slice Operating Loop
For each slice:
1. confirm previous exit evidence
2. create branch
3. read slice MPS/MDS/MTS references
4. verify/invoke required capabilities
5. implement smallest coherent vertical change
6. migrate safely if needed
7. test positive + negative security behavior
8. run browser/responsive/visual/accessibility checks
9. run full-story verification
10. record evidence
11. preview deploy
12. smoke test
13. review/merge
14. begin next slice only from approved baseline

## Release Philosophy
Deployment is not activation.
Use deploy → validate → enable → monitor for high-impact integrations.
Prefer feature disable / known-good app redeploy / forward database fix to destructive rollback.

## Completion
The project is implementation-complete only when:
- all applicable slices pass
- bounded gaps are resolved or explicitly disabled
- Combined QA passes
- MDS Gate 8 compliance passes
- production smoke passes
- release evidence is archived
