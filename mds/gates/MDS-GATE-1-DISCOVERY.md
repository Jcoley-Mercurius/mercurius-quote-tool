# Mercurius Quote Tool — MDS Gate 1 Discovery

Status: Approved  
System: Mercurius Design System  
Mode: Create + existing-product audit  
Consumed product authority: Approved Mercurius Quote Tool MPS v1.0  
Repository baseline: `41e2568` (`test: finalize PR4.2 validation and accessibility`)  
Audit date: 2026-09-08
Approved by: Product owner  
Approval date: 2026-09-08

## 1. Discovery outcome

Mercurius Quote Tool should evolve as one coherent vendor operating workspace with two clearly distinguished quote paths:

1. **Marketplace quoting** — a homeowner posts a repair request with details and photos; eligible Marketplace vendors review the opportunity and submit a quote; acceptance proceeds through the Marketplace transaction and checkout path.
2. **Direct quoting** — a vendor creates and sends a professional quote to a customer acquired outside the Marketplace; the quote can be reviewed, accepted, and paid directly to the vendor without Marketplace commission.

These are not separate products and should not become separate visual brands. They share one quote builder, one vendor workspace, one professional client portal, and one lifecycle language. Provenance, commercial terms, payment rail, and support ownership must remain visible wherever they materially affect a decision.

The Quote Tool is an embedded Marketplace capability. Its base identity must therefore inherit the approved Mercurius Marketplace MDS foundation. The current Quote Tool palette and typography are implementation evidence, not authority when they conflict with that parent system.

## 2. Product context consumed from MPS v1.0

| Area | Approved product direction consumed by MDS |
| --- | --- |
| Product | AI-assisted professional quote creation and conversion within the Mercurius ecosystem |
| Primary vendor users | Solo home-service contractors, small crews, and growing vendor teams |
| Customer users | Marketplace homeowners and vendor-acquired direct customers |
| Platforms | Responsive web experience; field use makes mobile a first-class composition target |
| Marketplace acquisition | Homeowner job board/request flow with description, photos, and repair context; vendors submit quotes |
| Marketplace conversion | Accepted quote transitions into the existing Marketplace transaction/checkout flow |
| Direct acquisition | Vendor may create and send a quote to a customer obtained outside Mercurius Marketplace |
| Direct economics | No Marketplace commission on direct work |
| Direct conversion | Customer may accept and pay the vendor directly outside the Marketplace checkout rail |
| Shared value | Professional presentation, faster quoting, clearer scope, stronger vendor pipeline management |

## 3. Core experience model

### Vendor workspace

**Opportunity → Quote → Acceptance → Payment/Job → Follow-up**

The source changes terms and downstream action, but not the basic mental model.

- Marketplace opportunity: visibly labeled `Marketplace`; carries homeowner request context; Marketplace checkout follows acceptance.
- Direct opportunity: visibly labeled `Direct customer`; carries vendor-entered customer context; vendor-directed payment follows acceptance.
- Workspace context: personal or organization ownership is separate from opportunity source and must not be conflated with it.

### Homeowner/customer experience

- Marketplace homeowner: submit request, understand matching, receive/compare quote options, accept, and continue through Marketplace checkout.
- Direct customer: open a branded quote without needing a Marketplace account, review scope and terms, accept, and use the vendor's approved direct-payment path.

### Experience principle

**One quote system, two transparent commercial paths.** The interface should never make a user infer whether a quote is Marketplace-originated or direct, who receives payment, or what happens after acceptance.

## 4. Reference-image findings

### Observed strengths to preserve

- Green is used consistently enough that the action/progress hierarchy can be retained, but the exact emerald hues must change to the approved Marketplace green roles.
- Light cards, thin borders, and restrained shadows create a trustworthy professional tone; their cool slate tint must move to the approved warm Marketplace surfaces.
- The direct, legible sans-serif hierarchy should be retained while changing the family from Inter to approved Marketplace Manrope.
- Rounded cards and inputs, generous whitespace, short supporting copy, and numbered form sections make complex quote entry approachable.
- SWFL residential imagery and local-language cues make the product feel regionally credible.
- Service tiles, status chips, progress, source/workspace selectors, filters, summary metrics, and client-facing price tiers establish reusable patterns.
- Vendor branding and snapshotted-branding language support professional direct quoting and historical consistency.

