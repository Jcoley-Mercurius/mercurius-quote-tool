<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mercurius Quote Tool — Unified Agent Authority

This file is the first-read authority for every coding agent and employee working in this repository.

## Required read order

Before changing product code:

1. Read this file completely.
2. Read the applicable approved MPS artifacts.
3. Read `mds/MDS-PROJECT-STATE.yaml`, the applicable specifications, and mapped canonical references.
4. Read the applicable approved MTS artifacts.
5. Read `BLUEPRINT.md`.
6. Read `mts/AGENT-SKILL-MANIFEST.yaml`.
7. Read `implementation/AUTHORITY-STATUS.md` and execute only the currently approved Phase Zero or slice.

`BLUEPRINT.md` conducts execution. MPS, MDS, and MTS remain authoritative by concern.

## Authority by concern

- MPS owns purpose, users, scope, workflows, product policy, requirements, business rules, acceptance criteria, metrics, and release intent.
- MDS owns visual language, components, layout, interaction, responsive behavior, and design accessibility.
- MTS owns application architecture, services, integrations, data/security boundaries, deployment, reliability, operations, and agent capability selection.
- Skills provide procedural guidance and never outrank approved project state.
- Existing code is evidence, not authority when it conflicts with approved MPS, MDS, or MTS.

Resolve conflicts by concern, not file order. Never invent a missing product, design, commercial, security, or architecture decision.

## Implementation standard

`AGENTS.md -> MPS -> MDS -> MTS -> BLUEPRINT.md -> Skill Manifest -> Phase Zero -> controlled slices -> Combined QA -> Production`

This is an existing-product modernization. Prefer:

`PRESERVE -> HARDEN -> EXTEND -> VISUALLY ALIGN -> VALIDATE`

Do not rebuild working systems without an approved reason.

## Product boundaries

- Preserve immutable Marketplace-origin and Direct-origin provenance.
- Marketplace-origin acceptance routes to Marketplace checkout and commission rules.
- Direct-origin work remains commission-free and may use vendor-directed payment under the approved Direct workflow.
- Do not create a second production database, identity system, payment authority, or design system.
- Do not invent job-board visibility, vendor competition, homeowner comparison, refund/dispute, protection, or trust/scale claims when canonical policy is absent.
- Treat externally approved decisions listed in `implementation/AUTHORITY-STATUS.md` as reconciled context, but stop dependent implementation until the referenced canonical package is physically present and traceable.

## Security invariants

- Supabase/Postgres RLS is the primary application authorization boundary; authentication alone is insufficient.
- Personal and organization workspaces must remain tenant-isolated.
- Quote child resources use the same authoritative workspace predicate as their parent.
- Service-role credentials are server-only and limited to reviewed integration/operations boundaries.
- Consequential lifecycle transitions use reviewed domain commands or RPCs.
- SECURITY DEFINER functions require a fixed search path, validation, internal authorization, least privilege, safe grants, predictable errors, idempotency where applicable, and behavioral tests.
- Browser redirects or client assertions never establish payment state.
- Customer imagery is private by default.
- Never log secrets, signature payloads, full webhook payloads, unnecessary PII, or customer photos.
- Treat any previously committed Marketplace webhook secret as exposed and rotate it before production reliance.

## Design invariants

- The exact logo at `mds/references/mercurius-logo.png` is canonical and must not be redrawn, approximated, replaced, stretched, cropped, or omitted on required surfaces.
- Implement from semantic tokens and shared components before page-specific styling.
- Preserve the MDS D0-D9 dependency sequence, mapped responsive states, accessibility requirements, and approved route coverage.
- Generated-board sample data and copy are illustrative; approved written MPS/MDS state wins.
- Every MDS-backed route requires responsive browser inspection, reference comparison, accessibility evidence, and an explicit record of any deviation.

## Database and integration rules

- Never renumber or rewrite deployed historical migrations merely for cleanliness.
- Significant schema changes follow expand -> migrate -> verify -> contract.
- Database-bearing slices require migration validation and positive/negative tenant-isolation tests.
- External integrations follow: transport -> authenticate -> validate/version -> domain command -> transaction -> durable event -> async side effect -> retry/reconcile.
- Realtime is a UI synchronization mechanism, not the durable integration bus.
- AI is advisory and may never decide identity, authorization, ownership, acceptance, or payment state.
- Preserve deterministic quote fallback when AI is unavailable.
- Commercial PDFs and delivery evidence bind to the exact quote revision.

## Slice execution and definition of done

Do not skip prerequisites or slices. For each slice, trace applicable MPS/MDS/MTS decisions, verify required capabilities, inspect the code, implement the smallest coherent change, run security and engineering checks, verify responsive/accessibility/visual/runtime behavior, record evidence, and stop on unresolved upstream authority.

Compilation is not completion. A slice passes only when its product, design, technology, security, test, runtime, and evidence exits pass.

Completion reports must state: what changed, tests and actual outcomes, items needing Josh's attention, open MPS/MDS/MTS gaps, and the next bounded action.
