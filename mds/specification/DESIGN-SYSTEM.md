# Mercurius Quote Tool Design System

System: Mercurius Design System  
Version: v1.0  
Status: Active  
Project: Mercurius Quote Tool  
Accessibility target: WCAG 2.2 AA

## 1. Authority

MPS v1.0 owns product scope, policy, roles, requirements, and acceptance. This MDS owns visual language, components, interaction, responsive behavior, and design accessibility. MTS owns architecture, integrations, security, reliability, deployment, and the approved Agent Skill Manifest.

Visual conflict order:

1. approved product requirement;
2. current MDS state and this specification;
3. tokens;
4. component specifications;
5. layout and pattern specifications;
6. canonical references;
7. existing implementation.

## 2. Identity and visual language

- Exact identity asset: `references/mercurius-logo.png` (MDS-REF-017).
- Preserve artwork and proportions. Do not redraw, approximate, replace, stretch, crop, or omit it on primary branded surfaces and exported customer artifacts.
- Personality: professional, fast, trustworthy, locally intelligent, transparent.
- Surfaces are warm and restrained; borders carry hierarchy before shadows.
- Dark surfaces are bounded utilities such as photo inspection, never the default workspace.
- Vendor branding may accompany Mercurius but does not replace system identity or semantic states.

## 3. Foundations

### Color

| Role | Token | Value |
| --- | --- | --- |
| Primary content | `color.brand.ink900` | `#1F242E` |
| Structural action | `color.brand.ink800` | `#29303D` |
| Marketplace/progression | `color.brand.green600` | `#3F8361` |
| Progression on dark | `color.brand.green500Dark` | `#4FB080` |
| Explicit AI generation | `color.brand.coral600` | `#D76742` |
| Success | `color.semantic.success` | `#3F8361` |
| Warning | `color.semantic.warning` | `#B26B19` |
| Error/destructive | `color.semantic.error` | `#DC2828` |
| Information | `color.semantic.info` | `#308CE8` |
| Page | `color.surface.lightPage` | `#FBFAF9` |
| Card/document | `color.surface.lightCard` | `#FDFDFC` |
| Muted grouping | `color.surface.lightMuted` | `#F6F5F3` |
| Recessed/disabled | `color.surface.lightSecondary` | `#F1F0EE` |
| Border | `color.border.light` | `#E5E2DC` |
| Focus | `color.border.focus` | `#4B9B73` |
| Muted text | `color.text.lightMuted` | `#676F7E` |

Ink is the ordinary action color. Green means trusted progression or verified outcome. Coral identifies explicit AI generation. Source, status, urgency, price movement, and progress never rely on color alone.

### Typography

Use Manrope for display and UI. Weights: 400, 500, 600, 700. Operational text is at least 14px; 12px is limited to short labels with sufficient contrast. Use sentence case and tabular numerals for aligned financial values.

| Role | Desktop | Mobile |
| --- | ---: | ---: |
| Display XL | 64px | 44px |
| Display LG | 52px | 40px |
| H1 | 44px | 34px |
| H2 | 34px | 28px |
| H3 | 24px | 22px |
| Title | 18px | 18px |
| Body large | 18px | 17px |
| Body | 16px | 16px |
| Body small | 14px | 14px |
| Label | 12px | 12px |

### Spacing, shape, elevation

- Base unit: 4px. Approved scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px.
- Radii: 8, 12, 16, 24, 32px, and pill.
- Default light border: `1px #E5E2DC`; focus ring: persistent 3px `#4B9B73` with visual separation.
- Use border and surface first; reserve elevation for sticky separation, menus/popovers, and consequential overlays.
- Motion: 150ms fast, 220ms base, 320ms deliberate; honor `prefers-reduced-motion`.

### Icons

Use Lucide or the MTS-approved equivalent through one reusable icon wrapper. Default treatment is rounded 2px outline at 16/20/24px. Pair source, financial, status, urgency, and destructive icons with visible text. Deprecate copied inline SVGs.

## 4. Components

Implementation order is **REUSE → COMPOSE → EXTEND → CREATE**. Required shared families:

- actions: structural, AI, progression, secondary, quiet, destructive buttons; 44px default and 52px prominent;
- fields: input, textarea, search, currency, address, select/combobox, checkbox, radio, card selection;
- identity/state: source label, lifecycle status, urgency/service tag, workspace label;
- structure: card/panel, metric card, financial summary, tabs, stepper, timeline;
- overlays: dialog, drawer, action sheet, menu, tooltip, photo viewer;
- feedback: validation, error summary, alert, banner, toast, skeleton, spinner, empty state;
- domain: opportunity row/card/summary/filter, quote builder, line items, options, customer quote, changes, acceptance, payment handoff;
- data: table, responsive list, labeled mobile card, status-preserving financial display.

