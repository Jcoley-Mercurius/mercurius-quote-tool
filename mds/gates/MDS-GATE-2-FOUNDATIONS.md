# Mercurius Quote Tool — MDS Gate 2 Foundations

Status: Approved  
System: Mercurius Design System  
Parent authority: Approved Mercurius Marketplace/ReImagine MDS v1.0  
Product authority: Approved Mercurius Quote Tool MPS v1.0  
Prepared: 2026-09-08
Approved by: Product owner  
Approval date: 2026-09-08

## 1. Foundation outcome

The Quote Tool will use the Marketplace/ReImagine foundation without creating a second Mercurius brand. The approved parent palette, Manrope typography, spacing, shape, iconography, and accessibility rules are inherited. Gate 2 adds Quote Tool-specific semantic usage so Marketplace opportunities, direct quotes, AI assistance, acceptance, and payment remain visually distinct and commercially clear.

The core expression is **Mercurius Marketplace first, vendor-branded second**. Mercurius owns the application shell, semantic states, source context, acceptance, and Marketplace checkout. A vendor may express its identity in bounded customer-facing surfaces such as the quote header, PDF, cover, and contact block.

## 2. Identity and design principles

### Identity hierarchy

- Use the exact approved Mercurius figure-and-coin mark in `references/mercurius-logo.png` and the Marketplace shell as the product identity. Do not redraw, approximate, replace, or omit the mark on primary branded surfaces, reference exports, customer quote attribution, or production documents.
- Do not introduce a Quote Tool logo, independent palette, or competing visual language.
- Use vendor logos and brand accents only inside vendor-owned presentation zones. Vendor color may not replace system status, source, error, focus, acceptance, or payment colors.
- Use `Powered by Mercurius` as secondary attribution where a direct customer is primarily viewing a vendor-branded quote.
- Normalize the Mercurius mark for legibility at header scale; do not rely on the low-resolution screenshot treatment as an asset standard.

### Governing principles

1. **Make the money path unmistakable.** Show source, payment recipient, commission relevance, and next step before commitment.
2. **Move work forward.** Emphasize the next valid action instead of exposing raw lifecycle manipulation.
3. **One system, context-aware behavior.** Marketplace and direct work share components with controlled variants.
4. **Professional at the job site.** Prioritize mobile scanability, touch, save/recovery, and photo handling.
5. **AI supports judgment.** Explain AI assistance and require vendor review before customer commitment.

## 3. Color system

### Inherited core tokens

| Semantic role | Parent token | Value | Quote Tool application |
| --- | --- | --- | --- |
| Primary content | `color.brand.ink900` | `#1F242E` | Headings, primary text, critical financial content |
| Structural action | `color.brand.ink800` | `#29303D` | Navigation, ordinary primary actions, selected structure |
| AI / creative action | `color.brand.coral600` | `#D76742` | Explicit AI generation and bounded AI emphasis |
| Trusted progression | `color.brand.green600` | `#3F8361` | Completion, acceptance, verified success, payment progression |
| Green on dark | `color.brand.green500Dark` | `#4FB080` | Trusted progression on approved dark surfaces only |
| Light page | `color.surface.lightPage` | `#FBFAF9` | Default application canvas |
| Light card | `color.surface.lightCard` | `#FDFDFC` | Cards, forms, quote sheets, decision panels |
| Light muted | `color.surface.lightMuted` | `#F6F5F3` | Quiet groups, secondary controls, table headers |
| Light secondary | `color.surface.lightSecondary` | `#F1F0EE` | Disabled and recessed areas |
| Dark page | `color.surface.darkPage` | `#11151C` | Bounded photo-review or media inspection only |
| Dark card | `color.surface.darkCard` | `#1A1F28` | Elevated content on a bounded dark surface |
| Dark muted | `color.surface.darkMuted` | `#222630` | Quiet dark controls and groupings |
| Muted text | `color.text.lightMuted` | `#676F7E` | Supporting text and metadata |
| Dark primary text | `color.text.darkPrimary` | `#EEECE7` | Primary text on dark surfaces |
| Light border | `color.border.light` | `#E5E2DC` | Default outlines and dividers |
| Dark border | `color.border.dark` | `#323843` | Outlines on dark surfaces |
| Focus | `color.border.focus` | `#4B9B73` | Persistent keyboard focus ring |
| Warning | `color.semantic.warning` | `#B26B19` | Attention and recoverable risk |
| Error | `color.semantic.error` | `#DC2828` | Validation, destructive consequence, failed state |
| Information | `color.semantic.info` | `#308CE8` | Neutral system information |
| Success | `color.semantic.success` | `#3F8361` | Confirmed success |

### Quote Tool semantic rules

