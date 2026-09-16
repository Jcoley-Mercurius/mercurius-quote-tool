# Mercurius Quote Tool — MDS QA Protocol

Version: MDS v1.1  
Status: Current — Gate 7 approved and refreshed

## Evidence rule

Never claim a check passed without running it. Store command output, screenshots, viewport sizes, tested states, and manual findings with the implementation slice or release evidence.

## Gate 1 — Foundation Compliance

Verify:

- Manrope loads and Inter is removed as design authority;
- semantic MDS tokens replace conflicting emerald/slate and repeated hardcoded values;
- exact MDS-REF-017 logo bytes/proportions are preserved on branded surfaces and exports;
- ink/green/coral roles follow the approved semantic model;
- spacing, radii, borders, elevation, motion, 44/52px targets, and 3px focus ring are token-driven;
- icons use one shared wrapper; copied one-off SVG conventions are deprecated;
- shared primitives expose every applicable state;
- implementation uses reuse → compose → extend → create; and
- required MTS-classified design-delivery capabilities were verified before dependent work.

Evidence: token diff, font/asset inspection, component-state render, code search for deprecated foundations, and relevant automated checks.

## Gate 2 — Visual Fidelity

Compare each changed route with the mapped references in `references/REFERENCE-MANIFEST.md`.

Verify page structure, container width, grid/gutters, alignment, section spacing, hierarchy, whitespace/density, typography relationships, surface treatment, component proportions, semantic emphasis, and Do / Don't compliance.

Do not compare illustrative sample names or amounts literally. Record viewport, reference ID, capture, discrepancies, and disposition. Use “matches the approved system/composition” unless a meaningful image comparison supports a stronger statement.

Reference-board copy and local token appearance are illustrative when they differ from the approved Marketplace system. Validate implementation wording, terminology, route behavior, and tokens against current Marketplace authority while validating composition, hierarchy, responsive behavior, and material states against the mapped route board.

## Gate 3 — Product Quality

Verify:

- desktop, tablet, mobile, 320 CSS px, 200% zoom, and orientation changes;
- default, hover, focus, active, selected, disabled, loading, saved, success, warning, error, empty, read-only, permission, expired, offline, and coming-soon states where applicable;
- short/long/zero/many content, large values, missing/failed images, and long company/customer names;
- keyboard-only workflow, focus order/return, landmarks/headings, labels/descriptions, live announcements, reduced motion, touch targets, and non-gesture alternatives;
- route, API, network, font, image, PDF, email, share, and runtime behavior relevant to the slice;
- no blank resolving pages, hidden consequences, duplicate submissions, or lost form data; and
- no unsupported policy or trust claims.

## Route evidence matrix

| Slice | Routes/surfaces | Required references |
| --- | --- | --- |
| D1/D2 | Global shell, primitives, navigation, feedback, overlays | REF-012/013/014/021 |
| D3 | `/`, `/request-repair`, `/login`, `/auth/reset-password`, `/invite/[token]` | REF-018/021/024–028 |
| D4 | `/command-center`, `/opportunities`, `/opportunities/[id]`, `/quotes` | REF-016/019/021/029–031/033 |
| D5 | `/quote` | REF-015/016/021/032 |
| D6 | `/quote/[token]`, PDF, email, share, print/download | REF-016/020/022/034 |
| D7 | `/settings`, `/team` | REF-020/021/035/036 |
| D8 | `/analytics`, `/business-plan`, `/customers`, `/jobs`, `/messages`, `/properties`, `/services`, `/storefront`, and global/recovery states | REF-021/023/037–044 |

## Minimum engineering checks

Use the repository's actual scripts and MTS-approved commands. Current baseline exposes:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

Add targeted tests before broad checks where possible. Browser verification must include console/runtime inspection and the relevant authenticated/public state.

## Finding format

| Field | Required value |
| --- | --- |
| ID | Stable finding ID |
| Gate | Foundation, fidelity, or product quality |
| Severity | critical, major, minor, observation |
| Classification | compliant, gap, exception, deviation |
| Scope | route/component/state/breakpoint |
| MDS authority | decision/spec/reference/token |
| Evidence | command/capture/manual steps |
| Required action | fix, upstream decision, approved exception, or follow-up |

## Overall result

- `PASS` — all three gates pass, with no unresolved blocking deviation.
- `PASS WITH APPROVED EXCEPTIONS` — all gates pass under recorded approved exceptions.
- `REVIEW REQUIRED` — evidence is incomplete or nonblocking deviations remain.
- `FAIL` — a critical/major breach, hidden gap, inaccessible core flow, or functional regression remains.

## Required compliance report

Record project/release, MDS version, references reviewed, each QA gate result and finding count, open gaps, approved exceptions, open deviations, blockers, recommended MDS updates, exact next action, and overall result.
