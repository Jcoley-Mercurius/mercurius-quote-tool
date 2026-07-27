# PR5.1 Customer CRM and Tier Architecture Audit

Status: read-only architecture and product audit  
Date: 2026-07-26  
Implementation readiness: **READY WITH DECISIONS**

## 1. Executive summary

### Implemented foundation

Vendor OS already has a credible normalized CRM data foundation:

- workspace-scoped `customers` and `properties`;
- one nullable customer per property and many properties per customer;
- opportunities linked independently to a customer and property;
- quotes optionally linked to opportunities;
- append-only opportunity status and assignment histories;
- quote sharing, viewing, acceptance, and change requests;
- Marketplace UUIDs, immutable source snapshots, idempotent inbound projection,
  integration events, and cross-workspace validation;
- personal and organization RLS boundaries; and
- workspace-aware opportunity, quote, and dashboard reads.

### Missing product experience

There is no usable CRM. `/customers` and `/properties` are honest placeholders.
There are no customer/property repositories, directory queries, detail routes,
edit/archive flows, normalized search, customer/property timelines, manual CRM
tasks, attachments, merge, export, or entitlement service. Customer/property
data is visible only when embedded in Opportunity Detail. Quotes are not
directly linked to customer/property, so customer quote aggregation must
currently traverse opportunities and cannot include unlinked legacy quotes.

The existing schema is sufficient for a **read-only first vertical slice**:
Customer Directory, Customer Detail, associated properties/opportunities/
opportunity-linked quotes, and a bounded query-and-merge timeline. Manual edit
can also use existing grants, but archive, company name, primary property,
relationship owner, CRM notes/tasks, and attachments require decisions and
likely additive schema.

### Largest risks

1. **Data:** email, phone, and address have no normalization or duplicate
   detection; Marketplace projection without an external homeowner/property
   UUID creates a new record per event.
2. **Permissions:** every organization member can update every customer and
   property; no delete is granted, but there is no archive.
3. **Usability:** customer/property records are not discoverable, editable, or
   searchable; quote snapshots and repair requests create parallel contact data.
4. **Monetization:** adding automated follow-up or nurture to core CRM would
   cannibalize Lead Velocity and Retention Engine.
5. **Accuracy:** accepted quote value is not collected revenue, and legacy
   quotes cannot safely be assigned to customers automatically.

### Recommended sequence

- **PR5.2:** read-only Customer Directory and Customer Detail using existing
  schema, trusted workspace scoping, pagination, basic search, and bounded
  aggregates.
- **PR5.3:** data hardening plus manual edit/archive, after archive and field
  ownership decisions.
- **PR5.4:** Property Detail and conservative manual legacy linking.
- **PR5.5:** hybrid timeline foundation, internal notes, and manual follow-up
  tasks after product approval.
- **PR5.6:** centralized capabilities/entitlements and tier-scaled limits.
- **PR5.7:** Marketplace reconciliation after the Marketplace repository and
  canonical ownership contract are available.
- Later: attachments/search scaling, Intelligence features, and Nexus
  multi-location read models.

Implementation can begin before further Marketplace code arrives if PR5.2
does not change external identities or synchronization semantics. Marketplace
canonical-field ownership, correction/deletion behavior, reconciliation, and
cross-system merge rules must wait for the Marketplace repository audit.

In this document, **implemented** means present in migrations/application code;
**documented** means an existing ADR/plan but not necessarily production
behavior; **recommended** means proposed CRM behavior; and **future** means
explicitly outside CRM v1.

## 2. Sources and product assumptions

`Mercurius_Pricing_Reference_Sheet.pdf` and
`Mercurius_Enhancement_Match_Guide(1).pdf` are not present in the repository.
This audit therefore uses the approved facts supplied by the product owner:
Free, Spark, Spark Pro, Insight, Intelligence, Intelligence Pro, and custom
multi-location/enterprise Nexus; software enhancements AI Marketing Co-Pilot,
Visibility Accelerator, Retention Engine, and Lead Velocity; service
enhancements Social Command, Video Velocity, Content Command Suite, and Ads
Command.

Core CRM may store records/history, manual notes/tasks, and basic overdue
visibility. Lead Velocity owns automated response and smart follow-up
sequences. Retention Engine owns seasonal nurture, win-back, and repeat-revenue
automation. Nexus is not a maximal single-location bundle.

The audit cross-checked all migrations, SQL validation, handwritten database
types, App Router paths, navigation, repositories, quote/opportunity flows,
workspace state, tests, and Marketplace architecture documents.

## 3. Current domain inventory