### Observed conflicts or incomplete behavior

- The screenshot set mixes a public Marketplace landing page with an authenticated vendor header; the live root currently redirects to sign-in, so the public homeowner entry is not reliably reachable from `/`.
- `Quote History`, `New Repair Requests`, `Opportunities`, and `Quotes` overlap conceptually. Current labels do not yet form a clean acquisition-to-conversion hierarchy.
- Marketplace, direct, and repair-request sources appear in code, but the visual treatment does not consistently carry source through quote creation, client review, acceptance, payment, and history.
- The current client portal says “No payment due now,” which conflicts with the approved need to support Marketplace checkout and optional direct payment after acceptance.
- Vendor-facing history cards allow prominent status editing and place delete beside the primary action. Lifecycle transitions and destructive actions need clearer hierarchy and safeguards.
- The all-on-one-page quote form is understandable on desktop but long for field/mobile use; sticky actions can appear before required information is complete.
- The supplied references are desktop-only. Responsive behavior is partly implemented and tested, but no approved mobile visual contract exists.
- The logo is visually small and low-detail in several screenshots; the identity should be preserved but asset sizing and clarity should be normalized.
- Trust claims and marketplace scale statistics appear in public screens without evidence in the supplied product artifacts.

### Parent Marketplace foundation discovered

The approved Marketplace MDS establishes the foundation the Quote Tool should inherit:

| Role | Approved Marketplace token | Value | Quote Tool use |
| --- | --- | --- | --- |
| Primary content | `color.brand.ink900` | `#1F242E` | Primary text and darkest structure |
| Primary structural action | `color.brand.ink800` | `#29303D` | Marketplace navigation and strong neutral actions |
| Trusted progression | `color.brand.green600` | `#3F8361` | Acceptance, confirmed progress, validation, payment progression |
| Accessible dark-theme green | `color.brand.green500Dark` | `#4FB080` | Trusted progression on dark surfaces |
| Creative/AI action | `color.brand.coral600` | `#D76742` | AI generation and bounded creative emphasis |
| Page surface | `color.surface.lightPage` | `#FBFAF9` | Default Marketplace and Quote Tool canvas |
| Card surface | `color.surface.lightCard` | `#FDFDFC` | Cards, forms, decision panels |
| Muted surface | `color.surface.lightMuted` | `#F6F5F3` | Quiet grouping and secondary controls |
| Border | `color.border.light` | `#E5E2DC` | Default light border |
| Focus | `color.border.focus` | `#4B9B73` | Persistent accessible focus ring |

Marketplace typography uses Manrope at weights 400, 500, 600, and 700. Its spacing uses a 4px base and the approved 4–80px scale. Its shape vocabulary uses 8, 12, 16, 24, and 32px radii plus pills, with quiet borders and restrained `sm`, `base`, and `md` elevation.

For the Quote Tool, green will no longer mean every primary action. Green communicates trusted progression; Marketplace ink carries strong structural actions; coral may initiate AI quote generation. This prevents success, acceptance, AI generation, navigation, and ordinary selection from collapsing into one emerald signal.

## 5. Repository audit classification

