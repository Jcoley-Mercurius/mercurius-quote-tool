# Mercurius Quote Tool — MDS Gate 3 Components

Status: Approved  
System: Mercurius Design System  
Consumes: Approved Gate 2 Foundations and Quote Tool MPS v1.0  
Repository baseline: `41e2568`  
Prepared: 2026-09-08
Approved by: Product owner  
Approval date: 2026-09-08

## 1. Component-system outcome

The Quote Tool will use one reusable component system for Marketplace opportunities and vendor-created direct quotes. Source changes content, disclosure, and downstream action—not the base component anatomy or brand foundation.

Existing React components should be retained where their responsibility is sound, then normalized around shared primitives and domain patterns. One-off Tailwind treatments, inline SVG copies, raw status controls, and source-specific duplication are deprecated. This is a controlled refactor, not a visual rewrite.

## 2. Shared component contract

Every interactive component must support the applicable states from this vocabulary:

`default`, `hover`, `focus-visible`, `active`, `selected`, `disabled`, `loading`, `success`, `warning`, `error`, `empty`.

Rules:

- Focus-visible uses the approved 3px focus ring and may not be suppressed by selected or error styling.
- Loading preserves the action label or provides an equally descriptive accessible name, prevents duplicate submission, and communicates progress.
- Disabled controls must explain prerequisites when the reason is not obvious; disabled is not a substitute for permission feedback.
- Selected is an ink/focus state. Completed and successful states use green.
- Error styling includes text and recovery guidance, not color alone.
- Destructive actions remain visually separated from forward actions and require confirmation when data loss is material.
- All icon-only controls have a visible tooltip on hover/focus and an accessible name.

## 3. Applicability inventory

### Required shared primitives

| Component | Required variants | Minimum states | Existing direction |
| --- | --- | --- | --- |
| Button | structural, AI, progression, secondary, quiet, destructive | default, hover, focus, active, disabled, loading | Consolidate existing buttons into one primitive |
| Icon button | neutral, elevated, destructive | default, hover, focus, active, disabled | Use for overflow, close, download; never unlabeled |
| Text link | default, subtle, destructive | default, hover, focus, visited where relevant | Preserve link semantics; do not style buttons as links without reason |
| Text input | text, email, phone, currency, address, search | default, focus, filled, disabled, read-only, error, success | Normalize labels, help text, prefixes, and errors |
| Textarea | default, assisted prompt | default, focus, disabled, error, character-limit | Preserve job-description pattern with usable guidance |
| Select / combobox | native select, searchable combobox | default, open, focus, selected, disabled, error, loading, no-results | Address and customer lookup use combobox behavior |
| Checkbox / radio | default, card-selection | default, hover, focus, checked, disabled, error | Use semantic controls beneath selection cards |
| Search and filter control | search, filter select, removable filter | default, active, loading, no-results | Preserve operational filtering with clear reset |
| Badge / tag | source, lifecycle, urgency, category, workspace | default and applicable semantic state | Standardize labels and prohibit color-only meaning |
| Progress | stepper, completion bar, status timeline | current, complete, incomplete, error, blocked | Current is ink; complete is green |
| Card / panel | static, selectable, actionable, summary, elevated | default, hover if actionable, focus, selected, disabled, loading, empty | Border-first; no false click affordance |
| Tabs / segmented control | page tabs, bounded mode selection | default, hover, focus, selected, disabled | Use for same-level views, not sequential workflow |
| Menu / dropdown | action menu, account/workspace menu | closed, open, focus, disabled, destructive item | Move secondary and destructive row actions here |
| Alert / banner | info, success, warning, error | visible, dismissible where safe | Include title, message, recovery action |
| Dialog / drawer | confirmation, form, detail, mobile action sheet | opening, open, loading, error, closing | Focus trap, return focus, escape behavior |
| Table / responsive list | operational table, comparison table | loading, populated, empty, error | Preserve label/value relationships on mobile |
| Skeleton / spinner | page, card, inline | loading | Match final geometry and avoid false progress |
| Empty state | first-use, filtered-empty, permission-empty | empty | Explain cause and legitimate next action |
| Tooltip | descriptive only | hover, focus | Never contain required workflow information |