| Domain | Implemented storage and behavior | Application surface |
| --- | --- | --- |
| Customers | `customers`; workspace RLS; SELECT/INSERT/UPDATE only; Marketplace ID indexes; immutable workspace/external ID | Typed row; dashboard count; Opportunity Detail join; `/customers` placeholder |
| Properties | `properties`; nullable customer; workspace validator; workspace RLS; SELECT/INSERT/UPDATE only | Typed row; dashboard count; Opportunity Detail join; `/properties` placeholder |
| Opportunities | `opportunities`; customer/property/assignee links; state machine; Marketplace provenance | Complete list/detail repository and UI |
| Status history | `opportunity_status_history`; SELECT-only client grant; parent visibility RLS | Merged Opportunity Detail timeline |
| Assignment history | `opportunity_assignment_history`; SELECT-only; assignment RPC | Merged Opportunity Detail timeline |
| Quotes | `quotes`; JSON form/result snapshots; optional opportunity; personal/org RLS; Realtime | Create/edit/history/public portal |
| Acceptances | `quote_acceptances`; one per quote; cascade on quote delete | Public acceptance and vendor read; creator-only read semantics |
| Change requests | `quote_change_requests`; many per quote; cascade on quote delete | Public submit and vendor banner; creator-only read semantics |
| Public quote | unique share token, shared/viewed fields, token RPCs, expiry calculation | `/quote/[token]` |
| Repair requests | global public intake with contact/address/photo JSON; broad authenticated read/update | Repair inbox and quote prefill; not normalized or tenant-safe CRM |
| Organizations | `organizations`, immutable optional Marketplace vendor UUID | Workspace switcher/settings |
| Memberships | unique organization/user role; invite/removal/ownership RPCs | Team UI; roles owner/admin/member |
| Profiles/users | `auth.users`; `vendor_profiles` for business/pricing, not customer people | Vendor settings |
| Audit | `organization_audit_log`; organization management and acceptance events | Organization settings audit UI |
| Integration events | durable server-only inbox/outbox-shaped table | Signed Marketplace route and ingestion RPC |
| Photos | quote Storage buckets plus JSON thumbnail references; repair photo data URLs | Quote/gallery UI |
| Attachments | no relational CRM attachment model | unavailable |
| Notes | `customers.notes`, `properties.notes`, generated quote notes; no evented CRM notes | not exposed for customer/property |
| Tags | customer/property `text[]`; no normalization or UI | not exposed |
| Tasks/reminders | none | unavailable |
| Search | opportunity filters; address autocomplete; no customer/property database search | unavailable |
| Entitlements | no subscription/package/capability checks | unavailable |

Important grants and functions:

- authenticated clients have `SELECT, INSERT, UPDATE` on customers/properties,
  with RLS; no `DELETE`;
- `validate_property_workspace` prevents cross-workspace customer links;
- `validate_opportunity_workspace` prevents cross-workspace customer/property
  links;
- `protect_marketplace_workspace_fields` freezes workspace ownership and a
  populated Marketplace external UUID;
- `process_marketplace_lead_assigned` is service-role-only and atomically
  projects customer/property/opportunity/history;
- customer/property `updated_at` is trigger-maintained;
- there are no customer/property RPCs or application repositories.

## 4. Exact customer schema

Migration 020 creates the table; migration 021 makes `user_id` nullable for
organization system-owned rows and adds the personal-owner check.

| Column | SQL type | Null/default | Constraint and mutability | Canonical owner | Current UI / recommended CRM use |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | not null / generated | PK; immutable | Vendor OS | entity route/key |
| `organization_id` | `uuid` | nullable | FK organizations, cascade; trigger-immutable | workspace | tenant scope |
| `user_id` | `uuid` | nullable | FK auth users, cascade; required for personal; trigger-immutable | workspace creator/system | personal scope, not relationship owner |
| `marketplace_homeowner_id` | `uuid` | nullable | scoped partial unique; immutable once set | Marketplace when present | provenance/identity, never display as search identity |
| `display_name` | `text` | not null | trimmed length 1–200; editable | shared/ownership undecided | directory title/contact name |
| `email` | `text` | nullable | no format/unique/normalization | shared/undecided | contact and search |
| `phone` | `text` | nullable | no format/unique/normalization | shared/undecided | contact and search |
| `preferred_contact_method` | `text` | nullable | email/phone/text/none | Vendor OS operational | manual contact preference |
| `notes` | `text` | nullable | freely mutable | Vendor OS | temporary summary only; do not treat as note history |
| `tags` | `text[]` | not null / `{}` | no vocabulary constraint | Vendor OS | later manual filtering |
| `created_at` | `timestamptz` | not null / now | application read-only | database | chronology |
| `updated_at` | `timestamptz` | not null / now | trigger-maintained | database | sorting/concurrency |

Indexes: organization/user `updated_at DESC` partial indexes and scoped partial
unique indexes for Marketplace homeowner ID. There are no name/email/phone/tag
search indexes, archive index, company name, primary property, assigned owner,
or normalized contact columns.

## 5. Exact property schema

| Column | SQL type | Null/default | Constraint and mutability | Canonical owner | Current UI / recommended CRM use |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | not null / generated | PK | Vendor OS | entity route/key |
| `organization_id` | `uuid` | nullable | FK organizations, cascade; immutable | workspace | tenant scope |
| `user_id` | `uuid` | nullable | FK auth users, cascade; personal-owner check; immutable | workspace | personal scope |
| `customer_id` | `uuid` | nullable | FK customers, set null; same-workspace trigger | Vendor OS relationship | v1 primary/operational customer |
| `marketplace_property_id` | `uuid` | nullable | scoped partial unique; immutable once set | Marketplace when present | provenance/identity |
| `address_line1` | `text` | nullable | no normalization | shared/undecided | display/search |
| `address_line2` | `text` | nullable | none | shared/undecided | display |
| `city` | `text` | nullable | none | shared/undecided | display/filter |
| `region` | `text` | nullable | none | shared/undecided | display/filter |
| `postal_code` | `text` | nullable | none | shared/undecided | display/filter |
| `country_code` | `text` | not null / `US` | two uppercase letters | shared | display/normalization |
| `latitude` | `numeric` | nullable | −90…90 | enrichment/undecided | future distance/map |
| `longitude` | `numeric` | nullable | −180…180 | enrichment/undecided | future distance/map |
| `property_data` | `jsonb` | not null / `{}` | object | Vendor OS/enrichment | typed attributes only after contract |
| `notes` | `text` | nullable | freely mutable | Vendor OS | temporary summary, not timeline notes |
| `access_instructions` | `text` | nullable | none | Vendor OS; sensitive | detail-only, permission/privacy care |
| `tags` | `text[]` | not null / `{}` | no vocabulary | Vendor OS | later filtering |
| `created_at` | `timestamptz` | not null / now | read-only | database | chronology |
| `updated_at` | `timestamptz` | not null / now | trigger-maintained | database | sorting/concurrency |

Indexes: organization/user `updated_at DESC`, customer/updated partial, and
scoped Marketplace property UUID uniqueness. There is no normalized-address
uniqueness or search index.

