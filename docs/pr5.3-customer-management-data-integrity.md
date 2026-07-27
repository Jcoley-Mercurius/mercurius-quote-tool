# PR5.3 Customer Management and Data Integrity

Status: implemented and release validation pending database/browser fixtures

## Schema and migration

Migration `024_customer_management_data_integrity.sql` is additive. The
pre-migration customer table had `id`, workspace owner fields,
`marketplace_homeowner_id`, display/contact fields, `notes`, `tags`, and
database-maintained timestamps. Migration 020's `set_updated_at` trigger and
`protect_marketplace_workspace_fields` trigger already maintained the version
and froze workspace/Marketplace identity. Authenticated clients had scoped
SELECT/INSERT/UPDATE (never DELETE) through personal-owner and current
organization-membership RLS.

PR5.3 adds nullable `company_name`, `archived_at`, `archived_by`,
`archive_reason`, `normalized_email`, and `normalized_phone`.
`archived_by` uses `ON DELETE SET NULL`; restoration clears every archive
field. Company and reason lengths are constrained. A trigger trims operational
values and derives lowercase email and digits-only phone comparison values
while retaining the entered display values. Phone comparison is deliberately
not presented as E.164 or internationally canonical.

Scoped email/phone indexes support bounded exact duplicate candidates. Scoped
archive/status plus `updated_at,id` indexes match the directory predicates and
cursor ordering. There is no uniqueness constraint on mutable PII.

## Mutations, authority, and concurrency

The browser calls three SECURITY DEFINER functions: `update_customer`,
`archive_customer`, and `restore_customer`. They derive `auth.uid()`, lock the
target, verify personal ownership or current organization membership, accept
only approved fields, compare the caller's expected `updated_at`, perform the
change, and write audit history in one transaction. Missing and inaccessible
records have the same failure. The application maps database failures to safe
conflict, validation, authorization, or availability messages.

Editable fields are display name, company, email, phone, preferred contact
method, the existing `notes` value presented as one Customer Summary, and
tags. IDs, workspace ownership, Marketplace homeowner ID, source provenance,
creation/version timestamps, and archive metadata are not accepted by the
update function. Normal table updates are blocked by a trigger, and the
authenticated role still has no delete grant. Marketplace ingestion inserts
and its immutable snapshots are unchanged.

All maintenance operations use optimistic concurrency. A stale update,
archive, or restore fails; the UI asks the user to reload and never silently
retries or overwrites.

## Archive and audit behavior

Archive is reversible record state, not deletion or merge. It atomically stores
time, authenticated actor, and an optional 300-character reason. Customer
properties, opportunities, linked quotes, provenance, and history are not
changed. Archived customers are excluded from the default directory, remain
directly readable in-scope, are visibly labeled, cannot be normally edited,
and offer Restore.

`customer_audit_history` is a narrow append-only table. Each row has exactly
one personal or organization scope, customer, actor, action, changed field
categories, and timestamps. It never stores old/new email or phone. RLS checks
the parent customer and personal owner/current organization membership.
Authenticated clients receive SELECT only; update/delete are trigger-blocked.
Curated update/archive/restore entries join Customer Detail's bounded timeline.
The organization-only audit log was not reused because it cannot truthfully
represent personal workspaces.

## Duplicate detection and relationship context

Duplicate detection is advisory, limited to eight candidates, and constrained
by the active workspace query plus RLS. Exact normalized email, normalized
phone, and case-insensitive exact display name explain each match. Archived
and Marketplace-origin records remain separate records and safe candidates.
No global lookup, merge, re-link, delete, or blocking uniqueness is performed.
Associated-address similarity is a known future enhancement; PR5.3 does not
pretend the current signals include it.

Customer Health is factual copy, never a score:

- **Profile incomplete** when both email and phone are absent.
- **Returning customer** when bounded detail data contains more than one
  opportunity or more than one opportunity-linked quote.
- **New relationship** when neither rule applies. This means insufficient
  linked Mercurius history, not first-ever contact.

The supporting line explicitly counts linked properties, opportunities, and
opportunity-linked quotes. If a bounded source fails, it says signals are
temporarily unavailable. It does not expose revenue, lifetime value, churn,
probability, or AI claims.

Customer Since is the earliest of customer creation, bounded linked
opportunity creation, and bounded opportunity-linked quote creation. Unlinked
legacy quote snapshots are excluded. UI wording stays “Customer since”; it is
a Mercurius record date, not a claim about offline history.

## Product and operational behavior

Personal owners and current organization owners, admins, and members can edit,
archive, restore, read audit events, and receive duplicates within their own
scope. Pending invitees, removed members, and outsiders have no membership
predicate and receive no record access. Workspace identity is part of detail,
directory/filter, and refresh request keys; late responses are discarded.

The edit and archive interfaces use labeled modal dialogs, focus trapping and
return, Escape/cancel handling, 44px controls, explicit progress/error states,
unsaved-change confirmation, semantic duplicate/conflict alerts, and wrapping,
scrollable phone-width layouts. Saving refreshes authoritative detail and
timeline state. Archive copy explicitly says linked data is preserved.
Operational edits never sync to or modify the original Marketplace source.

## Validation and limitations

The SQL validation checks grants, secure functions, deterministic
normalization, personal and organization role edits, outsider/removed denial,
stale writes, archive actor/reason, relationship preservation, restore,
personal/organization audit scoping, append-only history, and no browser
delete. Application tests cover the narrow RPC projection and safe error
mapping in addition to PR5.2 repository/component regressions.
Environment-gated Playwright scenarios cover edit and 320px archive/restore
when disposable credentials plus `E2E_CUSTOMER_ID` are supplied.

Known limitations:

- duplicate name matching is exact after case folding, not fuzzy;
- address similarity is not implemented;
- health and Customer Since use the existing bounded detail data and disclose
  incompleteness rather than issuing overconfident labels;
- SQL and browser scenarios require a disposable migrated Supabase fixture;
- customer creation, merge, export, field ownership, notes/tasks, messaging,
  automation, entitlements, and Property Intelligence remain out of scope.

Recommended PR5.4: implement only the separately approved Property Detail and
conservative property/legacy-linking work, preserving these mutation and
tenant boundaries.
