# PR5.5 Internal Notes and Manual Follow-Up

Status: implemented; disposable SQL/browser validation remains required

## Domain model and migration

Migration `026_internal_notes_manual_follow_up.sql` adds three relational
tables:

- `crm_notes`: exactly one customer/property target, truthful personal or
  organization scope, derived author, trimmed plain-text body (1–5000
  characters), timestamps, and reversible archive metadata.
- `crm_tasks`: exactly one target, derived creator/workspace, optional valid
  assignee, title (1–200), optional description (up to 2000), optional
  `timestamptz` due time, open/completed status, completion actor/time,
  timestamps, and reversible archive metadata.
- `crm_task_history`: append-only task lifecycle facts with actor, scope,
  action, changed field categories, and time. Descriptions and private values
  are never copied.

Customer and property audit tables remain domain-specific. Notes/tasks are
their own authoritative records; a generalized duplicate activity store was
not introduced.

## Ownership, roles, and mutations

Every creation RPC accepts one customer or property ID, derives `auth.uid()`,
loads that target through personal ownership/current organization membership,
and derives workspace columns. Supplying zero/two targets or a cross-workspace
target fails without revealing existence.

Personal tasks may be unassigned or assigned to the personal owner.
Organization tasks may be assigned only to a current owner/admin/member.
Pending, removed, outside, and cross-organization assignees cannot be newly
selected. Existing tasks retain removed-user identity until auth deletion and
are labeled Former team member.

Owners, admins, and members share the approved simple create/view/update/
archive behavior. Pending/removed/outside users fail the membership predicate.
No client role or workspace ID is accepted as authority.

The browser uses narrow RPCs for note creation/archive and task creation,
editing, completion/reopen, and archive. Direct update/delete is revoked and
guarded by triggers. Database errors map to safe conflict, authorization,
validation, or availability messages.

## Note policy

Notes are immutable after creation and may be archived, the approved simpler
policy. This preserves author attribution without a premature revision
system. Archive requires the expected note version and records actor/time.
Ordinary UI hides archived notes; their creation/archive lifecycle remains
available to bounded history. There is no browser hard delete.

Notes are escaped plain text with preserved line breaks. They are distinct
from mutable customer/property summary fields and are explicitly described as
workspace-private, not customer-facing communications.

## Tasks, due dates, and concurrency

Tasks have only `open` and `completed`. Completion atomically records actor and
time; reopen clears both. Task edits, assignment, due changes, completion,
reopen, and archive require expected `updated_at`. Stale writes never retry or
overwrite.

`datetime-local` input is interpreted in the browser’s local timezone,
converted to an exact ISO instant, and stored as `timestamptz`. Display includes
the user’s local date/time. A task is overdue exactly when it is open, has a
due time, and that time is before now. Completed tasks are always labeled
Completed. Other factual labels are No due date, Due today, Due tomorrow, or a
formatted due date.

No emails, texts, notifications, reminders, sequences, recurring tasks,
calendar events, or automatic actions occur.

## Customer/property integration and timelines

Customer Detail and Property Detail each contain bounded Internal notes and
Manual follow-up sections with creation actions, author/assignee labels,
open/overdue counts, empty/partial states, completion/reopen, edit, and archive.
Property access instructions remain a separate collapsed private section and
are never defaults for note/task fields.

Existing customer/property timelines merge authoritative note creation/archive
and append-only task lifecycle facts. Note bodies are escaped and truncated to
120 characters in timeline context. Task titles may appear; descriptions do
not. Stable source IDs, descending ordering, deduplication, bounded reads, and
partial failure behavior remain intact. UUIDs, access instructions, raw
contact values, Marketplace payloads, signatures, and IP addresses are absent.

## Dashboard decision and product boundaries

No dashboard summary or top-level navigation was added. Entity-detail views
provide the minimum useful attention surface without creating a broad task
product or additional dashboard query path.

Core CRM provides only manual notes, manual tasks, factual due visibility, and
human-triggered completion. Automated lead response and follow-up sequences
remain Lead Velocity. Seasonal nurture and win-back remain Retention Engine.
AI recommendations and prioritization remain Intelligence. No tier gating was
added.

## Privacy, performance, and accessibility

RLS is authoritative; authenticated clients receive scoped SELECT plus narrow
RPC execution only. There is no service role, generic JSON endpoint, browser
delete, PII URL, note/task logging, cross-workspace enumeration, or hidden-data
copying.

Notes/tasks initially load 20 records and offer bounded 20-record expansion up
to 100. Timeline CRM facts are bounded. Entity/status/due/assignee indexes match the implemented queries.
Actors are resolved from the already grouped membership read, avoiding N+1
profile lookups. Request identity contains user, workspace, target, and refresh
version; workspace changes discard late reads and unmount dialogs.

Dialogs have semantic labels, focus trap/return, Escape support, unsaved-change
confirmation, live outcomes, labeled fields, 44px controls, and vertically
scrollable phone layouts. Long text and actions wrap; overdue/completed states
include explicit words rather than relying on color or strike-through.

## Validation and known limitations

Focused tests cover narrow RPC arguments, safe error mapping, task lifecycle
operations, and deterministic due labels alongside customer/property
regressions. SQL validation covers personal and organization roles, targeting,
assignment, author/actor derivation, validation, immutability/archive,
concurrency, completion/reopen, append-only history, and denial paths.
Environment-gated Playwright covers customer/property notes, task creation,
privacy-safe defaults, keyboard use, and 320px layout.

SQL needs a disposable database migrated through 026. Browser scenarios need
Supabase credentials plus seeded `E2E_CUSTOMER_ID` and `E2E_PROPERTY_ID`.

Known limitations: no note revision history, restore UI for archived notes/
tasks, global task view, dashboard attention summary, activity beyond the
explicit 100-record detail cap, automated notifications, or calendar integration.

Recommended pause: review the Marketplace repository and privacy contract
before any bidirectional CRM synchronization or reconciliation.

Recommended PR5.6: only the separately approved capability/entitlement
foundation; do not fold automation into core CRM.