### Optional

| Component | Use boundary |
| --- | --- |
| Switch | Only for immediate binary settings; not for form submission or permissions |
| Toast | Supplemental confirmation for noncritical actions; never the sole record of payment, send, or acceptance |
| Pagination | Use when operational result volume requires it; do not pre-emptively paginate small lists |
| Breadcrumb | Use only if Gate 4 establishes nested detail navigation that benefits from it |
| Date picker | Use for quote expiry or scheduling only when MPS policy requires structured dates |
| Inline edit | Use for reversible low-risk fields; never raw lifecycle or payment-state editing |

### Not applicable for v1

- Decorative carousels inside authenticated quoting workflows.
- Floating action buttons that obscure content or duplicate the primary action bar.
- Drag-and-drop as the only way to reorder quote items.
- Color pickers for vendor branding beyond approved, bounded brand configuration.
- Data visualization components beyond simple approved metrics; no chart system is required for the current release.

## 4. Action components

### Button

| Variant | Color role | Examples |
| --- | --- | --- |
| Structural primary | Marketplace ink | Create quote, Open opportunity, Save changes, Continue editing |
| AI action | Mercurius coral | Generate draft with AI, Regenerate suggestion |
| Progression | Mercurius green | Send quote, Accept quote, Continue to Marketplace checkout, Mark setup complete |
| Secondary | Card surface with ink border/text | Cancel, Back, Preview, Compare |
| Quiet | Transparent with ink text | Refresh, Reset filters, Dismiss |
| Destructive | Error role | Delete draft, Remove member, Revoke access |

Sizes:

- `md`: 44px minimum height; default application control.
- `lg`: 52px height; prominent customer progression and mobile sticky action.
- Compact visual treatments may be used in dense rows only when the interactive target remains at least 44×44px.

Buttons use sentence-case verb-first labels. Arrow icons may reinforce forward movement but cannot replace the action label. A sticky action becomes enabled only when required information is valid; its disabled state includes a discoverable reason.

### Lifecycle action bar

One domain component owns the legitimate next actions for a quote or opportunity. It contains one primary forward action, optional secondary actions, save/status feedback, and an overflow menu. It replaces free-form status dropdowns.

- Marketplace example: `Create quote` → `Submit quote` → `Continue to Marketplace checkout` after homeowner acceptance.
- Direct example: `Create quote` → `Send quote` → `Record payment` or approved direct-payment handoff after acceptance.
- Delete, withdraw, and archive remain in overflow with consequence-aware confirmation.

## 5. Identity, source, and status components

### Source context label

Required persistent variants:

- `Marketplace` — includes Marketplace icon/mark, neutral treatment, and concise payment/support explanation at consequential steps.
- `Direct customer` — includes person/business icon, neutral treatment, and direct-payment/no-Marketplace-commission explanation where relevant.

Source appears in opportunity detail, quote builder, preview, history, client portal, acceptance, and payment handoff. Workspace ownership (`Personal`, team name) is separate metadata and never substitutes for source.

### Lifecycle status

Lifecycle status uses a badge plus plain-language text. Proposed visual mapping:

- Neutral: Draft, Not started, Archived.
- Information: Sent, Viewed, Changes requested.
- Warning: Expiring, Response due, Attention needed.
- Error: Expired, Failed, Canceled.
- Success: Accepted, Paid, Completed.

Only valid product transitions are actionable. Status badges are not editable controls.

### Urgency and service tags

Urgency (`Emergency`, `This week`, `Flexible`) and service category (`HVAC`, `Pool`, `Roofing`) remain separate tag families. Emergency uses error semantics with visible text; timing tags do not alter quote status.

## 6. Opportunity components

### Opportunity card / row

An opportunity item contains:

1. Source label and received/due metadata.
2. Customer or homeowner identity as allowed by product policy.
3. Service, location, and short problem summary.
4. Photo count and completeness indicators.
5. Current response state.
6. One legitimate next action plus overflow.

The full card may be clickable only when it has one unambiguous destination. Nested actions retain independent focus targets. Repeated customer contact data must be formatted consistently and protected according to MPS/MTS policy.

### Opportunity filters

