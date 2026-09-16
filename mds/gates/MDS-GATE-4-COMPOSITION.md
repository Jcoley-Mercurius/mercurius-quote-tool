# Mercurius Quote Tool — MDS Gate 4 Composition

Status: Approved  
System: Mercurius Design System  
Consumes: Approved Gates 1–3 and Quote Tool MPS v1.0  
Parent authority: Approved Marketplace/ReImagine MDS v1.0 layout system  
Repository baseline: `41e2568`  
Prepared: 2026-09-08
Approved by: Product owner  
Approved: 2026-09-08

## 1. Composition outcome

The Quote Tool will use a recognizable Marketplace shell across public entry, vendor operations, quote creation, and customer commitment. Marketplace and Direct work share page structures. Source-specific information changes inside those structures without creating separate navigation, duplicate builders, or separate visual brands.

Composition prioritizes three modes:

1. **Find and triage work** — scan opportunities, quotes, customers, and jobs efficiently.
2. **Build and review a quote** — enter scope, use AI assistance, edit pricing, and verify terms without losing context.
3. **Make a commitment** — review source, price, terms, acceptance, and payment path in a calm, explicit sequence.

Mobile is a primary job-site composition. It is not a compressed version of the desktop screenshots.

## 2. Grid, containers, and gutters

The Quote Tool inherits the approved Marketplace grid:

| Range | Columns | Gap | Gutter |
| --- | ---: | ---: | ---: |
| Wide ≥1280px | 12 | 24px | 64px |
| Desktop ≥1024px | 12 | 24px | 48px |
| Tablet ≥768px | 8 | 20px | 32px |
| Mobile <640px | 4 | 16px | 20px; 16px on narrow mobile |

Breakpoints remain **640, 768, 1024, 1280, and 1536px**.

Maximum content widths:

- Marketplace/public: 96rem.
- Vendor operational workspace: 80rem.
- Guided builder/detail: 72rem inside the operational shell.
- Reading and document content: 45rem.
- Client quote with decision rail: 72rem.
- Full media inspection: available viewport within a bounded dark utility surface.

Marketing section rhythm remains 96/72/56px across desktop/tablet/mobile. Operational rhythm is 48/40/32px; compact workflow rhythm is 32/28/24px.

## 3. Application shell and navigation

### Global Marketplace header

- Height: 64px desktop, 56px mobile.
- Always presents the Mercurius identity, current workspace identity when authenticated, account access, and a clear way back to Marketplace context.
- Vendor branding may accompany Mercurius but does not replace it in the operational shell.
- The header remains sticky only when it does not consume excessive mobile viewport space.

### Vendor workspace shell

Desktop and wide screens use a 264px left navigation rail plus flexible main content. The rail is sticky beneath the global header and scrolls independently when required. The main content area uses the 80rem operational maximum and must not be artificially narrow on data-heavy pages.

Navigation groups:

| Group | Destinations | Rule |
| --- | --- | --- |
| Work | Overview, Opportunities, Quotes, Jobs | Always visible; follows acquisition-to-delivery order |
| Relationships | Customers, Messages | Customer and communication context |
| Business | Storefront, Services, Analytics, Business plan | Collapsible on desktop; available under More on mobile |
| Manage | Team, Settings | Administrative destinations, visually separated from daily work |

Properties are accessed contextually through customers, opportunities, quotes, and jobs rather than competing as a primary daily destination. If the standalone property index remains product-required, it lives under Relationships.

The current 13-item undifferentiated navigation list is deprecated. Active navigation uses ink emphasis and `aria-current`; it does not use success green.

### Mobile navigation

Authenticated mobile uses a five-position bottom navigation:

1. Overview
2. Opportunities
3. New quote
4. Quotes
5. More

`New quote` is a structural ink action, not a success or AI action. `More` opens an accessible full-height sheet containing Jobs, Customers, Messages, Business, Team, Settings, and workspace switching. The compact header retains Mercurius/workspace identity and account access. Bottom navigation respects safe-area insets and never overlaps page actions.

Public and client-quote pages do not show the vendor bottom navigation.

## 4. Page shells

