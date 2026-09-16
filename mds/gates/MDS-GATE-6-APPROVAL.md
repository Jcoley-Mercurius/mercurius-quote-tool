# Mercurius Quote Tool — MDS Gate 6 Approval

Status: Approved  
System: Mercurius Design System  
Consumes: Approved Gates 1–5 and Quote Tool MPS v1.0  
Repository baseline: `41e2568`  
Opened: 2026-09-08

## 1. Approval outcome

Gate 6 will establish Mercurius Quote Tool MDS v1.0 only after the design system proves complete experience coverage. The product owner has explicitly required that every page and layout be designed. Representative mockups are not sufficient by themselves.

No route may enter implementation as an undesignated screen. Every in-scope experience must have:

1. an approved page shell and page-pattern mapping;
2. desktop, tablet, and mobile composition behavior;
3. role and permission visibility rules;
4. loading, empty, populated, error, validation, disabled, and success states where applicable;
5. modal, sheet, drawer, toast, and destructive-confirmation behavior where applicable;
6. a dedicated canonical reference when shared patterns do not communicate the screen adequately; and
7. an explicit disposition of full experience, approved placeholder, deferred, or not applicable.

This is the mandatory `MDS-DEC-032` exhaustive-experience-coverage rule.

## 2. What Gate 5 covered—and what it did not

Gate 5 approved the visual language, responsive system, component families, desktop quote-builder composition, mobile opportunity/builder/customer-quote transformations, and exact Mercurius identity usage.

Gate 5 did not claim that every repository route had a dedicated page design. Gate 6 now performs that completeness audit and expands the reference set wherever pattern-level guidance is not enough.

## 3. Coverage classification

| Status | Meaning | Gate 6 treatment |
| --- | --- | --- |
| Covered | Approved references and written patterns communicate the complete page | Verify states and breakpoint mappings |
| Partial | Shell or components exist, but the complete route is not fully specified | Add route specification and, when needed, a dedicated reference |
| Placeholder | The current release intentionally presents a coming-soon module | Design the placeholder fully and separate it from any future full-module promise |
| Blocked | Product policy is required before the complete design can be approved | Return the question to MPS; do not invent the behavior |
| Not applicable | The route or state is outside the approved product release | Record the authority and omit it deliberately |

### Approved Wave A reference expansion

| MDS ID | Reference | Coverage | Status |
| --- | --- | --- | --- |
| MDS-REF-018 | `references/MDS-GATE-6-PUBLIC-REQUEST-ACCESS.png` | `/request-repair`, `/login`, `/auth/reset-password`, and `/invite/[token]` across desktop/mobile and representative validation, success, expired, and error states | Approved |
| MDS-REF-019 | `references/MDS-GATE-6-VENDOR-OPERATIONS.png` | `/command-center`, `/opportunities/[id]`, and `/quotes` across desktop/mobile with list, filter, empty, and error behavior | Approved |
| MDS-REF-020 | `references/MDS-GATE-6-CUSTOMER-ADMINISTRATION.png` | `/quote/[token]`, `/settings`, and `/team` across desktop/mobile with commitment, unsaved, permissions, invite, and destructive-confirmation behavior | Approved |

All three boards use the exact MDS-REF-017 identity asset in their mastheads. Sample names, addresses, dates, services, counts, and prices are illustrative. Approved state and written specifications override sample content.

Wave A was approved by the product owner on 2026-09-08. MDS-REF-018 through MDS-REF-020 are canonical.

### Approved Wave B and Wave C reference expansion

| MDS ID | Reference | Coverage | Status |
| --- | --- | --- | --- |
| MDS-REF-021 | `references/MDS-GATE-6-SYSTEM-STATES-OVERLAYS.png` | Global and route loading, recoverable/global errors, not found, offline/reconnect, session expiry, permissions, read-only, empty, validation, notifications, filters, media, upload, share, acceptance, change request, destructive confirmation, and mobile action behavior | Approved |
| MDS-REF-022 | `references/MDS-GATE-6-EXPORT-CUSTOMER-DELIVERY.png` | Quote PDF first and continuation pages, email, secure share, print, download states, mobile review/acceptance, source, expiration, acceptance, and attribution | Approved |
| MDS-REF-023 | `references/MDS-GATE-6-PLACEHOLDER-MODULES.png` | Canonical intentional-placeholder treatment for Analytics, Business Plan, Customers, Jobs, Messages, Properties, Services, and Storefront on desktop and mobile | Approved |

