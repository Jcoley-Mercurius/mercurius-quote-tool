# Mercurius Quote Tool — MDS Implementation Manifest

System: Mercurius Design System  
Version: v1.1  
Status: Current — Gate 7 approved and refreshed  
Repository baseline: `41e2568`  
Date: 2026-09-15

## 1. Authoritative package

- State: `mds/MDS-PROJECT-STATE.yaml`
- System specification: `mds/specification/DESIGN-SYSTEM.md`
- Principles: `mds/specification/PRINCIPLES.md`
- Do / Don't: `mds/specification/DO-DONT.md`
- Tokens: `mds/tokens/mds.tokens.json`; runtime projection: `mds/tokens/mds.css`
- Reference index: `mds/references/REFERENCE-MANIFEST.md`
- QA protocol: `mds/qa/MDS-QA.md`
- Gate 6 coverage audit: `mds/MDS-GATE-6-COVERAGE-AUDIT.md`
- MDS v1.1 route coverage audit: `mds/MDS-V1.1-ROUTE-DESIGN-COVERAGE-AUDIT.md`
- Agent behavior: project-root `AGENTS.md`, merged with approved MTS instructions when available
- Exact identity verification: `mds/references/mercurius-logo.png` SHA-256 `aebe9d2a14ef7beb0323e85116008f669d6e657d1adbb23e5f338e0f216506c7`

Skills provide procedure. Approved MPS/MDS/MTS artifacts remain authoritative.

Route boards govern composition, hierarchy, responsive behavior, and material states. Approved Marketplace tokens, terminology, final wording, and route behavior govern implementation wherever illustrative board content differs.

## 2. Actual repository map

| Concern | Current path | MDS disposition |
| --- | --- | --- |
| Runtime tokens/global style | `app/globals.css`, `tailwind.config.ts` | Replace emerald/slate/Inter foundations with MDS semantic tokens; remove duplicated color authority |
| Font loading | `app/layout.tsx` (`Inter`) | Replace with Manrope and expose one canonical sans variable |
| Global shell | `components/layout/AppHeader.tsx`, `AppMain.tsx` | Modify to 64/56px header, exact logo rules, 264px rail, approved widths |
| Navigation | `components/layout/workspace-navigation.tsx` | Replace flat list/copy SVGs with grouped rail and five-position mobile navigation + More sheet |
| Quote flow | `components/quote-flow/QuoteFlow.tsx`, `components/quote-form/*` | Keep domain logic; replace all-at-once composition with five-step recoverable builder |
| Opportunities | `components/opportunities/*` | Keep/modify into efficient desktop rows, labeled mobile cards, filter sheet, detail action rail |
| Quote history | `components/quotes/*` | Keep/modify into approved metrics/filter/list hierarchy and valid lifecycle actions |
| Customer portal | `components/client-portal/*`, `components/quote-result/*` | Keep/modify into document + decision rail, change/acceptance, source-aware payment handoff |
| PDF/email/share | `components/pdf/*`, `lib/pdf/*`, `lib/email/*`, quote share/send routes | Keep behavior; restyle and verify against MDS-REF-022 |
| Settings/team | `components/vendor/*`, `components/organizations/*`, `components/settings/*` | Keep/modify into local settings navigation, permissions/read-only, scoped saved/recovery states |
| Photos/media | `components/photos/*`, `components/quote-form/PhotoUpload.tsx` | Keep/modify with shared upload queue, errors, viewer, keyboard and button alternatives |
| System feedback | `components/ui/*`, `app/error.tsx`, `app/global-error.tsx`, Sonner toaster | Consolidate into approved feedback/overlay primitives and MDS-REF-021 states |
| Placeholder modules | `components/workspace/ModulePlaceholder.tsx`, eight routes | Modify using shared MDS-REF-023 behavior plus route-specific MDS-REF-037 through MDS-REF-044 compositions; coming-soon is not an error/empty state |
| Icons | repeated inline SVGs | Deprecate; introduce a shared icon wrapper using the MTS-approved implementation |
| Tests | Vitest, Testing Library, Playwright | Keep; extend with MDS state, responsive, keyboard, accessibility, and visual evidence |

## 3. Reusable component dependency order

1. Semantic tokens, Manrope, exact Mercurius asset, focus/motion rules.
2. Shared icon wrapper and primitives: Button, Input, Textarea, Select/Combobox, Badge/Status, Card/Panel, Alert, Skeleton, Spinner.
3. Overlay and navigation primitives: Dialog, Drawer/Sheet, Toast, Header, grouped rail, mobile bottom navigation, More sheet.
4. Data and workflow patterns: responsive list/table, metric strip, source label, lifecycle actions, stepper, autosave status, financial summary.
5. Domain compositions: opportunity, quote builder, customer quote, settings/team, media/upload, export/delivery, intentional placeholder.

Do not begin route-by-route restyling before foundations and shared primitives are stable.

## 4. Design contribution to the Mercurius Build Roadmap