| Shell | Use | Desktop composition | Mobile transformation |
| --- | --- | --- | --- |
| Public Marketplace | Landing, repair request entry | Marketplace header/footer, 96rem canvas, bounded hero/content | Single-column story; primary homeowner action first |
| Vendor workspace | Overview, lists, settings | Header + 264px rail + 80rem main | Compact header + bottom navigation + single main column |
| Operational list | Opportunities, quotes, jobs, customers | Page header, metrics, filter band, table/rows | Summary metrics, filter sheet, stacked cards |
| Detail + action rail | Opportunity, quote, customer/job detail | 8-column evidence/content + 4-column sticky action rail | Source/priority summary, content, then safe-area action bar |
| Guided quote builder | Create/edit quote | 8-column step content + 4-column progress/summary rail | One step at a time + compact progress + sticky Back/Continue |
| Customer quote | Review, changes, acceptance | 8-column document + 4-column price/decision rail | Document sections followed by fixed-context decision action |
| Settings | Profile, workspace, brand, photos | 3-column local nav + 9-column form | Section picker/accordion + one form section at a time |
| Media viewer | Job-photo inspection | Bounded dark overlay with controls and metadata | Full viewport with safe-area controls and swipe plus buttons |

Summary and action rails are sticky only while their full content fits safely. At smaller heights they return to document flow or use a compact non-obscuring action bar.

## 5. Public Marketplace and homeowner request

### Public landing

The public Quote Tool entry must be reachable without an authenticated vendor session and use the Marketplace header/footer. The primary hierarchy is:

1. Homeowner value statement.
2. `Request a repair` primary action.
3. Vendor sign-in/learn-more secondary path.
4. How matching and quoting work.
5. Evidence-backed trust and local-market information.

The split-image hero from the supplied reference can be retained and rebranded to approved foundations. Unsupported vendor-count, rating, speed, licensing, or insurance claims are omitted until MPS evidence is approved.

### Repair request flow

Use a short guided flow rather than one intimidating page:

1. Repair type and urgency.
2. Property/location.
3. Description and photos.
4. Contact/account context.
5. Review and submit.

Desktop may show the form and a concise request summary side by side. Mobile shows one step at a time. The final review repeats what vendors can see, what happens next, and any applicable privacy/source information.

## 6. Vendor overview and operational lists

### Overview / command center

Hierarchy:

1. Work needing attention: new opportunities, response deadlines, requested changes, accepted quotes needing next action.
2. Primary action: create direct quote.
3. Pipeline summary with explicit periods and definitions.
4. Recent activity and setup/business guidance.

Attention items appear before vanity metrics. The screen must not imply that total pipeline value is realized revenue.

### Opportunities

Desktop uses a readable row/list layout rather than oversized stacked cards. A row carries source, service, customer/location, urgency/deadline, photo completeness, response state, and next action. Filters remain in a persistent band below the page header.

Mobile uses stacked opportunity cards. A filter button opens a bottom sheet; active filters remain visible as removable chips. The next action appears in the card footer and does not compete with destructive actions.

### Quotes and history

The supplied history screen is reorganized into:

1. Page title, workspace, and `New quote` action.
2. A restrained metric strip.
3. Search and source/status/service filters.
4. Quote list grouped or sorted by attention and recency.

Desktop rows show quote reference, source, customer/job, lifecycle status, amount, last activity, and next action. Mobile cards show the same fields in labeled groups. Status is never a free-form dropdown. Delete/archive moves to overflow.

### Customers, jobs, and messages

Customer and job details use the detail + action rail shell. Messages remain contextual to the related opportunity, quote, customer, or job even when a unified inbox exists. Cross-links preserve context and offer a clear return path.

## 7. Guided quote builder

The current long, all-sections-visible form becomes a recoverable guided workflow.

### Steps

1. **Source and customer/request** — Marketplace request or Direct customer, plus save target.
2. **Property and service** — location, service type, property facts, and manual fallback.
3. **Scope and photos** — description, special requests, existing evidence, and upload.
4. **Draft pricing and options** — explicit AI generation, line-item review, quote tiers/options.
5. **Terms, branding, review, and send** — expiry, payment path, presentation, preview, and commitment.