## 6. Current relationship map

```text
auth.users
  | 1                     organizations
  |                       | 1
  +--< organization_members >-- user (unique org,user; cascade)
  |                       |
  | personal owner        | organization workspace
  v                       v
customers 1 --------< properties
  | set-null                 | set-null
  |                          |
  +----------< opportunities >---------- assigned auth.user (set-null)
                         |
             +-----------+-----------+
             | cascade histories     | set-null
             v                       v
   status/assignment history       quotes (optional opportunity)
                                      |
                          +-----------+-----------+
                          | cascade               | cascade
                          v                       v
                    acceptances            change requests

Marketplace vendor UUID -> organization (unique)
Marketplace homeowner UUID -> customer (unique per workspace)
Marketplace property UUID -> property (unique per workspace)
Marketplace lead UUID -> opportunity (globally unique)
integration event -> initial status history (set-null)
```

Customer/property/opportunity organization deletion cascades through their
workspace records; integration events restrict organization deletion while
retained. Customer/property deletion would set opportunity links null, and
customer deletion sets property customer links null, but browsers have no
delete grant. Opportunity deletion cascades histories and sets quote links
null. Quote deletion cascades acceptances/change requests.

Workspace validators compare organization IDs and, in personal mode, user IDs.
Marketplace source/workspace/external IDs are immutable after population.
Legacy quotes may have null `opportunity_id`. Quotes have no direct
`customer_id` or `property_id`.

Duplicated/snapshot information exists in:

- `quotes.form_data`: square footage, stories, year built, ZIP, scope; direct
  street address is omitted during persistence;
- `quotes.quote_data`: generated property context, notes, imagery, pricing;
- Marketplace `opportunities.source_snapshot`: customer/property/request copy;
- `repair_requests`: name/email/phone/location/ZIP and photo data URLs;
- change requests/acceptances: requester/signer data;
- integration event payloads: server-only original event.

These snapshots must not become competing mutable customer systems.

## 7. Current product experience

| Flow | Classification | Finding |
| --- | --- | --- |
| Create direct quote | complete quote / embedded CRM | Saves quote JSON; creates no customer/property/opportunity automatically; street address is not persisted |
| Quote from opportunity | complete | Prefills existing quote flow and persists `opportunity_id` |
| Marketplace opportunity | complete inbound slice | Signed route and atomic projection exist; external repository contract remains limited |
| View customer/property in Opportunity Detail | embedded | Read-only joined cards |
| Find all quotes for customer | unavailable | Only opportunity-linked traversal is technically possible |
| Find all work at property | unavailable | Opportunity query possible; jobs do not exist |
| Edit customer/property | technically possible but not exposed | Table grants/RLS allow update |
| Archive | unavailable | no field or semantics |
| Delete | unavailable to browser | no grant/policy; cascades would be risky |
| Search name/email/phone/address | unavailable | no repository/UI/indexes |
| Quote history/public quote | complete | Workspace history and token portal |
| Repair request to CRM | unsafe as CRM | global authenticated visibility/update and no normalized links |

## 8. Recommended CRM product definition

### CRM v1

- paginated Customer Directory with display name, contact methods, primary
  property presentation (derived, not stored), latest activity, bounded open
  opportunity and linked quote counts, source badge, and basic workspace-safe
  search;
- Customer Detail with overview/contact, properties, opportunities,
  opportunity-linked quotes, and read-only merged timeline;
- Property Detail reachable from Customer Detail, with normalized address,
  associated customer, opportunities, linked quotes, existing attributes and
  Marketplace provenance;
- honest partial states where aggregates/history fail;
- personal and organization parity for record access.

Accepted value may be shown only as **accepted quote value**, computed from
accepted quote snapshots, never lifetime revenue or collected revenue.

### Later core CRM

Manual editing, archive/restore, manual internal notes, manual tasks/follow-up
dates, tags, attachments with limits, probable-duplicate suggestions, manual
linking, export, and richer search.

### Enhancement-owned

- Lead Velocity: automated lead response, sequences, and smart follow-up.
- Retention Engine: seasonal nurture, win-back, repeat-revenue campaigns.
- AI Marketing Co-Pilot: generated marketing content/campaign assistance.
- Visibility Accelerator: acquisition/visibility workflows, not CRM storage.

### Intelligence/Nexus/future operations

AI summaries, next-best action, forecasting, prioritization, and predictive
dormancy belong to Intelligence tiers subject to data quality. Nexus owns
multi-location, cross-location reporting, integrations/API, custom workflows,
and enterprise controls. Jobs, scheduling, service history, payments, and
customer messaging are future domains, not CRM v1.

## 9. Identity and duplicate strategy

Email and phone are not unique. Marketplace homeowner UUID is unique only
within a personal or organization workspace; a person can correctly exist in
multiple organizations and in personal plus organization workspaces. A customer
can own multiple properties. The schema supports only one customer per
property. No contact/address normalization, duplicate suggestions, merge, or
archive exists.

Recommended v1:

1. Keep UUID primary keys and workspace scope authoritative.
2. Never impose global uniqueness on email, phone, or address.
3. Preserve Marketplace UUID as the strongest external identity.
4. For manual creation, normalize email case/whitespace and phone digits for
   comparison, but store a display value; treat matches as suggestions unless
   an exact duplicate idempotency key exists.
5. Add exact duplicate prevention only for explicit external UUID/idempotency
   identity. Do not silently merge mutable PII.
6. Show probable duplicates later using same-workspace normalized contact and
   address signals, with manual confirmation.
7. Defer merge. A safe merge must re-point relationships transactionally,
   retain aliases/provenance/audit, and be reversible or carefully reviewed.
8. Marketplace corrections update only fields whose ownership contract permits
   it; vendor edits must not overwrite immutable source snapshots.