These boards use the exact MDS-REF-017 identity asset in their mastheads. Generated sample copy and data are illustrative; approved state and written specifications remain authoritative. MDS-REF-022 does not authorize payment, refund, protection, commission, or guarantee policy. MDS-REF-023 authorizes only the intentional placeholder pattern, not future module functionality.

## 4. Exhaustive route coverage matrix

The repository currently exposes 21 page routes. This matrix is the Gate 6 starting inventory, not a declaration that every route is already complete.

| Route | Experience | Primary role | Approved shell/pattern | Current coverage | Gate 6 action |
| --- | --- | --- | --- | --- | --- |
| `/` | Public Marketplace landing | Homeowner / public | `public_marketplace` / `landing` | Covered — MDS-REF-003/004/005/009/012/013 | Implement the approved public entry; unsupported trust claims remain omitted until evidenced |
| `/request-repair` | Homeowner repair request | Homeowner / public | `guided_quote_builder` / `forms` | Covered — MDS-REF-018 | Verify all six steps, save/resume, submit, and recovery details in the written specification |
| `/login` | Sign in and sign up | Public / vendor | `authentication` | Covered — MDS-REF-018 | Verify sign-up policy, loading, validation, and auth error details |
| `/auth/reset-password` | Password recovery | Vendor / invited user | `authentication` | Covered — MDS-REF-018 | Verify link-valid, link-invalid, update, success, and recovery behavior |
| `/invite/[token]` | Team invitation acceptance | Invited user | `authentication` | Covered — MDS-REF-018 | Verify authenticated/unauthenticated, valid, expired, used, success, and error behavior |
| `/command-center` | Vendor overview | Vendor owner/member | `vendor_workspace` / `dashboard` | Covered — MDS-REF-019 | Verify metric authority, loading, empty, and permission variants |
| `/opportunities` | Marketplace opportunity list | Vendor | `operational_list` / `search_results` | Covered | Verify desktop counterpart plus loading, empty, filtered-empty, error, and pagination/refresh states |
| `/opportunities/[id]` | Opportunity review and response | Vendor | `detail_action_rail` / `detail` | Covered — MDS-REF-019 | Verify missing evidence, closed, declined, expired, and create-quote transitions |
| `/quote` | Source-aware quote builder | Vendor | `guided_quote_builder` / `forms` | Covered | Complete all five steps, validation, autosave, AI draft, generation failure, review, send, and mobile keyboard behavior |
| `/quotes` | Quote history and incoming requests | Vendor | `operational_list` / `search_results` | Covered — MDS-REF-019 | Verify every lifecycle, incoming-request, filter, pagination/refresh, empty, and error state |
| `/quote/[token]` | Customer quote review and acceptance | Homeowner / external customer | `customer_quote` | Covered — MDS-REF-020 | Keep Direct payment language blocked until MPS/MTS resolve policy; verify expiration and recovery |
| `/settings` | Business profile, pricing, brand, media | Vendor owner | `settings` / `forms` | Covered — MDS-REF-020 | Verify all sections, uploads, permissions, unsaved changes, validation, and responsive navigation |
| `/team` | Organization members and invitations | Vendor owner/member | `settings` / `operational_list` | Covered — MDS-REF-020 | Verify role authority, transfer ownership, revoke/remove, empty, error, and read-only states |
| `/analytics` | Analytics module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future analytics UI requires separate MPS scope before full design |
| `/business-plan` | Business plan module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future planning UI requires separate MPS scope before full design |
| `/customers` | Customer module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future CRM UI requires separate MPS scope before full design |
| `/jobs` | Job module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future job-management UI requires separate MPS scope before full design |
| `/messages` | Messaging module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future messaging UI requires separate MPS scope before full design |
| `/properties` | Property module placeholder | Vendor | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future property workspace requires separate MPS scope before full design |
| `/services` | Services module placeholder | Vendor owner | `settings` / `empty` | Approved placeholder — MDS-REF-023 | Future service catalog requires separate MPS scope before full design |
| `/storefront` | Marketplace storefront placeholder | Vendor owner | `vendor_workspace` / `empty` | Approved placeholder — MDS-REF-023 | Future public storefront requires separate MPS scope before full design |