| Resource/pattern | Classification | MDS direction |
| --- | --- | --- |
| Existing action/progress hierarchy | KEEP/MODIFY | Retain the hierarchy but remap it to approved Marketplace semantic color roles |
| Current emerald palette | REPLACE | Replace `#059669` / `#10B981` with inherited Marketplace tokens; do not create a Quote Tool green |
| Cool slate/white surfaces | MODIFY | Move to approved warm Marketplace page, card, muted, border, and text roles |
| Inter font implementation | REPLACE | Adopt Marketplace Manrope and its approved type scale |
| Quiet bordered cards and restrained elevation | KEEP | Normalize radii, borders, and elevation levels |
| Numbered form sections and service tiles | KEEP/MODIFY | Preserve comprehension; add compact/mobile composition and completion states |
| Source and status chips | MODIFY | Standardize labels, hierarchy, and persistent provenance |
| Workspace switcher and personal/team ownership | KEEP/MODIFY | Preserve; visually separate workspace ownership from job source |
| Public homeowner repair request form | KEEP/MODIFY | Preserve clarity; integrate Marketplace job-board expectations and post-submit tracking |
| Opportunities list/detail | KEEP/MODIFY | Make the primary intake surface; reconcile terminology and source-specific actions |
| Quote builder/result/editor | KEEP/MODIFY | Reuse one builder; introduce source-aware context and acceptance/payment behavior |
| Client quote portal | MODIFY | Support source-specific acceptance and payment handoff while retaining vendor branding |
| Landing page | MODIFY | Restore a true public entry and clarify homeowner vs vendor paths |
| App shell/sidebar | MODIFY | Reduce navigation overload and group work by acquisition, delivery, customers, and business |
| One-off Tailwind styling and inline SVG icons | DEPRECATE | Replace gradually with approved tokens and reusable primitives; avoid a rewrite |
| Manual status dropdowns in operational cards | REPLACE where transitions are not valid | Use state-aware actions and menus tied to approved lifecycle rules |
| Desktop screenshots as mobile authority | NOT APPLICABLE | They remain desktop evidence only; Gate 4 must define mobile transformations |

## 6. Proposed MDS identity direction

The Quote Tool should feel:

- **Professional, not corporate-heavy**
- **Fast, not rushed**
- **Locally intelligent, not gimmicky-AI**
- **Commercially transparent, not marketplace-ambiguous**
- **Vendor-forward while still reassuring homeowners**

The Quote Tool should be recognizably Marketplace first and professionally vendor-branded second. It inherits Marketplace color, typography, spacing, shape, elevation, iconography, accessibility, and shell behavior. Quote-specific design work should add domain components and controlled variants, not a competing foundation.

Vendor branding may appear in the client quote header, PDF, and clearly bounded vendor-owned surfaces. It must not override Mercurius semantic colors for source, status, acceptance, warnings, errors, financial consequence, or Marketplace checkout.

## 7. Initial design principles proposed for Gate 2

1. **Make the money path unmistakable.** Source, commission relevance, payment recipient, and next step are visible before commitment.
2. **Move work forward.** Every operational screen emphasizes the next legitimate action instead of exposing raw status manipulation.
3. **One system, context-aware behavior.** Marketplace and direct work share components and patterns, with controlled variants for their different terms.
4. **Professional at the job site.** Mobile composition, touch targets, scanability, save/recovery, and photo handling are first-class.
5. **AI supports judgment.** AI recommendations show useful reasoning and confidence without pretending to replace vendor review.

## 8. Gaps routed to the correct authority

### Product gaps for MPS confirmation before final client-portal design

- Exact customer-facing disclosure for direct payment: who processes payment, who owns refunds/disputes, and which Marketplace protections do or do not apply.
- Exact Marketplace job-board visibility and competition model: open to all eligible vendors, matched shortlist, invitation, or a staged combination.
- Whether a homeowner compares multiple submitted quotes inside one Marketplace comparison experience or receives separate vendor portals before checkout.
- Evidence/approval for public trust claims such as vendor count, rating, licensing/insurance, and response-time promises.

These gaps do not block Gate 2 foundations. They block final source-specific acceptance/payment compositions in Gates 4–5.

### Technology concerns reserved for MTS

- Identity/session relationship between Marketplace and Quote Tool.
- Payment provider and direct-payment integration mechanics.
- Event synchronization, data ownership, entitlements, commission calculation, and legal/audit records.
- Production source-of-truth for opportunity and quote lifecycle transitions.

## 9. Gate 1 approved boundary

Gate 1 is approved with the following boundary:

- Preserve aligned composition and reusable flows, while replacing conflicting Quote Tool foundation tokens with the approved Marketplace foundation.
- Treat the approved Marketplace MDS as the parent design authority for color, typography, spacing, shape, elevation, iconography, and shared shell behavior.
- Redesign the product around a source-aware opportunity-to-payment journey.
- Do not split Marketplace and direct quoting into separate brands or duplicate builders.
- Carry the four MPS product gaps above as explicit dependencies rather than inventing policy inside MDS.
- Move next to Gate 2 Foundations: identity, colors, typography, spacing, shape/elevation, iconography, accessibility target, visual language, and Do/Don't rules.