Search, service, source, urgency, response state, and date filters use one filter group. Active filters appear as removable chips with `Clear all`. Results announce updates without moving focus. Filtered-empty differs from true first-use empty.

### Opportunity summary

The detail summary groups request description, property, timing, homeowner photos, and contact context. Marketplace request text remains visibly original; AI summaries are labeled as generated and do not replace source content.

## 7. Quote-builder components

### Quote builder stepper

The current numbered sections become a semantic stepper:

1. Source and customer/request.
2. Property and service.
3. Scope and photos.
4. Draft pricing and options.
5. Terms, branding, review, and send.

Gate 4 will determine desktop/mobile composition, but the component must support current, complete, incomplete, blocked, and error states. A user can revisit completed steps without implying the workflow is undone.

### Form section

Each section has a heading, concise purpose, optional completion summary, field group, validation region, and optional contextual assistance. Numbered ornamentation does not replace heading semantics.

### Service selector

Service tiles use icon, service name, and semantic radio behavior. Selection uses ink outline/surface plus check or radio state—not success green. `Other` reveals a labeled text input.

### Property lookup

Address autocomplete and property lookup are one compound component with:

- Search suggestion state, loading, no result, service failure, and manual-entry fallback.
- Clearly sourced auto-filled values.
- Editable fields when product rules permit correction.
- No silent overwrite of customer-entered data.

### Photo upload and gallery

Photo upload supports browse, camera where available, drag/drop as enhancement, progress, retry, cancel, file rejection, preview, caption, remove, and empty states. File rules are visible before selection. PhotoViewerModal becomes an accessible viewer with close, previous/next, caption, count, zoom where useful, and bounded dark treatment.

### AI draft panel

AI output appears in a coral-accented, review-required panel containing:

- `AI-generated draft` label.
- Inputs used or missing context summary.
- Recommended scope and pricing with reasoning.
- Confidence/uncertainty language when supported.
- `Apply to quote`, `Edit`, and `Regenerate` actions.
- Warning when vendor verification is required.

AI recommendations never overwrite vendor edits without confirmation and never appear as accepted customer terms until reviewed.

### Line-item editor

Line items support description, quantity, unit, material/labor designation where relevant, unit price, amount, reorder, duplicate, and remove. Totals update accessibly. Keyboard controls supplement drag-and-drop. Destructive removal is reversible when practical.

### Quote options / price tiers

Good/better/best or equivalent options share a comparison anatomy: option name, short fit statement, included scope, exclusions, schedule, warranty/terms, subtotal/tax/fees/total, and customer selection. `Recommended` is explanatory, not automatically green or preselected without a product rule.

### Financial summary

Subtotal, discounts, tax, Marketplace fees/commission disclosure where customer-visible, deposit, balance, and total use tabular numerals and explicit labels. The component never merges vendor revenue, customer total, Marketplace fee, and pipeline value into one ambiguous number.

## 8. Customer quote and commitment components

### Customer quote header

Contains bounded vendor branding, vendor identity/contact, quote reference, issue/expiry dates, and persistent source context. Mercurius attribution remains visible without competing with the vendor’s presentation.

### Quote review sheet

A calm, document-like card groups scope, options, photos, terms, financial summary, and change history. Customer choices persist when moving between sections. Print/PDF and browser presentation share the same hierarchy, while interaction controls remain channel-appropriate.

### Change request panel

Customers can explain requested changes before acceptance. The panel shows submitted, acknowledged, resolved, and superseded states without changing the quote lifecycle through a generic dropdown.

### Acceptance panel

Acceptance includes selected option, total, important terms, typed/drawn signature when required, consent text, and a final explicit action. It prevents duplicate acceptance and provides a durable confirmation view.

### Source-aware payment handoff

- Marketplace: acceptance confirms the vendor/option and moves into Mercurius Marketplace checkout using progression green.
- Direct: acceptance confirms the quote, then presents the vendor’s approved direct-payment method or instructions and clearly states applicable support/protection boundaries.

The exact direct-payment processor, disputes, refunds, and protection language remain MPS/MTS dependencies. The component anatomy is approved only after those gaps are resolved.

## 9. Workspace and supporting components