### Desktop

- Eight columns hold the active step.
- Four columns hold source, customer/request summary, progress, autosave state, and quote total when available.
- The rail offers navigation to valid completed steps but does not expose incomplete future sections as editable all at once.
- AI generation happens only after adequate source/scope context and uses the coral AI action.

### Mobile

- Show one active step and a compact `Step n of 5` indicator.
- Keep source context visible beneath the page title.
- Place Back and Continue in a safe-area sticky action bar; only one forward action is primary.
- Save continuously and display concise `Saving…`, `Saved`, or recovery feedback.
- Move summary content inline before final review rather than hiding consequential information in a drawer.
- Preserve entered content when navigating steps, losing connectivity, or encountering recoverable validation errors.

### Validation and recovery

Validation occurs after field interaction and at step progression. When a step cannot advance, focus moves to the error summary or first invalid field. Server/AI failure preserves manual editing and offers one safe retry. A generation failure does not invalidate the source data already entered.

## 8. Opportunity detail and quote response

Marketplace opportunity detail uses the detail + action rail shell:

- Main content: original homeowner request, property, timing, photos, questions/communication, and activity.
- Rail: source label, response deadline, eligibility/visibility information when approved, response status, and `Create quote`.

Evidence comes before pricing controls when it informs the decision. On mobile, the source/deadline summary appears before the evidence and the action bar follows after sufficient context. The exact Marketplace vendor-visibility/competition model remains an MPS dependency and cannot be implied through composition.

## 9. Customer quote, comparison, and acceptance

### Individual quote portal

The client portal uses a calm document composition:

1. Vendor identity and Mercurius/source context.
2. Quote title, reference, issue/expiry dates.
3. Scope, photos, and exclusions.
4. Options/line items and financial summary.
5. Schedule, warranty, and terms.
6. Request changes or acceptance.
7. Source-appropriate payment handoff.

Desktop keeps the selected option, total, expiry, and legitimate next action in a 4-column decision rail. Mobile repeats the selected total immediately before the final action; a compact sticky bar may show the amount and action only after the user has reached the decision section.

### Marketplace comparison

Gate 4 reserves a comparison shell but does not finalize it while the MPS multi-quote comparison policy is open. If approved, desktop uses labeled comparison rows with a persistent vendor/option header; mobile uses one selected quote at a time with an explicit compare tray. Source, total, scope, exclusions, schedule, warranty, and expiration must remain comparable without horizontal precision gestures.

### Acceptance and payment

Acceptance is a distinct consequential step, never an inline row action. The summary immediately before confirmation includes selected option, total, expiry, terms, source, payment recipient/path, and applicable protection/support language.

- Marketplace acceptance progresses to Marketplace checkout.
- Direct acceptance progresses to the approved vendor payment method or instructions.

The exact Direct payment processor and refund/dispute/protection language remain MPS/MTS dependencies. Until resolved, no composition may promise a specific provider or Marketplace protection.

## 10. Settings and workspace management

Settings uses local navigation organized as:

1. Business profile and customer-facing brand.
2. Pricing and defaults.
3. Photos and storage.
4. Workspace members and permissions.
5. Notifications/integrations when product-approved.

The setup checklist is a temporary progress panel, not permanent page chrome. Desktop shows local section navigation beside the form; mobile uses a section picker and a single focused form section. Save actions are scoped to the visible section and report saved/recovery state persistently.

Personal/team switching remains global workspace context. `Save quote to` remains a builder decision because it affects visibility, branding, and collaboration. Neither is confused with Marketplace/Direct source.

## 11. Responsive transformation rules

- Collapse the global rail before collapsing source, price, deadline, or action context.
- Convert tables to labeled cards; do not force essential horizontal scrolling.
- Convert desktop summary rails into inline summaries before consequential actions.
- Convert multi-column forms into one semantic field group at a time.
- Convert filter bands into trigger + sheet while keeping active filters visible.
- Preserve direct access to opportunity, new quote, and quote pipeline through mobile navigation.
- Keep images responsive without hiding captions, source, or controls.
- Provide button alternatives to drag, swipe, and gesture-only interactions.
- Respect 16–20px mobile gutters, 44px targets, safe areas, text zoom, and 320 CSS px reflow.
- Sticky elements may not cover focused content, errors, browser controls, or each other.

