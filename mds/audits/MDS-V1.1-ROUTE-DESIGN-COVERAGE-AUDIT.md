# Mercurius Quote Tool — MDS v1.1 Route Design Coverage Audit

Status: Complete — approved 2026-09-15  
Prepared: 2026-09-14  
Repository baseline: `41e2568143d4d8577d41b1fbc22085c9b2eee270`

## Outcome

The Quote Tool now satisfies the requirement that every page route have approved route-specific responsive design coverage. MDS v1.1 preserves the v1.0 behavioral baseline and adds dedicated standalone canvases or explicitly labeled compositions within approved grouped boards for all 21 current routes.

- Current page routes: 21
- Routes with approved behavioral/pattern coverage: 21
- Routes with a dedicated canonical desktop/mobile route canvas at audit start: 0
- New route canvases drafted in this round: 21 (all current page routes)
- New route canvases approved in this round: 21
- Routes still requiring route-specific canvas coverage: 0

## New route-design contract

A page route is implementation-ready only when it has:

1. route-specific visual coverage through a standalone canvas or an explicitly labeled composition within an approved grouped board;
2. representative desktop and mobile composition;
3. its primary state and the route-specific loading, empty, validation, error, permission, or success states that materially change the experience;
4. explicit shell, navigation, role, and source context;
5. a canonical MDS reference ID approved by the product owner; and
6. an implementation and QA mapping to that reference.

Shared component, layout, overlay, and export references remain authoritative. The route canvas composes those approved rules and does not create new product policy.

Closely related low-complexity routes may share one approval board when each route remains explicitly labeled and receives its own responsive composition and material-state coverage. Substantial workflows and routes with distinct decision models continue to receive standalone canvases.

## Route-by-route result

| Route | Existing MDS v1.0 evidence | v1.1 dedicated-canvas status | Next action |
| --- | --- | --- | --- |
| `/` | Historical landing references plus core/layout rules | Approved — MDS-REF-025 | Implementation and QA mappings refreshed |
| `/request-repair` | MDS-REF-018 composite board | Approved — MDS-REF-024 | Implementation and QA mappings refreshed |
| `/login` | Desktop frame in MDS-REF-018 | Approved — MDS-REF-026 | Implementation and QA mappings refreshed |
| `/auth/reset-password` | Mobile states in MDS-REF-018 | Approved — MDS-REF-027 | Implementation and QA mappings refreshed |
| `/invite/[token]` | Mobile states in MDS-REF-018 | Approved — MDS-REF-028 | Implementation and QA mappings refreshed |
| `/command-center` | Desktop/mobile frames in MDS-REF-019 | Approved — MDS-REF-029 | Implementation and QA mappings refreshed |
| `/opportunities` | Mobile frame in MDS-REF-016 and pattern mapping | Approved — MDS-REF-030 | Implementation and QA mappings refreshed |
| `/opportunities/[id]` | Desktop/mobile frames in MDS-REF-019 | Approved — MDS-REF-031 | Implementation and QA mappings refreshed |
| `/quote` | Step-specific desktop/mobile MDS-REF-015/016 | Approved — MDS-REF-032 | Implementation and QA mappings refreshed |
| `/quotes` | Desktop/mobile frames in MDS-REF-019 | Approved — MDS-REF-033 | Implementation and QA mappings refreshed |
| `/quote/[token]` | Frames in MDS-REF-016/020 | Approved — MDS-REF-034 | Implementation and QA mappings refreshed |
| `/settings` | Desktop/mobile frames in MDS-REF-020 | Approved — MDS-REF-035 | Implementation and QA mappings refreshed |
| `/team` | Desktop/mobile frames in MDS-REF-020 | Approved — MDS-REF-036 | Implementation and QA mappings refreshed |
| `/analytics` | Placeholder card; mobile example in MDS-REF-023 | Approved — MDS-REF-037 | Implementation and QA mappings refreshed |
| `/business-plan` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-038 | Implementation and QA mappings refreshed |
| `/customers` | Placeholder card; mobile example in MDS-REF-023 | Approved — MDS-REF-039 | Implementation and QA mappings refreshed |
| `/jobs` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-040 | Implementation and QA mappings refreshed |
| `/messages` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-041 | Implementation and QA mappings refreshed |
| `/properties` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-042 | Implementation and QA mappings refreshed |
| `/services` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-043 | Implement and validate against refreshed Gate 7 mapping |
| `/storefront` | Placeholder card in MDS-REF-023 | Approved — MDS-REF-044 | Implement and validate against refreshed Gate 7 mapping |

## Design rounds

### Round 1 — Launch-critical public and access routes

1. `/request-repair` — approved
2. `/` — approved
3. `/login` — approved
4. `/auth/reset-password` — approved
5. `/invite/[token]` — approved

### Round 2 — Vendor acquisition and quoting

1. `/command-center` — approved
2. `/opportunities` — approved
3. `/opportunities/[id]` — approved
4. `/quote` — approved
5. `/quotes` — approved

### Round 3 — Commitment and administration

1. `/quote/[token]` — approved
2. `/settings` — approved
3. `/team` — approved

### Round 4 — Intentional placeholder routes

1. `/analytics` — approved with `/business-plan`
2. `/business-plan` — approved with `/analytics`
3. `/customers` — approved with `/jobs`
4. `/jobs` — approved with `/customers`
5. `/messages` — approved with `/properties`
6. `/properties` — approved with `/messages`
7. `/services` — approved with `/storefront`
8. `/storefront` — approved with `/services`

## Production effect