9. Archive rather than hard-delete operational records. Preserve export and
   retention rights.

## 10. Customer–property relationship decision

**Recommendation: retain nullable `properties.customer_id` for v1, design a
future `customer_property_relationships` join model, do not add it now.**

This supports the common first slice: one operational customer with many
properties. It does not represent spouses, multiple decision-makers, property
manager/tenant/owner, billing versus site contact, or ownership transfer.
Prematurely adding a join table would require role semantics, effective dates,
primary-contact rules, Marketplace mapping, and UI with insufficient evidence.

Future compatibility: keep `customer_id` as the primary operational contact
during transition; add a relationship table with role, primary flag,
effective dates, source, and audit; backfill one primary relationship per
non-null property; dual-read temporarily; then decide whether to retain the
column as a cached primary FK. Do not destructively drop it in the first
migration.

## 11. Timeline architecture

| Option | Strength | Weakness |
| --- | --- | --- |
| Query-and-merge | reuses authoritative domain events; no dual-write | fan-out, pagination and event-shape complexity |
| CRM activity table | uniform pagination and extensibility | duplicates facts and requires transactional emission/backfill |
| Hybrid | authoritative domain facts plus CRM-native notes/tasks | requires stable merged cursor/read model |

**Recommendation: hybrid.** In v1 query and merge bounded opportunity status
and assignment events, quote rows/state timestamps, acceptances, and change
requests through customer/property-linked opportunities. Add a CRM activity
table only when introducing CRM-native notes/tasks/attachments or when measured
fan-out requires it. Do not copy authoritative domain events into it initially.

Use typed identity `(source_type, source_id)`, descending `(occurred_at, type,
id)` ordering, stable cursor pagination, source-specific deduplication, and
immutable event content. Resolve actors from current membership; use Former
team member/Unknown team member without UUID display. Never expose integration
payloads or private PII. Marketplace events should expose curated projections,
not raw payload. Customer and property timelines should share query machinery
but apply their own trusted workspace/entity filters.

## 12. Notes, tasks, reminders, and communication boundaries

| Concept | Owner |
| --- | --- |
| Manual internal note | later core CRM; private to workspace |
| Manual task/follow-up date | later core CRM, if approved |
| Overdue indicator | core CRM visibility |
| Customer-facing message | future communications infrastructure |
| Automated immediate response | Lead Velocity |
| Smart follow-up sequence | Lead Velocity |
| Seasonal nurture/win-back/repeat campaign | Retention Engine |
| Marketing content/campaign assistance | AI Marketing Co-Pilot |
| Domain state change | immutable system timeline fact |

Current `customers.notes` and `properties.notes` are mutable memo fields, not
auditable note records. Do not present them as a note timeline. A future note
needs author, workspace, entity, body, timestamps, edit/delete policy, and
audit semantics. Tasks need assignee, due date, completion, and manual origin;
they must not become a scheduler or automation engine.

## 13. Search and directory architecture

V1 search should cover customer display name, email, phone, and associated
property address/city/postal code. Company name requires a new field decision.
Opportunity title/service and quote reference should remain contextual filters,
not inflate the first customer query.

- trim and case-fold text; maintain normalized email and phone comparison
  values when schema hardening occurs;
- start with case-insensitive prefix search and exact normalized phone/email;
  substring search may use `pg_trgm` only after volume/query measurement;
- use server/database-side workspace filters before search;
- paginate with a stable sort such as `updated_at DESC, id DESC`, 25–50 rows;
- return bounded counts via grouped queries/RPC rather than N+1;
- keep PII out of URLs where possible: use ephemeral form state or a short
  `q` only when product accepts browser-history exposure; never log it;
- no user UUID filters; personal and organization identity comes from trusted
  context.

Existing indexes support recent workspace lists, not search. Likely hardening:
workspace plus folded-name indexes and normalized email/phone indexes; address
indexes on properties. Full-text search is unnecessary for v1 contact lookup.

## 14. CRM permissions and tenancy

`R` means recommended v1 read, `W` recommended write, `—` denied/deferred.

| Actor | List/view customer/property | Create/edit | Archive/restore | Notes/tasks | Attach/export/merge | Provenance/delete |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous | — | — | — | — | — | — |
| Outside authenticated | — | — | — | — | — | — |
| Personal owner | R | W | W | W later | export later; merge later | provenance R; hard delete deferred |
| Org owner | R | W | W | W later | policy/limits; merge later | provenance R; delete deferred |
| Org admin | R | W | W | W later | policy/limits; merge later | provenance R; delete deferred |
| Org member | R | W under current model | recommend W initially | W later | attachment by capability; export undecided | provenance R; delete deferred |
| Pending invite | — | — | — | — | — | — |
| Removed member | — | — | — | — | — | — |
| Integration server | narrowly scoped projection | canonical fields only | reconciliation contract | system facts only | no general export/merge | immutable IDs/audited correction |

Current RLS already lets every organization member update all customer/property
fields except protected workspace/external identity. There is insufficient
evidence for CRM-specific roles in v1. Keep the simple model, audit material
edits, and revisit field-level permissions when attachments, export, merge, or
multi-location appear. Relationship ownership may support filtering and
accountability later but should not change row visibility.

## 15. Personal workspace behavior

Personal users should receive the same directory/detail/edit/archive experience
and owned-data access. Hide organization-only member assignment, team actor
controls, and multi-location features. Every request key/cache must include
user plus workspace; switching must immediately withhold prior rows and reject
late responses.

Do not automatically move records between personal and organization
workspaces: ownership fields are immutable and quotes/opportunities/history
form a graph. A future “copy/transfer” must be an explicit audited operation
with conflict and provenance rules. Legacy personal quotes may be manually
linked after conservative matching/review. Marketplace records remain
organization-only.

