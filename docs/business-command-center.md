# Business Command Center v1

PR4.1 extends the existing authenticated client-context architecture. `RequireAuth`
protects private routes, `WorkspaceProvider` resolves the active personal or
organization workspace, and the browser Supabase client uses the authenticated
session plus existing RLS policies. Public homeowner quote, repair request,
invitation, and authentication routes remain outside the workspace shell.

## Data boundaries

`lib/dashboard/repository.ts` is the only new dashboard query boundary. It accepts
the authenticated user ID and the already-resolved `Workspace`; it never accepts
an organization ID from a route or query string. Every query explicitly filters
personal records by user and null organization, or organization records by the
active organization. Existing RLS remains the final authorization boundary.

Opportunity summaries select five recently updated records and only presentation
fields plus joined customer/property labels. Webhook payloads and integration
event persistence are not queried. New, open, and unassigned opportunity totals
use separate exact, workspace-scoped count queries so dashboard metrics are not
limited to the five recent rows. Customer and property queries likewise request
exact counts rather than records. Each independent result preserves ready, error,
and unavailable states.

Recent activity is deliberately limited to quote updates already available from
the established quote store. It does not claim to be a complete audit feed.

## Growth Score v1

The pure calculation is in `lib/dashboard/growth-score.ts`. Observable dimensions
are profile completeness (35 points), quote activity (25), customer records (20),
and property documentation (20). Profile completeness uses business name, phone,
email, and tagline. Quote activity earns five points per quote; customer and
property dimensions earn four points per record, each capped at its weight.

The final score normalizes earned points across observable points only. Failed or
unavailable dimensions are excluded rather than assigned zero. With no observable
dimensions the result is “Not enough data yet.” Values are clamped and the score
cannot exceed 100. Future dimensions can be added as inputs without changing the
presentation contract.

## Homes Impacted v1

Homes Impacted is the exact count of property records scoped to the active
workspace. The UI describes these as homes represented in Mercurius; it does not
claim completed work or customers served. A successful empty query is `0`.
Failures remain errors, never zero.

## Deferred

Opportunity list/detail workflows, assignment, messaging, scheduling, storefront
editing, services management, analytics, Business Plan progression, and a unified
event feed remain future work. Their routes are stable, navigable placeholders.
No migration or environment variable was added.