- MDS v1.1 is the active visual and behavioral baseline.
- Gate 6 route-reference expansion is complete with 21 of 21 routes approved.
- Gate 7, the implementation manifest, and QA route matrix are refreshed for route-reference completeness.
- MTS and the Mercurius Build Roadmap must consume MDS v1.1 before production UI implementation is considered complete.
- Reference boards govern composition and material states; approved Marketplace tokens, terminology, final wording, and route behavior govern implementation where illustrative board content differs.

## Current route references

- MDS-REF-024 — `/request-repair` — approved 2026-09-13. Authority: desktop/mobile Step 1 composition plus representative validation, saved/resume, and submission-success states. Written six-step flow and state specifications remain authoritative for states not shown.
- MDS-REF-025 — `/` — approved 2026-09-13. Authority: desktop/mobile public Marketplace landing composition, homeowner/vendor entry actions, local-home hero imagery, and three-step journey proof without unsupported numerical claims.
- MDS-REF-026 — `/login` — approved 2026-09-13. Authority: desktop/mobile vendor sign-in composition plus invalid-credentials, signing-in, success/redirect, and password-recovery-entry states; unsupported trust claims are omitted.
- MDS-REF-027 — `/auth/reset-password` — approved 2026-09-13. Authority: desktop/mobile valid recovery-link composition plus verifying-link, password-strength, mismatch-validation, expired-or-invalid-link, updating, and success/redirect states.
- MDS-REF-028 — `/invite/[token]` — approved 2026-09-13. Authority: desktop/mobile invitation-decision composition plus signed-out and matching-account acceptance, invited-email constraint, loading, email-mismatch recovery, expired, already-accepted, missing, joining, and success states.
- MDS-REF-029 — `/command-center` — approved 2026-09-13. Authority: desktop/mobile vendor operations overview with growth score, priorities, business health, recent opportunities, recent activity, quick actions, and loading, partial-data, empty, unavailable, and error states.
- MDS-REF-030 — `/opportunities` — approved 2026-09-13. Authority: desktop/mobile opportunity pipeline list with exact status, source, and assignment filters; responsive labeled cards; pagination; loading, first-use empty, filtered empty, load error, and mobile filter-sheet states.
- MDS-REF-031 — `/opportunities/[id]` — approved 2026-09-13. Authority: desktop/mobile opportunity decision workspace with Marketplace request context, linked quotes, customer, property, assignment, status timeline, Create Quote action, and loading, not-found, load-error, secondary-data unavailable, and no-linked-quotes states.
- MDS-REF-032 — `/quote` — approved 2026-09-13. Authority: desktop/mobile recoverable five-step quote builder with source-aware summary, editable review-required AI pricing draft, quote options, autosave, validation, generation failure, and offline recovery.
- MDS-REF-033 — `/quotes` — approved 2026-09-13. Authority: desktop/mobile incoming repair-request and quote-pipeline workspace with source-aware rows, read-only lifecycle status, filters, loading, first-use empty, filtered empty, partial-data, offline, request-lane failure, and delete-confirmation states.
- MDS-REF-034 — `/quote/[token]` — approved 2026-09-13. Authority: desktop professional quote document and decision rail, Direct-customer mobile composition, explicit Marketplace and Direct-customer payment handoffs, selected option and total, expiry and terms, separate signature confirmation, request changes, and loading, draft, unavailable, expired, change-request, and acceptance states.
- MDS-REF-035 — `/settings` — approved 2026-09-14. Authority: desktop local settings navigation and focused business-profile form, mobile focused pricing section, Personal and organization workspace context, data-driven onboarding, brand snapshot preview, logo and photo storage, section-scoped saving, permissions, validation, upload, gallery, and recovery states.
- MDS-REF-036 — `/team` — approved 2026-09-15. Authority: organization-owner desktop and mobile team administration, explicit role permissions and protected owner controls, truthful shareable invitation-link workflow with pending invitations and expiry, role-aware activity history, personal-workspace empty and member read-only states, consequential ownership transfer, destructive removal and invite cancellation, and loading, validation, success, failure, and recovery states.
- MDS-REF-037 — `/analytics` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Analytics destination, approved explanation, truthful absence of live metrics, safe return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated data or commercial claims.
- MDS-REF-038 — `/business-plan` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Business plan destination, approved explanation, truthful absence of current planning data, safe return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated stages, milestones, recommendations, or commercial claims.
- MDS-REF-039 — `/customers` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Customers destination, approved explanation, truthful boundary between connected records and unavailable management UI, safe Quotes and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated records, counts, contacts, or CRM actions.
- MDS-REF-040 — `/jobs` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Jobs destination, approved explanation, truthful absence of scheduling, completion tracking, and job history, safe Quotes and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated jobs, calendars, assignments, statuses, or revenue.
- MDS-REF-041 — `/messages` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Messages destination, approved explanation, truthful absence of message reading and sending, safe Opportunities and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated conversations, counts, previews, or composer actions.
- MDS-REF-042 — `/properties` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Properties destination, approved explanation, truthful absence of property browsing, service history, and management, safe Opportunities and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated properties, addresses, maps, identities, valuations, histories, or creation actions.
- MDS-REF-043 — `/services` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Services destination, approved explanation, truthful absence of service definitions and catalog management, safe Quote and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated offerings, pricing, packages, commissions, durations, or management actions.
- MDS-REF-044 — `/storefront` — approved 2026-09-15. Authority: distinct desktop/mobile intentional-placeholder composition within the approved grouped-board exception, explicit Coming soon availability state, selected Storefront destination, approved explanation, truthful absence of homeowner discovery, public preview, and storefront editing, safe Settings and Overview return actions, and Personal, organization-member, offline, shell-failure, and reflow states without fabricated ratings, reviews, leads, views, listings, packages, pricing, or publish controls.