Semantic HTML controls remain the interaction source. Status is not a free-form dropdown. Critical feedback persists in context; toasts supplement it.

## 5. Grid and responsive system

Breakpoints: 640, 768, 1024, 1280, 1536px.

| Range | Columns | Gap | Gutter |
| --- | ---: | ---: | ---: |
| ≥1280 | 12 | 24px | 64px |
| ≥1024 | 12 | 24px | 48px |
| ≥768 | 8 | 20px | 32px |
| <640 | 4 | 16px | 20px; 16px narrow |

Content maxima: public 96rem; operational 80rem; guided/detail 72rem; reading/document 45rem; customer quote 72rem.

Desktop vendor workspace uses a grouped 264px rail. Mobile uses bottom navigation: Overview, Opportunities, New quote, Quotes, More. Tables become labeled cards. Summary/action rails move inline before consequential actions. Sticky elements must not obscure focus, errors, content, safe areas, or one another. Reflow at 320 CSS px and 200% zoom is mandatory.

## 6. Page shells and route coverage

| Shell | Routes/use | Canonical references |
| --- | --- | --- |
| Public Marketplace | `/` | MDS-REF-003/004/005/009/012/013 |
| Public request/access | `/request-repair`, `/login`, `/auth/reset-password`, `/invite/[token]` | MDS-REF-018 |
| Vendor workspace/list/detail | `/command-center`, `/opportunities`, `/opportunities/[id]`, `/quotes` | MDS-REF-016/019 |
| Guided quote builder | `/quote` | MDS-REF-015/016 |
| Customer quote | `/quote/[token]` | MDS-REF-016/020/022 |
| Settings/admin | `/settings`, `/team` | MDS-REF-020 |
| Intentional placeholder | `/analytics`, `/business-plan`, `/customers`, `/jobs`, `/messages`, `/properties`, `/services`, `/storefront` | MDS-REF-023 |
| System/overlay/export | Cross-route | MDS-REF-021/022 |

## 7. Required interaction behavior

- Quote creation is a recoverable five-step workflow: source/customer, property/service, scope/photos, pricing/options, terms/brand/review/send.
- Autosave after meaningful changes. Show Saving, Saved, and recovery near workflow context without repeated success toasts.
- Validate after interaction and on step progression. Focus the error summary or first invalid field.
- Preserve user input on connectivity, validation, server, and AI failure.
- Use geometry-matched skeletons; never leave a blank resolving page.
- Distinguish first-use empty, filtered empty, permission denial, read-only, error, and intentional placeholder.
- Delete, archive, withdraw, ownership transfer, send, acceptance, and payment identify the affected object and consequence and prevent duplicate activation.
- Unknown external send/payment status must reconcile before retry.

## 8. Accessibility

- One H1 per page and logical heading order.
- Landmarks for header, navigation, main, complementary summary, and footer when present.
- Visible focus and predictable focus movement/return.
- Persistent labels plus described-by help/error associations.
- Keyboard behavior for menus, comboboxes, tabs, steppers, tables, galleries, drawers, and dialogs.
- Live announcements for lookup, upload, AI generation, autosave, send, acceptance, and payment without stealing focus.
- Button alternatives for drag, swipe, and gesture-only interactions.
- Meaningful image alternatives and programmatic table/card labels.
- Minimum 44×44 CSS-pixel targets; 52px for prominent mobile progression where appropriate.

## 9. Bounded policy dependencies

Until MPS/MTS resolves them, implementation must not invent:

- a specific Direct payment processor, refund/dispute flow, or protection promise;
- exact Marketplace vendor visibility or quote-competition rules;
- an exact homeowner multi-quote comparison model; or
- public scale, speed, rating, licensing, insurance, or trust claims without evidence.

The approved references show safe structures and omissions, not authorization for those policies.

## 10. Canonical resources

- State: `MDS-PROJECT-STATE.yaml`
- Principles: `specification/PRINCIPLES.md`
- Do / Don't: `specification/DO-DONT.md`
- Tokens: `tokens/mds.tokens.json` and `tokens/mds.css`
- References: `references/REFERENCE-MANIFEST.md`
- Implementation: `implementation/MDS-IMPLEMENTATION.md`
- QA: `qa/MDS-QA.md`