## 16. Marketplace readiness and field ownership

Current v1 ingestion maps customer display name/email/phone; property address
lines/city/region/postal/country; external homeowner/property UUIDs; and
request/service context. With no external UUID it creates new customer/property
rows. `source_snapshot` preserves the original contract.

Tentative ownership matrix pending Marketplace repository review:

| Field | Vendor OS storage | Marketplace canonical? | Vendor editable? | Direction/conflict | Audit |
| --- | --- | --- | --- | --- | --- |
| Homeowner UUID | customer external ID | yes | no | M→V; reject replacement | required |
| Property UUID | property external ID | yes | no | M→V; reject replacement | required |
| Lead/request/vendor UUID | opportunity/org | yes | no | M→V; immutable | required |
| Name | customer | likely seed/shared | yes, pending contract | field-level reconciliation; no whole-row overwrite | correction audit |
| Email/phone | customer | likely seed/shared | yes, pending contract | preserve both source and operational value if divergent | required |
| Address | property | likely Marketplace seed | yes, pending contract | normalize; surface conflict | required |
| Coordinates/attributes | property | unknown | limited | wait for external schema | required if overwritten |
| Preferred contact | customer | likely operational | yes | V-owned unless Marketplace contract says otherwise | normal edit audit |
| Customer/property notes/tags/access | Vendor OS | no | yes | V-only, never outbound by default | sensitive audit |
| Request/service/budget/timing | opportunity snapshot | yes for assignment fact | no snapshot edit | M→V immutable snapshot | integration event |
| Workflow/status/assignee | opportunity/history | no | yes per role | V-owned; future outbound facts | history |

Must wait: canonical corrections, deleted Marketplace identities, retention,
consent, outbound contact edits, reconciliation cursors, and multi-location
vendor mapping. Do not infer external schema beyond the checked-in v1 contract.

## 17. Legacy quote and repair-request backfill

Newer quotes may have `opportunity_id`; legacy/direct quotes may not. Quotes
have no customer/property FKs. Direct quote `propertyAddress` is intentionally
omitted from `QuoteFormPayload`, so only ZIP/property facts persist. Contact
identity generally does not exist in direct quote storage. Repair requests have
contact/location but no durable quote/customer/property link; their contact is
flattened into quote job description on prefill.

Conservative policy:

- never auto-create/merge customers from weak quote JSON;
- retain every quote/source snapshot unchanged;
- deterministically traverse quote → opportunity → customer/property when
  present;
- allow later manual linking with preview and audit;
- only automate backfill for explicit external UUID or existing trusted FK;
- do not parse contact PII out of free-text job descriptions;
- treat repair requests as legacy intake snapshots until tenant-safe assignment
  and explicit conversion exist.

## 18. Tier capability matrix

No final numerical limits are defined in the available product facts. “Scaled”
means tentative usage/retention/team limits, while access to owned records
remains after downgrade.

| Capability | Free | Spark | Spark Pro | Insight | Intelligence | Intelligence Pro | Nexus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Directory/customer/property detail | core | core | core | core | core | core | multi-location |
| Basic search/history | core | core | core | core | core | core | cross-location |
| Manual notes/tasks | scaled | scaled | scaled | expanded | expanded | expanded | custom |
| Attachments/photos | scaled | scaled | higher | higher | higher | highest | custom |
| Advanced filters/export | limited/undecided | scaled | expanded | expanded | expanded | expanded | policy/custom |
| Team collaboration | personal/basic | basic | expanded | expanded | expanded | expanded | enterprise |
| Custom fields/workflows/API | — | — | — | limited/undecided | limited | expanded | custom |
| CRM reporting | basic factual | basic | expanded | expanded | AI-assisted | advanced | cross-location |
| AI customer summary | — | — | light/undecided | included | included | included | custom |
| Next-best action/prioritization | — | — | — | limited | included | advanced | custom |
| Forecasting | — | — | — | —/limited | included | advanced | cross-location |
| Automated response/sequences | Lead Velocity | Lead Velocity | Lead Velocity | Lead Velocity | Lead Velocity | Lead Velocity | custom/package |
| Seasonal nurture/win-back | Retention Engine across tiers | same | same | same | same | same | custom/package |
| Multi-location/reporting/integrations | — | — | — | — | — | limited single-location integration | Nexus |

Tier positioning remains: Free tests real value; Spark is first upgrade with
lower commission/website; Spark Pro adds visibility/video/light AI; Insight
adds full AI/professional web presence; Intelligence adds advanced AI,
automation, forecasting; Intelligence Pro maximizes automation/lowest
commission; Nexus is custom multi-location enterprise.

## 19. Enhancement conflict boundaries

| Potential cannibalization | Core/tier boundary | Paid owner |
| --- | --- | --- |
| Follow-up | show due/overdue; manual completion | Lead Velocity automates response and sequence |
| Retention | store history/last activity | Retention Engine identifies/executes nurture and win-back |
| Marketing | store segments/tags manually | AI Marketing Co-Pilot creates campaign strategy/content |
| Visibility | record acquisition source | Visibility Accelerator drives discoverability/acquisition |
| Intelligence | factual history/counts | Intelligence generates summaries, recommendations, forecasts |
| Enterprise | single active workspace | Nexus coordinates locations, policies, APIs, custom workflows |

Service enhancements remain delivery services, not CRM authorization:
Social Command, Video Velocity, Content Command Suite, and Ads Command may use
approved CRM inputs later but do not define record access.

## 20. Entitlement architecture

Add one future centralized capability service, not package-name checks in
components. It should accept authenticated account/workspace, subscription
projection, enhancement grants, and usage; return stable capabilities such as
`crm.customer.read`, `crm.note.create`, `crm.export`, `crm.ai.summary`, and
limits. Enforce capabilities in database/RPC or server mutation boundaries,
then reflect them in UI. Marketplace/package synchronization must be signed,
audited, cached with expiry, and fail safely.

