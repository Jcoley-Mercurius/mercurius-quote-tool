# Phase Zero Authority Status

Status: conditional — governance package placed; canonical authority gaps remain  
Prepared: 2026-09-16  
Repository: `Jcoley-Mercurius/mercurius-quote-tool`

## Present in this branch

- Unified root `AGENTS.md` with the repository's Next.js rule preserved.
- `BLUEPRINT.md`, Phase Zero checklist, release checklist, and slice manifest.
- MTS project state, build roadmap, and agent-skill manifest from the finalized handoff bundle.
- Approved MDS v1.1 written package, tokens, QA/implementation guidance, exact Mercurius logo, canonical base boards, and historical Quote Tool screenshots.

Two legacy screenshots (`Quote History and requests.png` and `Settings.png`) are retained in the source handoff but deliberately excluded from this public branch. They are historical product evidence, not canonical MDS authority, and their omission does not change the approved design package.

## Reconciled approved decisions

The following project decisions are already approved and must not be reopened as product discovery questions:

- Marketplace-origin and Direct-origin provenance is permanent.
- Marketplace-origin acceptance uses Marketplace checkout and commission rules.
- Direct-origin work is commission-free and may use vendor-directed payment.
- Organization tenancy is required.
- The Quote Tool inherits Marketplace identity, navigation, dashboard shells, tokens, components, Supabase, and production payment authority.
- MDS Gate 8 is implementation compliance and remains pending until implementation evidence exists.

## Physically missing authority

The following files were not available in the recovered finalized handoff and must not be fabricated:

- Complete canonical MPS v1.0 package and traceability artifacts.
- Complete canonical MTS v1.3 package, including the Technology Blueprint, Capability Matrix, Integration Manifest, Security Architecture, Implementation Plan, Mercurius Implementation Playbook, and MTS QA specification.
- An intact `MDS-UI-DESKTOP-QUOTE-BUILDER.png` (MDS-REF-015). The recovered stored binary is truncated and was deliberately excluded rather than published as canonical evidence.
- Route-board image files referenced as MDS-REF-024 through MDS-REF-044 in `mds/references/REFERENCE-MANIFEST.md`.

The MDS manifest and route-coverage audit are present and authoritative as written. A manifest entry is not proof that its binary image exists.

## Implementation stop conditions

- Do not begin product-code implementation until Phase Zero verifies the applicable MPS/MDS/MTS authorities and required capabilities.
- Do not implement a route whose required canonical reference file is absent.
- Do not implement schema, authorization, payment, checkout, commission, refund/dispute, retention, or irreversible-action behavior without traceable MPS and MTS authority.
- Do not treat the legacy README, current UI, this status record, or an agent inference as a replacement for a missing canonical package.
- Do not copy the standalone Quote Tool's identity, navigation, public-storage assumptions, or payment authority into the Marketplace destination.

## Safe next action

Complete Phase Zero authority placement and repository baseline verification. After all required authorities resolve, the first implementation slice is **Slice 01 — Foundation & Security**, followed by **Slice 02 — MDS Foundation**. No product code is changed by this branch.
