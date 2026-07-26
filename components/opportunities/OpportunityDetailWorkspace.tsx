"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { fetchOrganizationMembers } from "@/lib/organizations/members";
import { getOrganizationMemberLabel } from "@/lib/organizations/types";
import {
  formatMarketplaceBudget,
  formatOpportunityDate,
  formatOpportunityDateTime,
  formatPropertyAddress,
  formatReasonCode,
  isUuid,
} from "@/lib/opportunities/format";
import {
  fetchOpportunityDetail,
  fetchOpportunityHistory,
  fetchOpportunityQuotes,
} from "@/lib/opportunities/repository";
import {
  OPPORTUNITY_HISTORY_LIMIT,
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_QUOTES_LIMIT,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  type OpportunityDetail,
  type OpportunityHistoryItem,
  type OpportunityLinkedQuote,
  type SecondaryResult,
} from "@/lib/opportunities/types";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
} from "@/lib/quotes/types";

interface ReadyState {
  key: string;
  detail: OpportunityDetail;
  history: SecondaryResult<OpportunityHistoryItem[]>;
  quotes: SecondaryResult<OpportunityLinkedQuote[]>;
  memberLabels: Map<string, string>;
}

export function OpportunityDetailWorkspace({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const { user } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const workspaceKey = workspace.type === "organization"
    ? `org:${workspace.organizationId}`
    : "personal";
  const requestKey = user ? `${user.id}:${workspaceKey}:${opportunityId}` : "signed-out";
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [state, setState] = useState<{ key: string; value: "not-found" | "error" } | null>(null);
  const current = ready?.key === requestKey ? ready : null;
  const currentState = !isUuid(opportunityId)
    ? "not-found"
    : state?.key === requestKey ? state.value : null;

  useEffect(() => {
    if (!user || workspaceLoading) return;
    if (!isUuid(opportunityId)) return;
    let active = true;
    const membersPromise = workspace.type === "organization"
      ? fetchOrganizationMembers(workspace.organizationId)
      : Promise.resolve([]);

    void Promise.all([
      fetchOpportunityDetail(user.id, workspace, opportunityId),
      Promise.allSettled([
        fetchOpportunityHistory(
          user.id,
          workspace,
          opportunityId,
          OPPORTUNITY_HISTORY_LIMIT
        ),
        fetchOpportunityQuotes(
          user.id,
          workspace,
          opportunityId,
          OPPORTUNITY_QUOTES_LIMIT
        ),
        membersPromise,
      ]),
    ]).then(([detail, secondary]) => {
      if (!active) return;
      if (!detail) {
        setState({ key: requestKey, value: "not-found" });
        return;
      }
      const [historyResult, quotesResult, membersResult] = secondary;
      const memberLabels = new Map<string, string>();
      if (membersResult.status === "fulfilled") {
        for (const member of membersResult.value) {
          memberLabels.set(member.userId, getOrganizationMemberLabel(member));
        }
      }
      if (workspace.type === "personal") {
        memberLabels.set(
          user.id,
          user.user_metadata?.full_name?.trim() || user.email || "You"
        );
      }
      setReady({
        key: requestKey,
        detail,
        history: historyResult.status === "fulfilled"
          ? { status: "ready", value: historyResult.value }
          : { status: "error", message: "Status history is unavailable." },
        quotes: quotesResult.status === "fulfilled"
          ? { status: "ready", value: quotesResult.value }
          : { status: "error", message: "Linked quotes are unavailable." },
        memberLabels,
      });
      setState(null);
    }).catch(() => {
      if (active) setState({ key: requestKey, value: "error" });
    });
    return () => {
      active = false;
    };
  }, [opportunityId, requestKey, user, workspace, workspaceLoading]);

  if (workspaceLoading || (!current && !currentState)) {
    return <DetailLoading />;
  }
  if (currentState === "not-found") {
    return (
      <OpportunityDetailPageState
        title="Opportunity not found"
        detail="This opportunity is unavailable in the active workspace."
      />
    );
  }
  if (currentState === "error") {
    return (
      <OpportunityDetailPageState
        title="Opportunity couldn’t be loaded"
        detail="Try returning to Opportunities and opening it again."
      />
    );
  }
  if (!current) return <DetailLoading />;

  const assignmentLabel = current.detail.assignedUserId
    ? current.memberLabels.get(current.detail.assignedUserId) || "Assigned team member"
    : "Unassigned";
  return (
    <div className="space-y-6 pb-10">
      <OpportunityHeader detail={current.detail} />
      <main className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
        <div className="space-y-6">
          <OpportunityRequestCard detail={current.detail} />
          <LinkedQuotesSection result={current.quotes} />
        </div>
        <div className="space-y-6">
          <CustomerContextCard detail={current.detail} />
          <PropertyContextCard detail={current.detail} />
          <AssignmentContextCard assignmentLabel={assignmentLabel} />
          <OpportunityTimeline
            result={current.history}
            createdAt={current.detail.createdAt}
            memberLabels={current.memberLabels}
          />
        </div>
      </main>
    </div>
  );
}

export function OpportunityHeader({ detail }: { detail: OpportunityDetail }) {
  return (
    <header className="border-b border-slate-200 pb-6">
      <Link
        href="/opportunities"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 outline-none hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        ← Back to Opportunities
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {detail.title}
          </h1>
          <p className="mt-2 text-base text-slate-600">{detail.serviceType}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Badge>Source: {OPPORTUNITY_ORIGIN_LABELS[detail.origin]}</Badge>
            <Badge className={OPPORTUNITY_STATUS_STYLES[detail.status]}>
              Status: {OPPORTUNITY_STATUS_LABELS[detail.status]}
            </Badge>
          </div>
          <Link
            href={`/quote?opportunityId=${encodeURIComponent(detail.id)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Create Quote
          </Link>
        </div>
      </div>
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <Metadata term="Created" detail={formatOpportunityDate(detail.createdAt)} />
        <Metadata term="Updated" detail={formatOpportunityDate(detail.updatedAt)} />
      </dl>
    </header>
  );
}

export function OpportunityRequestCard({ detail }: { detail: OpportunityDetail }) {
  const budget = formatMarketplaceBudget(detail.marketplaceContext?.budgetRange ?? null);
  return (
    <ContextCard title="Request overview">
      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {detail.description || "Request description unavailable."}
      </p>
      {detail.origin === "marketplace" && detail.marketplaceContext ? (
        <section className="mt-6 border-t border-slate-100 pt-5" aria-labelledby="marketplace-context">
          <h3 id="marketplace-context" className="font-semibold text-slate-900">
            Marketplace request context
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.marketplaceContext.requestTitle ? (
              <Metadata
                term="Homeowner-provided request title"
                detail={detail.marketplaceContext.requestTitle}
              />
            ) : null}
            {detail.marketplaceContext.preferredTiming ? (
              <Metadata
                term="Homeowner-provided preferred timing"
                detail={detail.marketplaceContext.preferredTiming}
              />
            ) : null}
            {budget ? (
              <Metadata term="Homeowner-provided budget range" detail={budget} />
            ) : null}
            {detail.marketplaceContext.serviceCategory ? (
              <Metadata
                term="Marketplace service category"
                detail={`${detail.marketplaceContext.serviceCategory.displayName} (${detail.marketplaceContext.serviceCategory.code})`}
              />
            ) : null}
            {detail.marketplaceContext.assignedAt ? (
              <Metadata
                term="Marketplace assigned"
                detail={formatOpportunityDateTime(detail.marketplaceContext.assignedAt)}
              />
            ) : null}
          </dl>
          {detail.marketplaceContext.requestDescription ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Homeowner-provided request details
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {detail.marketplaceContext.requestDescription}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </ContextCard>
  );
}

export function CustomerContextCard({ detail }: { detail: OpportunityDetail }) {
  const customer = detail.customer;
  return (
    <ContextCard title="Customer">
      {customer ? (
        <dl className="space-y-4">
          <Metadata term="Name" detail={customer.displayName || "Customer details unavailable"} />
          <Contact term="Email" value={customer.email} kind="email" />
          <Contact term="Phone" value={customer.phone} kind="phone" />
          <Metadata
            term="Preferred contact"
            detail={customer.preferredContactMethod
              ? customer.preferredContactMethod.replace(/^./, (letter) => letter.toUpperCase())
              : "Not provided"}
          />
        </dl>
      ) : <Unavailable>Customer details unavailable.</Unavailable>}
    </ContextCard>
  );
}

export function PropertyContextCard({ detail }: { detail: OpportunityDetail }) {
  const property = detail.property;
  const address = property ? formatPropertyAddress({
    address_line1: property.addressLine1,
    address_line2: property.addressLine2,
    city: property.city,
    region: property.region,
    postal_code: property.postalCode,
    country_code: property.countryCode,
  }) : "Property details unavailable";
  return (
    <ContextCard title="Property">
      <p className="break-words text-sm font-medium leading-6 text-slate-700">{address}</p>
    </ContextCard>
  );
}

export function AssignmentContextCard({
  assignmentLabel,
}: {
  assignmentLabel: string;
}) {
  return (
    <ContextCard title="Assignment">
      <Metadata term="Assigned to" detail={assignmentLabel} />
    </ContextCard>
  );
}

export function LinkedQuotesSection({
  result,
}: {
  result: SecondaryResult<OpportunityLinkedQuote[]>;
}) {
  return (
    <ContextCard title="Linked quotes">
      {result.status === "error" ? <Unavailable>{result.message}</Unavailable>
      : result.value.length === 0 ? (
        <Unavailable>No quotes created for this opportunity yet.</Unavailable>
      ) : (
        <ul className="divide-y divide-slate-100">
          {result.value.map((quote) => {
            const style = QUOTE_STATUS_STYLES[quote.status];
            return (
              <li key={quote.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/quote?quoteId=${encodeURIComponent(quote.id)}`}
                  className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{quote.title}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{quote.reference}</p>
                    </div>
                    <Badge className={`${style.bg} ${style.text} ${style.ring}`}>
                      Status: {QUOTE_STATUS_LABELS[quote.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Created {formatOpportunityDate(quote.createdAt)} · Updated {formatOpportunityDate(quote.updatedAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ContextCard>
  );
}

export function OpportunityTimeline({
  result,
  createdAt,
  memberLabels,
}: {
  result: SecondaryResult<OpportunityHistoryItem[]>;
  createdAt: string;
  memberLabels: Map<string, string>;
}) {
  return (
    <ContextCard title="Status timeline">
      {result.status === "error" ? <Unavailable>{result.message}</Unavailable>
      : (
        <ol className="space-y-5">
          {(result.value.length ? result.value : [{
            id: "created",
            fromStatus: null,
            toStatus: "new" as const,
            actorUserId: null,
            sourceSystem: "vendor_os" as const,
            reason: null,
            occurredAt: createdAt,
          }]).map((event) => (
            <li key={event.id} className="relative border-l-2 border-emerald-200 pl-4">
              <p className="text-sm font-semibold text-slate-900">
                {event.fromStatus
                  ? `${OPPORTUNITY_STATUS_LABELS[event.fromStatus]} → ${OPPORTUNITY_STATUS_LABELS[event.toStatus]}`
                  : `Created as ${OPPORTUNITY_STATUS_LABELS[event.toStatus]}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatOpportunityDateTime(event.occurredAt)} · {sourceLabel(event.sourceSystem)}
              </p>
              {event.actorUserId ? (
                <p className="mt-1 text-xs text-slate-600">
                  Actor: {memberLabels.get(event.actorUserId) || "Team member"}
                </p>
              ) : null}
              {formatReasonCode(event.reason) ? (
                <p className="mt-1 text-xs text-slate-600">
                  Reason: {formatReasonCode(event.reason)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </ContextCard>
  );
}

function sourceLabel(source: OpportunityHistoryItem["sourceSystem"]): string {
  if (source === "marketplace") return "Marketplace";
  if (source === "migration") return "Imported history";
  return "Mercurius";
}

function ContextCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metadata({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{term}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-700">{detail}</dd>
    </div>
  );
}

function Contact({ term, value, kind }: { term: string; value: string | null; kind: "email" | "phone" }) {
  const valid = value && (kind === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^[+()\d.\s-]{3,}$/.test(value));
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{term}</dt>
      <dd className="mt-1 break-all text-sm font-medium text-slate-700">
        {valid ? <a className="text-emerald-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500" href={`${kind === "email" ? "mailto" : "tel"}:${value}`}>{value}</a> : value || "Not provided"}
      </dd>
    </div>
  );
}

function Badge({ children, className = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>{children}</span>;
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-slate-500">{children}</p>;
}

function DetailLoading() {
  return (
    <div role="status" aria-label="Loading opportunity" className="space-y-6">
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function OpportunityDetailPageState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
      <Link href="/opportunities" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        Back to Opportunities
      </Link>
    </section>
  );
}
