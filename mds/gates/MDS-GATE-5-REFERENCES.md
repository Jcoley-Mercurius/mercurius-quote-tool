# Mercurius Quote Tool — MDS Gate 5 References

Status: Approved  
System: Mercurius Design System  
Consumes: Approved Gates 1–4 and Quote Tool MPS v1.0  
Parent authority: Approved Marketplace/ReImagine MDS v1.0  
Repository baseline: `41e2568`  
Prepared: 2026-09-08

## 1. Reference outcome

Gate 5 translates the approved foundations, components, and composition rules into a visual contract for the Quote Tool. It replaces the supplied emerald/Inter desktop screenshots as implementation authority while retaining their aligned product concepts: source-aware quoting, property context, photos, workspace ownership, AI-assisted pricing, quote history, and incoming Marketplace requests.

The package includes five visual references plus the exact approved identity asset:

| MDS ID | Reference | Purpose | Status |
| --- | --- | --- | --- |
| MDS-REF-012 | `references/MDS-CORE-REFERENCE.png` | Color roles, typography character, spacing, shape, actions, controls, source/status labels, icons, and accessibility states | Canonical |
| MDS-REF-013 | `references/MDS-LAYOUT-BEHAVIOR-REFERENCE.png` | Grid, desktop rail, mobile navigation, page-shell transformations, and sticky-to-inline behavior | Canonical |
| MDS-REF-014 | `references/MDS-COMPONENT-LIBRARY-REFERENCE.png` | Reusable primitives and source-aware opportunity, builder, commitment, and feedback components | Canonical |
| MDS-REF-015 | `references/MDS-UI-DESKTOP-QUOTE-BUILDER.png` | Canonical desktop Step 4 quote-builder composition | Canonical |
| MDS-REF-016 | `references/MDS-UI-MOBILE-REFERENCE-SET.png` | Canonical mobile opportunities, Direct builder, and Marketplace customer quote compositions | Canonical |
| MDS-REF-017 | `references/mercurius-logo.png` | Exact Mercurius figure-and-coin identity mark supplied by the product owner | Approved identity asset |

Every reference masthead uses MDS-REF-017. The mark is carried as an exact placed asset rather than regenerated artwork; its proportions and artwork may not be altered or substituted.

## 2. Authority and interpretation

The images communicate visual intent and composition. They do not replace exact MDS specifications.

Implementation authority remains:

1. Approved MPS product requirements and business rules.
2. Approved MDS project state and written Gate 2–4 specifications.
3. Exact design tokens and component specifications.
4. Approved Gate 5 visual references.
5. Existing implementation.

If generated text, sample content, a miniature label, or a depicted data value conflicts with approved state, state wins. Sample company, customer, address, date, service, item, and price content is illustrative only.

## 3. Core Design System reference

The core sheet establishes the intended Mercurius feel:

- Warm Marketplace surfaces rather than cool blue-gray application chrome.
- Manrope throughout; dark ink creates hierarchy.
- Ink for ordinary primary action and structure.
- Coral only for explicit AI generation and bounded AI draft emphasis.
- Green only for trusted progression, verified success, acceptance, paid state, and focus.
- Source is always visible as `Marketplace` or `Direct customer` with text and icon.
- Controls use 12px radius, workflow cards 16px, and major panels 24px.
- Lucide-style rounded 2px outline icons.
- Focus, error, disabled, loading, and success states remain visible without color-only meaning.

Exact token values and type metrics remain those in Gate 2 and `MDS-PROJECT-STATE.yaml`; the visual samples are not a substitute for numeric tokens.

## 4. Layout & Behavior reference

The layout sheet makes Gate 4 responsive behavior visible:

- Desktop vendor work uses the grouped 264px rail.
- Vendor mobile uses exactly `Overview`, `Opportunities`, `New quote`, `Quotes`, and `More`.
- Public and customer quote screens do not use vendor bottom navigation.
- The 12/8/4-column system uses 24/20/16px gaps at desktop/tablet/mobile.
- Desktop operational rows become labeled mobile cards.
- Filter bands become a filter trigger/sheet with active chips retained.
- Sticky desktop summary rails move inline before consequential mobile actions.
- Source, price, deadline, payment path, and legitimate next action remain visible.