## 5. Cross-route surfaces that also require design coverage

Routes alone are not the whole interface. Gate 6 also requires explicit coverage for:

- application header, desktop workspace rail, mobile bottom navigation, public header, and minimal customer-quote header/footer;
- global loading, route loading, global error, recoverable route error, not-found, offline/reconnect, and session-expired experiences;
- filter sheet, mobile action bar, photo viewer, upload queue, send-quote dialog, share flow, acceptance confirmation, change-request flow, and destructive confirmations;
- toasts, inline alerts, field validation, error summaries, skeletons, empty states, permission denial, and read-only states;
- quote PDF/export, email presentation, share link, and exact Mercurius attribution;
- long content, large prices, missing photos, many line items, long company/customer names, and 200% zoom;
- keyboard-only, screen reader, reduced motion, contrast, focus order, and touch-target behavior.

## 6. Required additional design waves

### Wave A — Core release routes

1. Public repair request journey.
2. Authentication, reset, and invite family.
3. Command center and opportunity detail.
4. Quote history and full five-step builder states.
5. Customer quote commitment and source-aware payment handoff.
6. Settings and team administration.

Wave A visual references are approved as MDS-REF-018 through MDS-REF-020. Route-level written reconciliation remains part of Gate 6; the images do not independently authorize unresolved product policy.

### Wave B — System and exported surfaces

1. Global/loading/error/not-found/offline/session states.
2. Dialogs, sheets, media viewer, uploads, confirmations, and notifications.
3. PDF, email, shared-link, and print behavior with exact Mercurius identity.

Wave B visual references are approved as MDS-REF-021 and MDS-REF-022.

### Wave C — Intentional placeholder modules

Create one canonical placeholder-module pattern and apply route-specific title, explanation, permission, and next action to Analytics, Business Plan, Customers, Jobs, Messages, Properties, Services, and Storefront. A placeholder does not authorize the future full module.

Wave C visual reference is approved as MDS-REF-023. This approval covers the complete current placeholder experience, not the future full modules.

## 7. Product-policy blockers

The following remain MPS-owned and prevent final design of affected portions:

- `MDS-GAP-001`: Direct-payment processing, support, refund/dispute, and protection disclosures.
- `MDS-GAP-002`: Marketplace job-board vendor visibility and competition model.
- `MDS-GAP-003`: Homeowner multi-quote comparison model.
- `MDS-GAP-004`: Evidence for public trust, scale, speed, rating, licensing, and insurance claims.

Design will show bounded placeholders or omit unsupported claims until those policies are approved.

## 8. Gate 6 completion rule

Gate 6 cannot be approved and MDS v1.0 cannot be established until:

1. every row in the route matrix is `Covered`, an approved `Placeholder`, or explicitly `Not applicable`;
2. every cross-route surface has a specification and reference mapping;
3. dedicated references have been added for high-variance screens where shared patterns are insufficient;
4. mobile, tablet, and desktop transformations are defined for every applicable page family;
5. product-policy blockers are resolved or explicitly carried forward without invented UI promises;
6. the open implementation deviations are reconciled; and
7. the complete package passes a design-coverage audit with no undesignated page.

## 9. Current Gate 6 status

Gate 6 is approved. The final audit records 21 current routes, zero undesignated routes, complete cross-route state/export coverage, four explicitly bounded product-policy carry-forwards, and two implementation deviations assigned to Gate 7. Mercurius Quote Tool MDS v1.0 is established; Gate 7 Implementation Readiness is next.