| Slice | Design scope and prerequisite | Required states | Canonical references | Visual/accessibility exit gate |
| --- | --- | --- | --- | --- |
| D0 — Governance/bootstrap | Install approved MDS package; preserve MPS/MTS authority; merge `AGENTS.md` | N/A | REF-012–044 | Paths resolve; exact logo checksum/visual preserved; no duplicate design authority |
| D1 — Foundations/shell | Tokens, Manrope, icon wrapper, header, grouped rail, mobile nav, containers | focus, reduced motion, active nav, workspace loading/error | REF-012–014 | Token audit; 320px/200% reflow; keyboard navigation; exact identity |
| D2 — Primitives/states | Actions, fields, selection, status, cards, feedback, overlays, responsive list | all approved primitive states | REF-014/021 | Unit/interaction checks; focus trap/return; no color-only meaning |
| D3 — Public/access | Landing, repair request, login, reset, invite | loading, validation, success, expired, used, error | REF-018/021/024–028 | Public `/` reachable; desktop/mobile comparison; form/error accessibility |
| D4 — Vendor operations | Command center, opportunities list/detail, quote history | loading, empty, filtered-empty, error, closed, declined, expired, permission | REF-016/019/021/029–031/033 | Attention-first hierarchy; row-to-card transformation; valid lifecycle actions |
| D5 — Quote builder | Five steps, source/workspace, autosave, lookup, photos, AI draft, line items, review/send | saving/saved/recovery, lookup/upload, generation, validation, send | REF-015/016/021/032 | Input preservation; keyboard/zoom; one primary forward action; AI coral only |
| D6 — Customer/export | Customer review, changes, acceptance, PDF, email, share, print/download | sent/viewed/changes/accepted/expired/error; delivery progress/failure | REF-016/020–022/034 | Document/decision order; source/expiry/total; PDF continuation; mobile acceptance |
| D7 — Settings/team | Profile, pricing, brand, photos/storage, membership/invites | unsaved/saving/saved/error, permission/read-only, invite/revoke/remove/transfer | REF-020/021/035/036 | Scoped save/recovery; role visibility; consequential confirmation |
| D8 — Placeholders/hardening | Eight placeholders, 404, global/route error, offline/session, content stress | coming-soon plus all system states | REF-021/023/037–044 | All 21 routes designated; no placeholder implies functionality; stress and recovery pass |
| D9 — MDS compliance | Cross-slice visual/accessibility/runtime validation | all applicable | REF-012–044 | QA Gates 1–3 complete with evidence; no hidden deviations |

MTS owns the final cross-system slice sequence, technology dependencies, migrations, environments, deployment, rollback, and approved skills. It must preserve these MDS prerequisites and exit gates.

## 5. Known deviations assigned to implementation

- `MDS-DEV-001` — `/` currently redirects to sign-in. Implement the approved public Marketplace entry in D3.
- `MDS-DEV-002` — customer portal currently says no payment is due. Implement source-aware payment handoff in D6 after MTS resolves exact integration content.

These are not approved exceptions. Gate 8 cannot pass while they remain.

## 6. Bounded upstream gaps

`MDS-GAP-001` through `MDS-GAP-004` remain MPS/MTS dependencies. Use approved omission and bounded-placeholder behavior. Do not invent provider, refund, protection, visibility, competition, comparison, commission, or trust-claim policy.

## 7. Design-delivery capability signals for MTS

MTS must resolve and record an approved method for each capability; MDS does not select tools.

| Capability signal | Applicable MDS | Stage | Evidence required | If unavailable |
| --- | --- | --- | --- | --- |
| Component composition and semantic token implementation | DEC-004–018; REF-012–014 | D1–D8 | Code diff plus rendered primitive/state inventory | Stop before route styling |
| Exact raster identity integration | DEC-031; REF-017 | D0/D1/D6 | Asset checksum or byte-preservation evidence plus header/PDF/email renders | Stop branded-surface approval |
| Responsive browser inspection | DEC-019–027/030/032/038/044; REF-013/016/018–044 | Every slice | Captures at 320, 390, 768, 1024, 1280+ and 200% zoom | Slice cannot clear visual gate |
| Screenshot/reference comparison | DEC-028/029/033/034/038/044/061; REF-012–044 | D1–D9 | Before/after captures and documented comparison findings | No fidelity claim; review required |
| Accessibility testing | WCAG 2.2 AA; component and composition rules | D1–D9 | Automated results plus keyboard, focus, screen-reader smoke, reduced-motion, touch review | Slice blocked from done |
| Image/photo-state generation or fixtures | Photo upload/viewer and content-stress rules | D5/D8 | Representative missing/loading/error/large/many image fixtures | Photo experience remains unverified |
| PDF/email/print rendering inspection | REF-022 | D6 | First/continuation PDF, email, print, mobile review, failure-state artifacts | Customer delivery blocked |
| Runtime/console/network verification | Gate 8 QA Gate 3 | D3–D9 | Clean targeted flows or documented findings with severity | Product-quality gate fails |

## 8. QA method

Use `mds/qa/MDS-QA.md`. For each slice:

1. run relevant unit/integration checks;
2. run route flow checks;
3. inspect target breakpoints and stress states;
4. compare system/composition with applicable references;
5. record evidence and classify findings as gap, exception, or deviation;
6. report only checks actually run.

## 9. Maintenance

Update this manifest when MDS version, paths, tokens, references, shared components, gaps, exceptions, deviations, or QA methods change. Mark affected artifacts stale before implementing against an outdated contract.

Agent quick rule: **You implement the design. You do not invent the design.**