Downgrades must preserve read/export access to owned data. Limit new creation or
automation rather than hiding existing customers. Nexus context must include
location scope and enterprise policy, not simply a larger capability array.

## 21. Analytics and AI readiness

| Metric/feature | Available now / missing and risk | Placement; CRM v1? |
| --- | --- | --- |
| Accepted quote value | accepted quote snapshot via linked opportunities; misses legacy/unlinked and is not revenue | factual reporting later; exclude aggregate from v1 unless labeled |
| Quote conversion | quote statuses exist; denominator/revisions and unlinked quotes ambiguous | Insight/reporting later |
| Repeat customer rate | customer links exist only through opportunities; duplicates distort | later after identity hardening |
| Average time to quote | opportunity/quote timestamps; linkage partial, event meaning imperfect | later factual metric |
| Opportunity aging | reliable status/created/updated/history | core/Insight; simple visibility possible |
| Lead source performance | origin and Marketplace snapshot; direct acquisition detail missing | reporting later |
| Service history | opportunities/quotes are sales, no completed job/service fact | unavailable; exclude |
| Customer lifetime value | no payment/collected revenue/job ledger | unavailable; do not claim |
| Next-best action | partial pipeline history, no communications/tasks/jobs | Intelligence future |
| Dormant customer | activity incomplete and identity duplicates | Retention Engine future |

Required future facts include job completion/service date, invoice/payment,
explicit quote revisions, communication delivery/response, task events,
customer merge aliases, and reliable source attribution.

## 22. Archive, delete, export, and privacy

Recommend additive `archived_at`, `archived_by`, optional reason, restore audit,
and default exclusion from directories while preserving linked records.
Archive must not cascade or alter opportunity/quote history. Avoid hard delete
through normal UI; exceptional erasure needs dependency preview, Marketplace/
legal retention review, audit redaction policy, and transactional handling.

Export should be capability-controlled but essential owned-data portability
must survive downgrade. Exclude raw signatures, IP addresses, access
instructions, integration payloads, and private photo URLs unless explicitly
authorized. Organization deletion currently conflicts with retained
integration events and cascades many operational records; it needs a separate
retention/export workflow.

Never place email, phone, address, notes, access instructions, signatures, or
external payloads in logs, analytics, cache keys, or URL filters. Audit actions
and field categories, not unnecessary before/after PII. Marketplace deletion
requires tombstone/reconciliation rules, not blind cascades.

## 23. Accessibility and responsive requirements

- one visible page heading and logical section/tab headings;
- labeled search/filter controls and explicit result count;
- native keyboard list links, menus, dialogs, and forms;
- focus moved to Detail heading on navigation and restored after dialogs;
- live but non-duplicated announcements for search results, save, archive, and
  partial errors;
- associated field errors and unsaved-change protection;
- no color-only source/status/overdue information;
- 44px practical interactive targets;
- semantic timeline list with text event type, actor, and timestamp;
- honest empty, loading, partial, and unavailable states;
- at 320px, stack filters/actions, wrap addresses/contact/timeline metadata,
  keep primary actions reachable, and avoid horizontal tables;
- directory rows become cards or responsive list content rather than clipped
  desktop grids; customer detail sections should work without hover.

## 24. Performance and scale

Likely bottlenecks are directory aggregates, customer/property timeline
fan-out, quote totals from JSON, search, attachment counts, and Nexus
cross-location queries.

Recommendations:

- cursor-paginate directories and timelines; bound all secondary collections;
- fetch directory aggregates in one grouped query or narrow RPC, never per-row;
- derive quote totals in application only for a bounded set initially; add a
  stored/validated summary only after evidence;
- use workspace/entity composite indexes aligned to filters;
- query timeline sources in parallel with stable per-source cursors and partial
  failure handling;
- denormalize/read-model only after query measurement;
- include user/workspace/filter/cursor in request identity, invalidate on
  workspace switch, and reject stale responses;
- cache only non-PII or securely scoped responses;
- design Nexus separately with location IDs and aggregate read models rather
  than removing tenant predicates.

## 25. Information architecture

Recommended v1 routes:

```text
/customers
/customers/[id]
/properties/[id]
```

Keep Customers as the top-level CRM entry. Although `/properties` already
occupies navigation, the first slice should make properties primarily
discoverable under Customer Detail and through deep links. Retain the existing
placeholder route until a useful cross-customer property directory is
justified; do not add more navigation. Opportunity and quote links remain
contextual actions from customer/property detail.

Customer Detail should use responsive sections initially, not a complex tab
system: overview/contact, properties, open opportunities, quotes, timeline,
then actions. Tabs become useful only when collection volume warrants separate
pagination and accessible URL/state behavior.

## 26. Recommended first vertical slice

PR5.2 should deliver:

- workspace-scoped, cursor-paginated Customer Directory;
- basic name/email/phone plus associated-address search;
- Customer Detail with contact/source;
- associated properties;
- active/recent opportunities;
- opportunity-linked quotes;
- bounded read-only merged timeline;
- mobile/keyboard/partial-state coverage.

It should be read-only unless product approves edit semantics before work
starts. Explicitly exclude archive, merge, attachments, custom fields, notes,
tasks/reminders, messaging, campaigns, automation, AI, analytics, jobs,
scheduling, payments, Marketplace transport/reconciliation, and tier gating.

This is coherent and repeatedly useful while minimizing irreversible schema
decisions.

## 27. Implementation roadmap

### PR5.2 — Customer directory and detail

- **Goal:** first useful read-only CRM.
- **Scope:** repository, directory/detail routes, basic search, bounded
  relationships/timeline.
- **Excluded:** mutations, automation, entitlements.
- **Likely files:** customer repository/types/formatters; `/customers`,
  `/customers/[id]`; customer components; navigation tests.
