# Mercurius Quote Tool — MDS Gate 7 Implementation Readiness

Status: Current — refreshed for MDS v1.1  
MDS version: v1.1 active  
Repository baseline: `41e2568`  
Prepared: 2026-09-08
Approved: 2026-09-08 by Product owner

> Refresh notice — 2026-09-15: MDS-REF-024 through MDS-REF-044 are approved and provide route-specific responsive coverage for all 21 current routes. Route/reference implementation and QA mappings are current. Reference-board copy is illustrative; approved Marketplace tokens, terminology, final wording, and route behavior remain authoritative during implementation.

## 1. Outcome

The MDS v1.1 implementation package is complete and mapped to the actual Next.js repository. It gives MTS and implementation agents deterministic design foundations, component dependencies, route/reference mappings, responsive/accessibility gates, and QA evidence requirements.

Gate 7 does not authorize code implementation by itself. It makes the design system ready to enter MTS and the combined Mercurius Build Roadmap.

## 2. Delivered package

| Artifact | Path | Status |
| --- | --- | --- |
| Canonical design specification | `specification/DESIGN-SYSTEM.md` | Current |
| Design principles | `specification/PRINCIPLES.md` | Current |
| Do / Don't rules | `specification/DO-DONT.md` | Current |
| Tool-neutral design tokens | `tokens/mds.tokens.json` | Current |
| CSS token projection | `tokens/mds.css` | Current |
| Reference manifest | `references/REFERENCE-MANIFEST.md` | Current through MDS-REF-044 |
| Repository implementation manifest | `implementation/MDS-IMPLEMENTATION.md` | Current |
| MDS QA protocol | `qa/MDS-QA.md` | Current |
| MPS + MDS agent instructions | `AGENTS.md` | Current; merge with MTS rather than duplicate |

## 3. Repository findings that shape implementation

| Existing area | Gate 7 disposition |
| --- | --- |
| Next.js 16.2.9, React 19.2.4, TypeScript 5, Tailwind 4 | Preserve; MTS confirms technology authority |
| Inter and emerald/slate global styling | Replace with Manrope and MDS semantic tokens |
| 72px header, 256px rail, 13-item flat navigation | Modify to 64/56px header, grouped 264px rail, five-position mobile nav + More |
| Existing opportunity, quote, customer, settings, team, media, PDF/email components | Reuse/compose/modify; do not rebuild sound domain responsibility |
| Repeated inline SVG and local visual treatments | Deprecate through shared icon/primitives |
| Long all-at-once quote form | Replace composition with recoverable five-step builder while preserving field/domain logic |
| Existing Vitest, Testing Library, Playwright | Preserve and extend for MDS evidence |

## 4. Design sequence supplied to the Build Roadmap

1. D0 governance/bootstrap.
2. D1 tokens, font, identity, shell, navigation.
3. D2 shared primitives, feedback, overlays, responsive data display.
4. D3 public Marketplace, repair request, authentication/invitation.
5. D4 vendor overview, opportunities, quote history.
6. D5 five-step quote builder.
7. D6 customer quote and exported delivery.
8. D7 settings and team administration.
9. D8 intentional placeholders and system hardening.
10. D9 MDS compliance validation.

MTS may combine or reorder implementation slices only while preserving these design prerequisites, applicable references, states, and QA exit gates.

## 5. Mandatory Gate 7 handoffs

- `MDS-DEV-001`: restore the approved public `/` entry.
- `MDS-DEV-002`: replace generic customer payment copy with source-aware behavior after MTS resolves the exact integration.
- `MDS-GAP-001` through `MDS-GAP-004`: retain bounded omission/no-invention rules until MPS/MTS resolution.
- Design-delivery capabilities needing MTS selection: component composition, exact asset integration, responsive inspection, screenshot comparison, accessibility testing, photo fixtures, PDF/email/print inspection, and runtime verification.

## 6. MDS v1.1 refresh effect

The approved refresh confirms:

1. mark all Gate 7 artifacts current for MDS v1.1;
2. retain MDS Gate 7 as complete;
3. authorize the refreshed package as the MDS input to MTS and the Mercurius Build Roadmap;
4. keep Gate 8 Compliance pending implementation; and
5. require the future MTS Agent Skill Manifest to be merged into the single project-root `AGENTS.md` without weakening MPS/MDS authority.

## 7. Decision

Gate 7 is approved and refreshed. The package is implementation-ready from the design-system perspective, with complete route-reference coverage, no hidden MDS gap, and explicit containment of the remaining upstream policy dependencies.
