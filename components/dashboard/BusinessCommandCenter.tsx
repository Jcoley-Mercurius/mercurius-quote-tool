"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { useQuoteHistory } from "@/components/quotes/QuoteHistoryProvider";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import { formatDashboardDate, formatRelativeDate } from "@/lib/dashboard/format";
import {
  calculateGrowthScore,
  type GrowthScoreDimensionInput,
} from "@/lib/dashboard/growth-score";
import { fetchDashboardData } from "@/lib/dashboard/repository";
import {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  type DashboardRepositoryData,
  type MetricResult,
  type OpportunitySummary,
} from "@/lib/dashboard/types";
import type { VendorProfile } from "@/lib/vendor/types";
import { MetricState } from "./MetricState";

const UNAVAILABLE: MetricResult<number> = {
  status: "unavailable",
  reason: "This metric is not available yet.",
};

const STATUS_STYLES = {
  new: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  opened: "bg-sky-50 text-sky-800 ring-sky-200",
  quoting: "bg-amber-50 text-amber-800 ring-amber-200",
  quoted: "bg-violet-50 text-violet-800 ring-violet-200",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  lost: "bg-slate-100 text-slate-700 ring-slate-200",
  declined: "bg-slate-100 text-slate-700 ring-slate-200",
  closed: "bg-slate-100 text-slate-700 ring-slate-200",
} as const;

export function BusinessCommandCenter() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { profile, isLoading: profileLoading } = useVendorProfile();
  const { quotes, isLoading: quotesLoading, loadError: quotesError } = useQuoteHistory();
  const now = useSyncExternalStore(subscribeClock, getClientNow, getServerNow);
  const workspaceDataKey = user
    ? `${user.id}:${workspace.type === "organization" ? workspace.organizationId : "personal"}`
    : "signed-out";
  const [dashboardState, setDashboardState] = useState<{
    key: string;
    data: DashboardRepositoryData;
  } | null>(null);
  const data = dashboardState?.key === workspaceDataKey ? dashboardState.data : null;
  const dataLoading = data === null;

  useEffect(() => {
    if (!user) return;
    let current = true;
    void fetchDashboardData(user.id, workspace).then((result) => {
      if (current) {
        setDashboardState({ key: workspaceDataKey, data: result });
      }
    });
    return () => {
      current = false;
    };
  }, [user, workspace, workspaceDataKey]);

  const profilePoints = profileCompleteness(profile);
  const dimensions = useMemo<GrowthScoreDimensionInput[]>(
    () => [
      {
        id: "profile",
        label: "Business profile",
        availablePoints: 35,
        earnedPoints: profileLoading ? undefined : Math.round(profilePoints * 35),
        explanation:
          profilePoints === 1
            ? "Your core business details are complete."
            : "Add your business name and contact details to strengthen your workspace.",
        improvementHref: "/settings",
        unavailableReason: "Business profile is still loading.",
      },
      metricDimension(
        "quotes",
        "Quote activity",
        25,
        quotesLoading || quotesError ? undefined : Math.min(25, quotes.length * 5),
        quotesError ? "Quote activity could not be observed." : "Create quotes consistently as opportunities develop.",
        "/quote"
      ),
      countDimension("customers", "Customer records", 20, data?.customerCount, "/customers"),
      countDimension("properties", "Property documentation", 20, data?.propertyCount, "/properties"),
    ],
    [data, profileLoading, profilePoints, quotes.length, quotesError, quotesLoading]
  );
  const growthScore = calculateGrowthScore(dimensions);
  const opportunities = data?.opportunities;

  return (
    <div className="space-y-8 pb-8">
      <CommandCenterHeader
        now={now}
        displayName={displayName(user)}
        organizationName={
          workspace.type === "organization"
            ? workspace.name
            : profile.businessName || "Personal workspace"
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <GrowthScoreCard result={growthScore} />
        <Priorities
          loading={dataLoading}
          newOpportunities={data?.newOpportunityCount}
          unassignedOpportunities={data?.unassignedOpportunityCount}
          profileIncomplete={!profileLoading && profilePoints < 1}
          quoteChanges={
            quotesLoading || quotesError
              ? null
              : quotes.filter((quote) => quote.status === "changes_requested").length
          }
        />
      </div>

      <BusinessHealth
        loading={dataLoading || quotesLoading}
        newOpportunities={data?.newOpportunityCount ?? UNAVAILABLE}
        openOpportunities={data?.openOpportunityCount ?? UNAVAILABLE}
        quotes={
          quotesError
            ? { status: "error", message: quotesError }
            : { status: "ready", value: quotes.length }
        }
        customers={data?.customerCount ?? UNAVAILABLE}
        properties={data?.propertyCount ?? UNAVAILABLE}
      />

      <RecentOpportunities
        loading={dataLoading}
        result={opportunities}
        now={now}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <HomesImpacted loading={dataLoading} result={data?.propertyCount ?? UNAVAILABLE} />
        <RecentActivity
          loading={quotesLoading}
          error={quotesError}
          quotes={quotes.slice(0, 5)}
          now={now}
        />
      </div>
      <QuickActions />
    </div>
  );
}