- **Ink is the default action color.** Save, open, edit, search, filter, and neutral navigation use ink or neutral treatments.
- **Coral means AI generation.** Use it for actions explicitly labeled `Generate draft with AI` or equivalent. Do not use coral for errors, urgency, payment, or ordinary navigation.
- **Green means trusted progression.** Use it for completed steps, accepted quotes, successful validation, `Send quote`, and source-appropriate payment progression. A current selection is not automatically success.
- **Marketplace and Direct are labels, not color brands.** Pair a text label and icon with a neutral surface. Never distinguish source by green versus coral alone.
- Financial totals use ink by default. Green may indicate a confirmed accepted or paid outcome, not merely a large pipeline value.
- Use warm Marketplace surfaces throughout the authenticated product and customer quote. Do not preserve the current cool slate page background or emerald aliases.
- Semantic meaning must survive grayscale, color-vision deficiency, and forced-colors modes through text, icon, shape, or placement.

## 4. Typography

### Family and weights

- Display and UI family: **Manrope**.
- Supported weights: 400 regular, 500 medium, 600 semibold, 700 bold.
- Do not introduce Inter as a Quote Tool exception.
- Monospace is optional and reserved for quote IDs or technical references; it is not part of the primary interface voice.

### Inherited type scale

| Role | Desktop / mobile | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Display XL | 64 / 44px | 700 | 1.08 | Exceptional public Marketplace hero only |
| Display LG | 52 / 40px | 700 | 1.10 | Public marketing statement |
| H1 | 44 / 34px | 700 | 1.15 | Page title |
| H2 | 34 / 28px | 700 | 1.20 | Major section |
| H3 | 24 / 22px | 600 | 1.30 | Card group or workflow section |
| Title | 18px | 600 | 1.40 | Card, row, and dialog title |
| Body large | 18 / 17px | 400 | 1.60 | Customer-facing lead copy |
| Body | 16px | 400 | 1.55 | Default reading and form text |
| Body small | 14px | 400 | 1.50 | Metadata and supporting text |
| Label / overline | 12px | 600 | 1.35 | Short labels, never body copy |

Operational text must not drop below 14px. Twelve-pixel text is limited to short labels with sufficient contrast. Use sentence case for headings, buttons, form labels, and statuses. Use tabular numerals for aligned prices, counts, and summaries.

## 5. Spacing and density

The inherited base unit is 4px with the approved scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px**.

### Quote Tool application

- Customer-facing pages use generous 24–32px card padding and 32–48px section rhythm.
- Vendor dashboards use 16–24px card padding and 16–24px row rhythm; density must not reduce targets or legibility.
- Form groups use 24px between related groups and 8–12px between label, control, and help/error text.
- Adjacent interactive controls maintain at least 8px separation.
- Mobile page gutters are 16–20px; desktop uses the inherited Marketplace container and gutter rules.
- Public marketing may use the parent 56–96px section rhythm. Authenticated workflows should not inherit marketing-scale whitespace when it delays task completion.

## 6. Shape, borders, and elevation

### Radius vocabulary

| Token | Value | Quote Tool role |
| --- | --- | --- |
| `radius.sm` | 8px | Compact tags, small segmented items |
| `radius.md` | 12px | Inputs, buttons, compact cards |
| `radius.lg` | 16px | Standard cards, quote sections, list rows |
| `radius.xl` | 24px | Dialogs, major panels, customer quote sheet |
| `radius.2xl` | 32px | Rare public feature/hero composition |
| `radius.pill` | 9999px | Status chips and source labels only |

- Use 1px `#E5E2DC` borders on light surfaces and `#323843` on dark surfaces.
- Prefer border and surface contrast before shadow. Do not float every card.
- Inherit only the parent `sm`, `base`, and `md` shadow recipes: `sm` for hover/sticky separation, `base` for menus and popovers, `md` for dialogs and consequential overlays.
- Inputs and buttons share the 12px control radius; standard workflow cards share the 16px radius. Avoid arbitrary radii or excessively pill-shaped buttons.

## 7. Icons and motion

- Use Lucide outline icons, or the MTS-approved equivalent, at a consistent rounded 2px stroke.
- Approved optical sizes are 16, 20, and 24px. Use 20px for standard controls and 24px for feature/service tiles.
- Pair source, money, status, urgency, and destructive icons with visible text.
- Replace repeated one-off inline SVGs with a reusable icon wrapper during implementation; do not redraw branded marks as interface icons.
- Motion durations inherit 150ms fast, 220ms base, and 320ms deliberate. Motion explains state change, feedback, or spatial relationship; it is not decoration.
- Honor `prefers-reduced-motion` and avoid progress animation that implies activity after work has stopped.

## 8. Visual language