- **Database:** preferably none; add an index only if query plans prove needed.
- **Tests:** workspace scoping, stale switching, pagination, partial failures,
  E2E/mobile/accessibility.
- **Dependency/risk:** search performance and quote linkage completeness.
- **Done:** no N+1, safe not-found, personal/org parity, honest legacy gaps.

### PR5.3 — Data hardening, edit, and archive

- **Goal:** maintainable operational records.
- **Scope:** approved company/archive/source ownership fields, narrow mutation
  RPC/repository, audit, duplicate warnings.
- **Excluded:** merge and automation.
- **Database:** focused additive migration; archive/search indexes.
- **Tests:** RLS/role SQL, concurrency, Marketplace-field protection, restore.
- **Dependency:** archive and edit ownership decisions.
- **Done:** reversible archive and safe audited edits.

### PR5.4 — Property workspace and legacy linking

- **Goal:** property-centric operational context.
- **Scope:** `/properties/[id]`, attributes, relationships, manual reviewed link.
- **Excluded:** multi-contact join, jobs/service history.
- **Database:** none or narrow linking RPC/audit.
- **Tests:** cross-workspace links, address/privacy/mobile.
- **Dependency:** customer-property decision and legacy policy.
- **Done:** linked work visible without pretending quotes are service history.

### PR5.5 — CRM-native activity

- **Goal:** manual collaboration without automation.
- **Scope:** immutable internal notes, manual tasks/follow-up dates, hybrid
  timeline cursors.
- **Excluded:** messages, sequences, campaigns, scheduling.
- **Database:** activity/note/task tables with tenant RLS and indexes.
- **Tests:** append/edit policy, former actors, ordering, pagination.
- **Dependency:** note retention and manual reminder approval.
- **Done:** auditable manual work; no enhancement cannibalization.

### PR5.6 — Capability and entitlement foundation

- **Goal:** centralized safe gating.
- **Scope:** capability vocabulary, subscription projection boundary, usage
  checks, downgrade behavior.
- **Excluded:** Marketplace transport unless contract exists.
- **Database:** entitlement projection/cache only after ownership contract.
- **Tests:** every tier/enhancement, stale/failure/downgrade behavior.
- **Dependency:** approved tier boundaries and billing source.
- **Done:** no package-name component checks; server/database enforcement.

### PR5.7 — Marketplace CRM reconciliation

- **Goal:** explicit canonical-field synchronization.
- **Scope:** correction/deletion contracts, reconciliation, conflict UI/audit.
- **Excluded:** generic transport expansion beyond agreed events.
- **Database:** conflict/provenance additions only as contract requires.
- **Tests:** replay, correction, deletion, tenant/PII/adversarial cases.
- **Dependency:** Marketplace repository audit and signed contract.
- **Done:** no last-write-wins or silent identity merge.

### Later — attachments/search scale, Intelligence, Nexus

Attachments and trigram/full-text search follow measured need. Intelligence
adds AI summaries/actions/forecasting only after event quality. Nexus introduces
location hierarchy, cross-location permissions/reporting, API/custom workflow
controls. These are separately reviewed releases.

## 28. Open product decisions

| Question | Options | Recommendation | Deferral consequence | Marketplace required? |
| --- | --- | --- | --- | --- |
| Multi-contact property | simple FK / join now / join later | simple v1, join later | spouse/manager roles not modeled | useful, not required |
| Archive | hide only / status+audit / delete | timestamp+actor+restore | PR5.3 blocked | no |
| Relationship owner | none / assignee / customer owner | defer; do not reuse creator `user_id` | no ownership filters | no |
| Personal→org | move / copy / prohibit | prohibit until audited transfer | users recreate/link manually | no |
| Manual reminders | core / paid / absent | core manual, scaled | PR5.5 scope uncertain | no |
| Attachment limits | none / tier-scaled | tier-scaled, preserve access | storage cost unknown | no |
| Customer limits | hard / soft/tier-scaled / none | soft creation limits; preserve reads | entitlement design blocked | pricing facts |
| Export | all / paid / admin-only | portability for owners; enhanced formats gated | privacy/tier ambiguity | no |
| Custom fields | core / upper tier / Nexus | later upper-tier/Nexus | schema remains stable | no |
| Top-level Properties | now / later | detail links first; reassess usage | placeholder remains | no |
| Marketplace ownership | M/V/shared per field | explicit matrix contract | reconciliation blocked | yes |
| Merge timing | v1 / later | later after duplicates measured | duplicates remain visible | Marketplace helpful |
| Tier boundaries | broad access / heavy gating | core records all tiers, scale/intelligence gated | PR5.6 blocked | entitlement source |
| Enhancement boundaries | bundle automations / separate | preserve Lead Velocity/Retention Engine | cannibalization risk | no |
| Company name | add / infer / omit | explicit nullable field in hardening | commercial contacts limited | no |
| Accepted value | show / omit | label precisely; omit if incomplete | less summary value | no |

Before PR5.2, product must approve read-only scope, Customers-first navigation,
basic search PII behavior, and whether incomplete linked-quote counts may be
shown with honest labeling. Other decisions may wait.

## 29. Ranked risks