## 12. Interaction and state behavior

### Autosave

Quote creation and editing autosave after meaningful changes. Status remains near the page title/action rail. Navigation away with uncommitted or failed changes produces a clear recovery prompt; successful autosave does not interrupt work with repeated toasts.

### Loading

Use geometry-matched skeletons for lists, cards, and document sections. Use inline progress for property lookup, photo upload, AI generation, send, acceptance, and payment handoff. Never show an empty white page while application state resolves.

### Empty and error

- First-use empty: explain value and provide one primary start action.
- Filtered empty: retain filters, explain no matches, and offer clear/reset.
- Permission empty: explain missing access without revealing unavailable data.
- Error: explain failure, what remains saved, consequence, and one safe recovery.
- Unknown external payment/send state: reconcile before offering retry.

### Destructive and consequential actions

Delete, archive, withdraw, transfer ownership, acceptance, send, and payment each identify the affected object and consequence. Destructive actions are not placed beside forward actions. Pending actions prevent duplicate activation and return a durable result/receipt.

## 13. Accessibility and composition

- Each page has one H1 and a logical heading sequence independent of card styling.
- Landmarks identify header, navigation, main content, complementary summary, and footer where applicable.
- Skip navigation reaches main content; focus moves predictably after route and step changes.
- Bottom navigation, drawers, filters, and sticky action bars remain fully keyboard operable.
- Mobile DOM order follows reading and decision order; CSS reordering cannot place evidence after commitment controls for assistive technology.
- Tables expose headers and scope; transformed cards retain programmatic labels.
- Live updates announce result counts, autosave, lookup, upload, AI generation, send, acceptance, and payment without flooding announcements.
- At 200% zoom and 320 CSS px width, no essential content or action is lost.

## 14. Existing implementation disposition

| Existing composition | Disposition |
| --- | --- |
| 72px top header | Modify to inherited 64px desktop / 56px mobile Marketplace header |
| 256px desktop sidebar | Keep/modify to 264px grouped navigation rail |
| 13-item flat navigation | Replace with Work, Relationships, Business, and Manage groups |
| Full-screen mobile menu only | Modify to five-position job-site bottom navigation plus More sheet |
| 1600px shell and 6xl inner container | Normalize to inherited 96rem public / 80rem operational / 72rem guided widths |
| Long all-on-one-page quote form | Replace composition with guided 5-step builder while reusing fields/components |
| Sticky `Generate Quote` on incomplete form | Replace with step-aware Back/Continue and explicit coral AI generation at pricing step |
| Oversized opportunity/history cards | Modify to efficient desktop rows and labeled mobile cards |
| Client portal `No payment due now` | Replace with source-aware acceptance/payment composition after policy resolution |
| Desktop-only screenshot authority | Keep as desktop evidence only; Gate 5 must generate mobile canonical references |

## 15. Gate 4 approved decision bundle

Approval authorizes:

1. The inherited grid, breakpoints, gutters, content widths, and section rhythms.
2. The Marketplace global header, grouped 264px desktop rail, and five-position mobile bottom navigation.
3. The eight page shells and their responsive transformations.
4. Public Marketplace entry and guided homeowner request composition.
5. Attention-first overview and efficient operational list/detail compositions.
6. The recoverable five-step desktop/mobile quote builder.
7. Document-plus-decision-rail customer quote and explicit acceptance sequence.
8. Contextual properties/messages and focused settings composition.
9. Autosave, loading, empty, error, recovery, destructive, and consequential interaction behavior.
10. The implementation dispositions above and a Gate 5 requirement for canonical desktop and mobile visual references.

Open MPS gaps still block exact Marketplace comparison, vendor-visibility, and Direct-payment content. They do not block the shared composition system.

## 16. Gate 4 completion

The product owner approved this composition bundle on 2026-09-08. Gate 4 is complete. Gate 5 References is open and will create the visual contract: core foundations, layout/behavior, component library, and canonical desktop/mobile screens for the most consequential Marketplace and Direct quote journeys.