## 5. Component Library reference

The component sheet demonstrates the approved families rather than a second component specification. It includes:

- structural, AI, progression, secondary, quiet, and destructive actions;
- labeled inputs and selections with 44px minimum targets;
- source context labels and noneditable lifecycle states;
- opportunity row and mobile card variants;
- five-step progress, autosave, line-item editing, and financial summary;
- acceptance summary and source-aware payment-path field;
- persistent AI, success, warning, error, loading, and filtered-empty feedback.

The depicted component families must be built once and varied by source/state. Marketplace and Direct do not receive separate component stacks.

## 6. Canonical desktop UI

`MDS-REF-015` is the primary desktop implementation reference for the guided builder:

- Marketplace header and grouped vendor rail.
- Eight-column active step with four-column summary rail.
- Visible source, progress, autosave, customer/request context, property, service, and total.
- Coral AI draft generation contained within Step 4.
- Editable line items and Good/Better/Best options remain vendor-controlled.
- Neutral Back and ink Continue to review actions.

The sample does not authorize the displayed example pricing, customer identity, property, or service content.

## 7. Canonical mobile UI

`MDS-REF-016` closes the prior lack of mobile visual authority by showing:

1. A source-aware opportunity list with labeled cards and one legitimate next action.
2. A Direct quote builder with one active step, autosave, photo evidence, and safe-area Back/Continue.
3. A Marketplace customer quote with bounded vendor presentation, inline decision summary, no vendor navigation, and Marketplace checkout after acceptance.

These screens establish mobile hierarchy and transformation. They do not add new Marketplace visibility, comparison, Direct payment, or protection rules.

## 8. Reconciliation against approved state

The generated references were reviewed and corrected before packaging:

| Check | Result |
| --- | --- |
| Parent Marketplace palette and warm surfaces | Aligned |
| Ink / coral / green semantic action roles | Aligned after correction |
| 4px spacing base and approved radii | Aligned after correction |
| Grouped desktop navigation | Aligned after correction |
| Five-position vendor mobile navigation | Aligned after correction |
| 12/8/4 responsive grid and 24/20/16px gaps | Aligned after correction |
| Source visible with text/icon | Aligned |
| Desktop 8/4 builder composition | Aligned |
| Mobile summary before consequential action | Aligned |
| Public/customer pages exclude vendor bottom navigation | Aligned |
| Exact Mercurius identity mark in reference mastheads | Aligned using MDS-REF-017 |
| Direct payment processor/refund/protection content | Intentionally not depicted |
| Marketplace vendor visibility and multi-quote comparison | Intentionally not depicted |

## 9. Remaining gaps and limits

Gate 5 closes `MDS-GAP-005` because a proposed mobile visual reference now exists. The following MPS gaps remain open and cannot be resolved through imagery:

- Direct payment processing, refunds/disputes, support, and protection wording.
- Marketplace vendor visibility and competition model.
- Homeowner multi-quote comparison model.
- Evidence for public trust, scale, speed, rating, licensing, or insurance claims.

The reference package intentionally avoids those unresolved promises.

## 10. Gate 5 approved decision bundle

Approval authorizes:

1. MDS-REF-012 through MDS-REF-016 as the canonical Gate 5 reference package, each carrying the approved MDS-REF-017 identity mark.
2. The reference hierarchy and state-over-image conflict rule.
3. The corrected Marketplace-aligned semantic color behavior shown across the package.
4. The grouped desktop navigation and five-position vendor mobile navigation shown in context.
5. The canonical desktop Step 4 builder and three-screen mobile transformation set.
6. Closure of MDS-GAP-005, with the other product-policy gaps remaining open.
7. A non-substitution rule requiring the exact Mercurius identity asset on primary branded product surfaces and exported design artifacts.

## 11. Gate 5 approval record

Approved by the product owner on 2026-09-08. Gate 6 must complete an exhaustive route, layout, state, role, and breakpoint coverage matrix before establishing the first approved Mercurius Quote Tool MDS release. Representative reference screens alone are not sufficient evidence of full-product design coverage.