### Workspace switcher and save target

Personal/team ownership is selected independently from Marketplace/Direct source. The save-target component states who can see and edit the quote. Changing ownership is a consequential action when collaborators or branding change.

### Onboarding checklist

Retain setup progress, required versus optional tasks, and resumability. Completed tasks use green and a check. `Mark complete` is allowed only where completion is user-attested; otherwise completion follows validated data.

### Metric card

Metrics have label, value, optional period/comparison, and loading/empty/error states. Color is semantic: accepted or paid outcomes may use green; pipeline value remains ink. Metric cards do not imply clickability unless they navigate.

### Business profile and brand snapshot

Profile settings preview how vendor identity appears in customer quotes. Each sent quote preserves a labeled brand snapshot so later profile edits do not silently alter historical documents.

## 10. Feedback and system-state components

- Inline validation is primary for field errors; an error summary appears when submission fails across multiple sections.
- Alerts communicate persistent risk, policy, or recovery. Toasts supplement—not replace—send, acceptance, payment, invitation, and ownership confirmation.
- Skeletons match intended content shape. Spinners are limited to small indeterminate actions.
- Empty states distinguish first use, no filter results, no permission, and unavailable data.
- Optimistic state must visibly reconcile with success or failure; never leave an action appearing complete after a rejected request.

## 11. Existing repository disposition

| Existing area | Disposition |
| --- | --- |
| `QuoteFlow`, `QuoteForm`, `FormSection` | Keep/modify into the approved builder, stepper, and section contracts |
| `AddressAutocompleteInput`, `PropertyLookupSection` | Keep/modify into the compound property lookup |
| `PhotoUpload`, `JobPhotosGallery`, `PhotoViewerModal` | Keep/modify with shared file, progress, error, and accessible viewer states |
| Opportunity list/detail/filter components | Keep/modify around OpportunityCard, OpportunitySummary, and filter contracts |
| Client portal and acceptance components | Keep/modify around QuoteReviewSheet, ChangeRequest, AcceptancePanel, and PaymentHandoff |
| Workspace switcher/save target/settings | Keep/modify; separate workspace ownership from source provenance |
| Dashboard metrics | Keep/modify; remove decorative green from neutral financial values |
| Inline SVG icons | Deprecate in favor of the shared icon wrapper |
| Free-form status selects | Replace with lifecycle status plus valid next actions |
| Repeated local button/input/card styles | Replace incrementally with shared primitives |

## 12. Component accessibility requirements

- Semantic HTML controls remain the interaction source; visual cards do not replace radios, checkboxes, buttons, or links.
- Form fields maintain persistent labels, described-by help/error associations, and error recovery.
- Dialogs trap focus, close predictably, and return focus to the invoking control.
- Menus, comboboxes, tabs, steppers, tables, and galleries implement their established keyboard patterns.
- Live regions announce asynchronous lookup, AI generation, save, send, acceptance, and payment results at an appropriate priority.
- Prices and status changes are understandable to screen readers without relying on spatial placement.
- Reordering and photo management provide keyboard and non-drag alternatives.
- Mobile sticky action areas respect safe areas and do not cover focused fields or validation messages.

## 13. Gate 3 approved decision bundle

Gate 3 approval authorizes:

1. The shared primitive inventory, state vocabulary, and applicability classifications.
2. The six semantic button variants and lifecycle action bar.
3. Persistent, text-based Marketplace/Direct source context separated from workspace ownership.
4. Noneditable lifecycle badges paired with valid next actions.
5. The source-aware opportunity, builder, customer quote, acceptance, and payment component families.
6. Review-required AI draft behavior and coral AI treatment.
7. Accessible line-item, photo, comparison, financial, dialog, menu, table/list, loading, error, and empty-state contracts.
8. Incremental reuse/modify/deprecate/replace disposition for the current repository.

The direct-payment policy gap remains a blocker only for final PaymentHandoff content and behavior, not for the rest of the component system.

## 14. Gate 3 completion

Gate 3 is complete. Gate 4 will define page shells, containers, navigation, information hierarchy, responsive transformations, mobile job-site behavior, and the end-to-end page patterns that compose these components.