const CLIENT_NOW = typeof window === "undefined" ? null : new Date();
function subscribeClock(): () => void {
  return () => undefined;
}
function getClientNow(): Date | null {
  return CLIENT_NOW;
}
function getServerNow(): null {
  return null;
}

function CommandCenterHeader({
  now,
  displayName,
  organizationName,
}: {
  now: Date | null;
  displayName: string | null;
  organizationName: string;
}) {
  const greeting =
    !now ? "Welcome" : now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  return (
    <header className="border-b border-slate-200 pb-6">
      <p className="text-sm font-semibold text-emerald-700">{organizationName}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {greeting}{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">{now ? formatDashboardDate(now) : "\u00a0"}</p>
      </div>
      <p className="mt-3 max-w-2xl text-slate-600">
        Here&apos;s what needs attention and where your business is moving.
      </p>
    </header>
  );
}

function GrowthScoreCard({
  result,
}: {
  result: ReturnType<typeof calculateGrowthScore>;
}) {
  return (
    <section className="rounded-2xl bg-emerald-950 p-6 text-white shadow-sm" aria-labelledby="growth-score-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-200">Business Growth Score v1</p>
          <h2 id="growth-score-title" className="mt-2 text-4xl font-semibold">
            {result.score === null ? "Not enough data yet" : `${result.score} / 100`}
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            {result.status === "partial"
              ? "A partial score based only on the data Mercurius can observe."
              : "A practical snapshot of your workspace foundations."}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {result.dimensions.map((dimension) => (
          <div key={dimension.id} className="rounded-xl bg-white/10 p-3">
            <div className="flex justify-between gap-3 text-sm font-medium">
              <span>{dimension.label}</span>
              <span>
                {dimension.earnedPoints === null
                  ? "Unavailable"
                  : `${dimension.earnedPoints} / ${dimension.availablePoints}`}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-emerald-100">
              {dimension.earnedPoints === null
                ? dimension.unavailableReason
                : dimension.explanation}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Priorities({
  loading,
  newOpportunities,
  unassignedOpportunities,
  profileIncomplete,
  quoteChanges,
}: {
  loading: boolean;
  newOpportunities?: MetricResult<number>;
  unassignedOpportunities?: MetricResult<number>;
  profileIncomplete: boolean;
  quoteChanges: number | null;
}) {
  const items = [
    {
      label: "New opportunities",
      value: newOpportunities?.status === "ready" ? newOpportunities.value : null,
      description: "Review new requests and decide the next step.",
      href: "/opportunities",
    },
    {
      label: "Unassigned opportunities",
      value:
        unassignedOpportunities?.status === "ready"
          ? unassignedOpportunities.value
          : null,
      description: "Make ownership clear for active requests.",
      href: "/opportunities",
    },
    {
      label: "Quotes needing changes",
      value: quoteChanges,
      description: "Respond to homeowner change requests.",
      href: "/quotes",
    },
  ];
  if (profileIncomplete) {
    items.push({
      label: "Complete business profile",
      value: 1,
      description: "Add the details customers and your team rely on.",
      href: "/settings",
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="priorities-title">
      <SectionTitle id="priorities-title" eyebrow="Focus" title="Today’s priorities" />
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 outline-none transition hover:border-emerald-200 hover:bg-emerald-50/40 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
            </span>
            <span className="shrink-0 text-xl font-semibold text-slate-950">
              {loading ? "…" : item.value ?? "—"}
              <span className="sr-only">{item.value === null ? " unavailable" : ""}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BusinessHealth(props: {
  loading: boolean;
  newOpportunities: MetricResult<number>;
  openOpportunities: MetricResult<number>;
  quotes: MetricResult<number>;
  customers: MetricResult<number>;
  properties: MetricResult<number>;
}) {
  const metrics = [
    ["New opportunities", props.newOpportunities],
    ["Open opportunities", props.openOpportunities],
    ["Quotes created", props.quotes],
    ["Customers", props.customers],
    ["Properties", props.properties],
  ] as const;
  return (
    <section aria-labelledby="health-title">
      <SectionTitle id="health-title" eyebrow="Snapshot" title="Business health" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map(([label, result]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              <MetricState result={result} loading={props.loading} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentOpportunities({
  loading,
  result,
  now,
}: {
  loading: boolean;
  result?: DashboardRepositoryData["opportunities"];
  now: Date | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="opportunities-title">
      <div className="flex items-center justify-between gap-4 p-6">
        <SectionTitle id="opportunities-title" eyebrow="Pipeline" title="Recent opportunities" />
        <Link href="/opportunities" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          View all
        </Link>
      </div>
      <div className="border-t border-slate-100">
        {loading ? (
          <LoadingRows />
        ) : !result || result.status === "unavailable" ? (
          <EmptyMessage title="Opportunities unavailable" detail="This workspace does not support opportunity reads yet." />
        ) : result.status === "error" ? (
          <EmptyMessage title="Opportunities couldn’t be loaded" detail={result.message} error />
        ) : result.value.length === 0 ? (
          <EmptyMessage
            title="No opportunities yet"
            detail="New Marketplace assignments and manually created opportunities will appear here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {result.value.map((item) => (
              <OpportunityRow key={item.id} item={item} now={now} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function OpportunityRow({ item, now }: { item: OpportunitySummary; now: Date | null }) {
  return (
    <Link
      href="/opportunities"
      className="grid gap-3 p-5 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-slate-950">{item.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[item.status]}`}>
            {OPPORTUNITY_STATUS_LABELS[item.status]}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">
          {item.customerName || "Customer details pending"} · {item.propertyLabel || "Property details pending"}
        </p>
      </div>
      <div className="text-left text-xs text-slate-500 sm:text-right">
        <p className="font-medium text-slate-700">{OPPORTUNITY_ORIGIN_LABELS[item.origin]}</p>
        <p className="mt-1">{now ? formatRelativeDate(item.updatedAt, now) : "\u00a0"}</p>
      </div>
    </Link>
  );
}

function HomesImpacted({ loading, result }: { loading: boolean; result: MetricResult<number> }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" aria-labelledby="homes-title">
      <SectionTitle id="homes-title" eyebrow="Mission" title="Homes impacted" />
      <p className="mt-5 text-5xl font-semibold tracking-tight text-emerald-950">
        <MetricState result={result} loading={loading} />
      </p>
      <p className="mt-3 text-sm leading-6 text-emerald-900">
        Distinct homes represented by property records in this Mercurius workspace.
      </p>
    </section>
  );
}

function RecentActivity({
  loading,
  error,
  quotes,
  now,
}: {
  loading: boolean;
  error: string | null;
  quotes: ReturnType<typeof useQuoteHistory>["quotes"];
  now: Date | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="activity-title">
      <SectionTitle id="activity-title" eyebrow="Workspace" title="Recent activity" />
      {loading ? (
        <div className="mt-5"><LoadingRows /></div>
      ) : error ? (
        <p className="mt-5 text-sm text-red-700">Quote activity couldn&apos;t be loaded.</p>
      ) : quotes.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-slate-500">
          No supported activity yet. Quote updates will appear here.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {quotes.map((quote) => (
            <li key={quote.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              <div className="min-w-0">
                <Link href="/quotes" className="truncate text-sm font-medium text-slate-900 hover:text-emerald-700">
                  Quote {quote.reference} updated
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {quote.jobName} · {now ? formatRelativeDate(quote.updatedAt, now) : "\u00a0"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuickActions() {
  const actions = [
    ["/quote", "Create quote", "Start the existing quote workflow"],
    ["/opportunities", "View opportunities", "Review incoming work"],
    ["/quotes", "View quotes", "Open quote history"],
    ["/customers", "Customers", "View customer records"],
    ["/properties", "Properties", "View documented homes"],
    ["/team", "Manage team", "Open team settings"],
    ["/settings", "Settings", "Update your business profile"],
  ];
  return (
    <section aria-labelledby="actions-title">
      <SectionTitle id="actions-title" eyebrow="Take action" title="Quick actions" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(([href, label, detail]) => (
          <Link
            key={href}
            href={href}
            className="min-h-24 rounded-2xl border border-slate-200 bg-white p-4 outline-none transition hover:border-emerald-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span className="font-semibold text-slate-950">{label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
    </div>
  );
}

function EmptyMessage({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className={`font-semibold ${error ? "text-red-800" : "text-slate-900"}`}>{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div role="status" aria-label="Loading" className="space-y-1 p-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function displayName(user: ReturnType<typeof useAuth>["user"]): string | null {
  if (!user) return null;
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().split(/\s+/)[0];
  }
  return null;
}

function profileCompleteness(profile: VendorProfile): number {
  const fields = [profile.businessName, profile.phone, profile.email, profile.tagline];
  return fields.filter((field) => field.trim().length > 0).length / fields.length;
}

function metricDimension(
  id: string,
  label: string,
  availablePoints: number,
  earnedPoints: number | undefined,
  explanation: string,
  improvementHref: string
): GrowthScoreDimensionInput {
  return {
    id, label, availablePoints, earnedPoints, explanation, improvementHref,
    unavailableReason: `${label} could not be observed.`,
  };
}

function countDimension(
  id: string,
  label: string,
  availablePoints: number,
  result: MetricResult<number> | undefined,
  improvementHref: string
): GrowthScoreDimensionInput {
  return metricDimension(
    id,
    label,
    availablePoints,
    result?.status === "ready" ? Math.min(availablePoints, result.value * 4) : undefined,
    `Add ${label.toLowerCase()} as your workspace grows.`,
    improvementHref
  );
}
