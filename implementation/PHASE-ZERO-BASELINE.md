# Phase Zero Baseline Evidence

Captured: 2026-09-16  
Branch baseline: `41e2568143d4d8577d41b1fbc22085c9b2eee270`  
Scope: governance/design handoff only; no product code changed

## Environment

- Node: `v24.19.0`
- npm: `11.9.0`
- Dependency install: `npm ci` passed; 545 packages installed.
- npm warning: local environment exposes deprecated `http-proxy` npm configuration.

This records the current runner, not an approved Node production standard. Node must still be reconciled across WSL, CI, and Vercel during Phase Zero.

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| MDS token JSON parse | PASS | `mds/tokens/mds.tokens.json` parsed successfully. |
| Exact logo checksum | PASS | SHA-256 `aebe9d2a14ef7beb0323e85116008f669d6e657d1adbb23e5f338e0f216506c7`. |
| PNG integrity | ATTENTION | 21 recovered PNGs passed; truncated `MDS-UI-DESKTOP-QUOTE-BUILDER.png` was excluded. Two additional non-canonical legacy screenshots were excluded from the public branch. |
| Unit tests | PASS | 31 files; 208 tests passed. |
| Production build | PASS | Next.js 16.2.9 compiled, TypeScript passed, and 26 static pages generated. |
| Lint | FAIL — pre-existing | Four React purity violations in `QuoteResult.tsx`, `SendQuoteModal.tsx`, `SetupChecklist.tsx`, and `VendorProfileNudge.tsx`. |
| Playwright E2E | BLOCKED — environment | Next.js dev server could not enumerate network interfaces (`uv_interface_addresses`) and Playwright timed out waiting 120 seconds. No browser tests executed. |

## Authority/reference checks

- Unified root agent authority: present.
- Execution blueprint, Phase Zero, slice manifest, release checklist: present.
- MDS v1.1 written package, tokens, implementation guidance, QA, logo, and available reference boards: present.
- Canonical MPS v1.0 package: missing.
- Complete canonical MTS v1.3 package: missing.
- MDS-REF-015 intact binary: missing.
- MDS-REF-024 through MDS-REF-044 route-board binaries: missing (11 distinct files referenced by 21 route entries).

## Readiness decision

**ATTENTION — Phase Zero authority placement is incomplete.**

The repository is ready to review and merge this governance package. It is not ready to begin Slice 01 until the missing canonical authority files are placed and verified. The pre-existing lint failures should be repaired in Slice 01. The Playwright baseline must be rerun in WSL/CI or another environment where Next.js can start normally.