The Quote Tool is calm, capable, and commercially transparent. It uses warm light surfaces, dark ink structure, restrained color, precise prices, and direct language. Customer-facing views are spacious and reassuring. Vendor views are denser but remain breathable and touch-safe.

The parent principle **“Studio while exploring; Marketplace while committing”** becomes: quote drafting may use bounded AI/creative cues, but review, acceptance, and payment return to the warm, high-trust Marketplace language. A dark surface is permitted only as a bounded utility—such as photo inspection—not as the default quoting workspace.

## 9. Application to the supplied experiences

| Existing treatment | Gate 2 direction |
| --- | --- |
| Emerald `Generate Quote` button | Rename to `Generate draft with AI` when AI is invoked and use coral; use ink for ordinary create/open/edit actions |
| Green numbered steps | Current step uses ink emphasis; completed steps use green with a check; incomplete steps stay neutral |
| Green selected service/workspace cards | Use ink/focus selection treatment; reserve green for confirmed completion or success |
| Green `Create quote` on every request | Use ink for the ordinary operational action; green appears when sending or advancing a confirmed quote |
| Green pipeline value | Use ink unless the figure represents accepted or paid value |
| Cool slate page and card treatments | Replace with warm Marketplace page/card/muted surfaces and border tokens |
| Inter-like current hierarchy | Replace with Manrope and the inherited scale |
| Many similar rounded cards | Standardize 12px controls and 16px workflow cards; use 24px only for major panels |
| Source implied by context | Add persistent `Marketplace` or `Direct customer` label with icon and explanatory text at consequential steps |

## 10. Do / Don't

| Do | Don't |
| --- | --- |
| Use ink for ordinary primary actions | Make every primary action green |
| Use coral only for explicit AI generation | Use coral as a generic accent or urgency color |
| Use green for verified progress and commitment | Use green merely because an option is selected |
| Label Marketplace and Direct in words | Encode quote source through color alone |
| Keep vendor branding inside bounded presentation zones | Let vendor colors override system states or Marketplace checkout |
| Use warm surfaces and quiet borders | Preserve cool slate surfaces or add heavy shadows to every card |
| Use Manrope and the approved scale | Create a separate Quote Tool typography system |
| Use 12px controls and 16px workflow cards consistently | Mix arbitrary corner radii or turn every control into a pill |
| Show AI output as a reviewable draft | Present AI pricing as an unquestionable final answer |
| Keep destructive actions secondary and confirmed | Place delete beside the primary forward action |

## 11. Accessibility foundation

- Target **WCAG 2.2 AA** for all vendor and customer experiences.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and essential UI graphics.
- Provide a persistent 3px `#4B9B73` focus ring with visual separation from the component edge.
- Primary touch targets are at least 44×44 CSS px; prominent progression controls may use 52px height.
- Keyboard order follows reading and workflow order; sticky actions must not obscure focused controls, errors, or content.
- Errors appear beside the relevant field, explain recovery, and are summarized at submission when multiple fields fail.
- Announce asynchronous AI generation, save, send, acceptance, and payment state changes to assistive technology without stealing focus.
- Tables require programmatic headers; card transformations preserve label/value relationships on small screens.
- Status, source, urgency, price movement, and progress never rely on color alone.
- Meaningful job photos receive useful alternatives or captions; decorative imagery uses empty alternative text.
- Reduced motion, text zoom, reflow at 320 CSS px, and forced-colors behavior are part of Gate 4 and Gate 7 validation.

## 12. Gate 2 approved decision bundle

Gate 2 approval authorizes the following Quote Tool decisions:

1. Inherit the Marketplace/ReImagine MDS v1.0 foundation as the sole shared foundation.
2. Adopt the semantic action model: ink for structure, coral for explicit AI generation, green for trusted progression.
3. Adopt Manrope and the inherited type scale without a Quote Tool font exception.
4. Adopt the 4px spacing scale and Quote Tool density rules.
5. Adopt the 8/12/16/24/32px radius vocabulary, quiet borders, and restrained elevation.
6. Adopt Lucide-style iconography, meaningful motion, and reduced-motion behavior.
7. Adopt the bounded vendor-brand model.
8. Adopt WCAG 2.2 AA as the design accessibility target.
9. Adopt the application corrections and Do/Don't rules above as downstream component and QA constraints.

The four open MPS policy gaps from Gate 1 remain dependencies for final acceptance/payment compositions, but they do not block approval of these foundations.

## 13. Gate 2 completion

Gate 2 is complete. Gate 3 will specify the reusable primitives and Quote Tool domain components, including source labels, opportunity cards, quote builder sections, AI recommendation panels, line items, price tiers, lifecycle actions, customer acceptance, and source-aware payment handoff.