| Rank | Risk | Severity | Likelihood | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | Cross-workspace leakage/stale response | critical | medium | RLS plus trusted scope/request keys/adversarial tests |
| 2 | Duplicate identities | high | high | external IDs, normalization, suggestions, no silent merge |
| 3 | Competing snapshot/customer models | high | high | normalized operational canonical records; snapshots immutable |
| 4 | Marketplace field conflict | high | medium-high | ownership matrix and reconciliation |
| 5 | Destructive backfill | high | medium | explicit FK-only automation; manual link |
| 6 | Enhancement cannibalization | high | medium | manual visibility core; automation packages |
| 7 | Incorrect revenue/LTV claims | high | medium | distinguish accepted quote from payment |
| 8 | PII exposure | high | medium | no PII logs/URLs/raw events; narrow export |
| 9 | Over-gating Free | medium-high | medium | useful core, creation limits not data lockout |
| 10 | Under-monetizing automation | medium-high | medium | capability boundaries |
| 11 | Timeline/query fan-out | medium | high with growth | bounded hybrid/cursors/read model after measurement |
| 12 | Broad org member edits | medium | medium | audit first, roles only with evidence |
| 13 | Premature enterprise complexity | medium | medium | Nexus separate location architecture |
| 14 | Missing service history | medium | high | do not relabel opportunities/quotes as jobs |

## 30. Final recommendation

**READY WITH DECISIONS.**

Begin PR5.2 as a read-only Customer Directory and Customer Detail vertical
slice using the existing normalized schema. Required approvals are the
read-only boundary, Customers-first information architecture, search/PII URL
behavior, and honest treatment of incomplete quote aggregates. Marketplace
field ownership, correction/deletion, merge/reconciliation, and outbound sync
may wait for the Marketplace repository.

Final CRM v1 is directory + customer detail + associated properties,
opportunities, opportunity-linked quotes, and bounded read-only timeline,
followed by approved edit/archive. Every tier receives meaningful access to
owned records. Scale, collaboration depth, intelligence, automation, and
enterprise coordination provide upgrade value. Lead Velocity and Retention
Engine retain their automation domains; Nexus remains multi-location/custom.

This PR changed no product code, migration, RLS, grant, repository, route,
component, navigation, test, pricing, entitlement, or production behavior.

## Appendix A: supporting relational inventory

This is the final post-migration shape relevant to CRM, reconstructed from SQL
rather than TypeScript alone.

| Relation | Columns relevant to CRM | Keys/deletion and access |
| --- | --- | --- |
| `organizations` | `id`, `name`, `marketplace_vendor_id`, timestamps | Marketplace vendor partial unique; member-readable; name-only authenticated UPDATE grant |
| `organization_members` | `id`, `organization_id`, `user_id`, enum `role`, `created_at` | organization/user unique; organization and auth-user cascade; membership RLS/RPCs |
| `organization_invites` | organization, email, role, token, inviter, expiry/acceptance | pending-email unique per org; not membership |
| `customers` | exact schema in section 4 | organization/user workspace indexes; scoped Marketplace uniqueness; no DELETE grant |
| `properties` | exact schema in section 5 | customer set-null; organization/user/customer indexes; no DELETE grant |
| `opportunities` | workspace/user, customer/property, Marketplace lead/request, origin/status/service, summary/description, assignee, snapshot/lifecycle/timestamps | customer/property/assignee set-null; workspace cascade; Marketplace lead unique; guarded status/assignment |
| `opportunity_status_history` | opportunity, from/to status, actor, source, integration event, reason/details/timestamps | opportunity cascade; actor/event set-null; authenticated SELECT only |
| `opportunity_assignment_history` | opportunity, previous/new assignee, actor, source/reason/timestamps | opportunity cascade; user references set-null; authenticated SELECT only |
| `quotes` | workspace/user, optional opportunity, reference, status, service/job, `form_data`, `quote_data`, source, vendor snapshot, share token/shared/viewed/timestamps | opportunity set-null; quote browser CRUD under quote RLS; share token unique |
| `quote_acceptances` | quote, token, signer, signature, IP, accepted time | one per quote; quote cascade; narrow token RPC, creator-oriented vendor read |
| `quote_change_requests` | quote, token, message, requester contact, IP, submitted time | quote cascade; many per quote; narrow token RPC, creator-oriented vendor read |
| `repair_requests` | service/description/location/ZIP/urgency/photos/contact/status | no workspace/customer/property/quote FK; anon insert; all authenticated read/update |
| `organization_audit_log` | organization, actor, action, target, metadata, time | organization cascade; actor/target set-null; member read, RPC writes |
| `integration_events` | identity/direction/type/version/source/org/times/retry state/actor/entities/metadata/payload | organization restrict; unique source/event; no browser grants |

There are no CRM note, task, reminder, attachment, customer-property join,
merge-alias, archive, subscription, entitlement, billing, feature-flag,
location, job, payment, or communication tables.

## Appendix B: application and validation inventory

| Area | Implemented files |
| --- | --- |
| Customer/property type contracts | `lib/supabase/types.ts` |
| Customer/property repositories | none |
| Customer/property routes | placeholder `app/customers/page.tsx`, placeholder `app/properties/page.tsx`; no detail routes |
| Embedded customer/property UI | `OpportunityDetailWorkspace`, `OpportunityListItem`, Business Command Center |
| Opportunity repositories | `lib/opportunities/repository.ts`, assignment/history helpers |
| Quote persistence | `lib/quotes/store.ts`, `lib/supabase/migrate-local.ts`, quote form/flow components |
| Public quote/acceptance/change | `/quote/[token]`, quote share Route Handlers and token RPC adapters |
| Marketplace projection | signed event Route Handler, event schemas, server adapter, migration 021 RPC |
| Workspace state | `WorkspaceProvider`, organization store/storage/types, workspace switcher |
| Navigation | Customers and Properties are already top-level items in `workspace-navigation.tsx` |
| Search precedents | opportunity URL filters, address autocomplete, property lookup; no CRM search |
| Entitlements | no package/subscription/capability service or checks found |

Relevant validation exists for migration 020/021 tenancy and ingestion,
opportunity repositories/list/detail/history/assignment, quote workspace
mapping/store/public portal, dashboard workspace counts, workspace navigation,
and environment-gated Playwright flows. There are no customer/property
repository, directory, detail, mutation, archive, search, duplicate, export, or
entitlement tests because those features do not exist.
