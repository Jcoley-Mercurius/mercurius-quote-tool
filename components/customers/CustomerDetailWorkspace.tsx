"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { fetchOrganizationMembers } from "@/lib/organizations/members";
import {
  getOrganizationMemberLabel,
  workspaceKey,
} from "@/lib/organizations/types";
import {
  customerSourceLabel,
  formatCustomerDate,
} from "@/lib/customers/format";
import { fetchCustomerDetail } from "@/lib/customers/repository";
import type {
  CustomerDetail,
  CustomerTimelineItem,
} from "@/lib/customers/types";
import { isUuid } from "@/lib/opportunities/format";
import {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
} from "@/lib/opportunities/types";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
} from "@/lib/quotes/types";
import { CustomerManagementActions } from "./CustomerManagementDialogs";

export function CustomerDetailWorkspace({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [refresh, setRefresh] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const requestKey = user
    ? `${user.id}:${workspaceKey(workspace)}:${customerId}:${refresh}`
    : "signed-out";
  const [ready, setReady] = useState<{
    key: string;
    detail: CustomerDetail;
    memberLabels: Map<string, string>;
    membersAvailable: boolean;
  } | null>(null);
  const [state, setState] = useState<{
    key: string;
    value: "not-found" | "error";
  } | null>(null);
  const current = ready?.key === requestKey ? ready : null;
  const currentState = !isUuid(customerId)
    ? "not-found"
    : state?.key === requestKey ? state.value : null;

  useEffect(() => {
    if (!user || workspaceLoading || !isUuid(customerId)) return;
    let active = true;
    const membersPromise = workspace.type === "organization"
      ? fetchOrganizationMembers(workspace.organizationId)
      : Promise.resolve([]);
    void Promise.allSettled([
      fetchCustomerDetail(user.id, workspace, customerId),
      membersPromise,
    ]).then(([detailResult, membersResult]) => {
      if (!active) return;
      if (detailResult.status === "rejected") {
        setState({ key: requestKey, value: "error" });
        return;
      }
      if (!detailResult.value) {
        setState({ key: requestKey, value: "not-found" });
        return;
      }
      const labels = new Map<string, string>();
      if (membersResult.status === "fulfilled") {
        for (const member of membersResult.value) {
          labels.set(member.userId, getOrganizationMemberLabel(member));
        }
      }
      setReady({
        key: requestKey,
        detail: detailResult.value,
        memberLabels: labels,
        membersAvailable: membersResult.status === "fulfilled",
      });
      setState(null);
      window.requestAnimationFrame(() => headingRef.current?.focus());
    });
    return () => {
      active = false;
    };
  }, [customerId, requestKey, user, workspace, workspaceLoading]);

  if (workspaceLoading || (!current && !currentState)) {
    return <DetailLoading />;
  }
  if (currentState === "not-found") {
    return <DetailPageState
      title="Customer not found"
      detail="This customer is unavailable in the active workspace."
    />;
  }
  if (currentState === "error") {
    return <DetailPageState
      title="Customer couldn’t be loaded"
      detail="Try returning to Customers and opening the record again."
    />;
  }
  if (!current) return <DetailLoading />;

  return (
    <div className="space-y-6 pb-10">
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <header className="border-b border-slate-200 pb-6">
        <Link href="/customers" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          ← Back to Customers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">Customer</p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 break-words text-3xl font-semibold tracking-tight text-slate-950 outline-none sm:text-4xl"
            >
              {current.detail.displayName}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SourceBadge source={current.detail.source} />
            <CustomerManagementActions
              detail={current.detail}
              user={user!}
              workspace={workspace}
              onChanged={(message) => {
                if (message) setAnnouncement(message);
                setRefresh((value) => value + 1);
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Customer since {formatCustomerDate(current.detail.customerSince)}
        </p>
        {current.detail.archivedAt ? (
          <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Archived {formatCustomerDate(current.detail.archivedAt)}</p>
            {current.detail.archiveReason ? <p className="mt-1">Reason: {current.detail.archiveReason}</p> : null}
            <p className="mt-1">Linked records and history remain available.</p>
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Overview">
          <dl className="space-y-4 text-sm">
            <DetailFact label="Email" value={current.detail.email || "Unavailable"} breakAll />
            <DetailFact label="Company" value={current.detail.companyName || "Not specified"} />
            <DetailFact label="Phone" value={current.detail.phone || "Unavailable"} />
            <DetailFact
              label="Preferred contact"
              value={current.detail.preferredContactMethod
                ? current.detail.preferredContactMethod.replace(/^./, (value) => value.toUpperCase())
                : "Not specified"}
            />
            <DetailFact label="Latest record update" value={formatCustomerDate(current.detail.updatedAt)} />
            <DetailFact label="Customer health" value={current.detail.health.label} />
            <DetailFact label="Health signals" value={current.detail.health.detail} />
            <DetailFact label="Summary" value={current.detail.summary || "Not specified"} />
            <DetailFact label="Tags" value={current.detail.tags.join(", ") || "None"} />
          </dl>
        </Section>
        <Section title="Properties">
          <SecondaryState result={current.detail.properties} unavailable="Properties are temporarily unavailable.">
            {(properties) => properties.length ? (
              <ul className="space-y-3">
                {properties.map((property) => (
                  <li key={property.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                    <Link
                      href={`/properties/${encodeURIComponent(property.id)}`}
                      className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {property.address}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <SourceBadge source={property.source} />
                      {property.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Updated {formatCustomerDate(property.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : <EmptyText>No linked properties.</EmptyText>}
          </SecondaryState>
        </Section>
      </div>

      <Section title="Opportunities">
        <SecondaryState result={current.detail.opportunities} unavailable="Opportunities are temporarily unavailable.">
          {(opportunities) => opportunities.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {opportunities.map((opportunity) => {
                const label = opportunity.assignedUserId
                  ? current.memberLabels.get(opportunity.assignedUserId) ||
                    (current.membersAvailable ? "Former team member" : "Assigned team member")
                  : "Unassigned";
                return (
                  <li key={opportunity.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/opportunities/${encodeURIComponent(opportunity.id)}`} className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-emerald-700">
                        {opportunity.title}
                      </Link>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${OPPORTUNITY_STATUS_STYLES[opportunity.status]}`}>
                        {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                      </span>
                    </div>
                    <p className="break-words text-sm text-slate-600">
                      Source: {OPPORTUNITY_ORIGIN_LABELS[opportunity.origin]}
                      {workspace.type === "organization" ? ` · Assignment: ${label}` : ""}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {opportunity.propertyLabel || "No linked property"} · Updated {formatCustomerDate(opportunity.updatedAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyText>No linked opportunities.</EmptyText>}
        </SecondaryState>
      </Section>

      <Section title="Linked quotes">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Quotes shown here are connected through this customer’s linked opportunities and may not include every historical quote.
        </p>
        <SecondaryState result={current.detail.quotes} unavailable="Linked quotes are temporarily unavailable.">
          {(quotes) => quotes.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {quotes.map((quote) => {
                const styles = QUOTE_STATUS_STYLES[quote.status];
                return (
                  <li key={quote.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/quote?quoteId=${encodeURIComponent(quote.id)}`} className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-emerald-700">
                        {quote.reference} · {quote.title}
                      </Link>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles.bg} ${styles.text} ${styles.ring}`}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Created {formatCustomerDate(quote.createdAt)}
                      {quote.sharedAt ? ` · Shared ${formatCustomerDate(quote.sharedAt)}` : ""}
                      {quote.viewed ? " · Viewed" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyText>No opportunity-connected quotes.</EmptyText>}
        </SecondaryState>
      </Section>

      <Section title="Customer timeline">
        {current.detail.timeline.status === "error" ? (
          <Unavailable>Timeline is temporarily unavailable.</Unavailable>
        ) : (
          <>
            {!current.detail.timeline.complete ? (
              <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Some timeline events are temporarily unavailable.
              </div>
            ) : null}
            <CustomerTimeline
              items={current.detail.timeline.value}
              memberLabels={current.memberLabels}
              membersAvailable={current.membersAvailable}
            />
          </>
        )}
      </Section>
    </div>
  );
}

export function CustomerTimeline({
  items,
  memberLabels,
  membersAvailable,
}: {
  items: CustomerTimelineItem[];
  memberLabels: Map<string, string>;
  membersAvailable: boolean;
}) {
  if (!items.length) return <EmptyText>No customer activity yet.</EmptyText>;
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="relative min-w-0 border-l-2 border-slate-200 pl-5">
          <span className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
          <h3 className="break-words text-sm font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-1 break-words text-xs text-slate-600">{item.detail}</p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {formatCustomerDate(item.occurredAt)}
            {item.actorUserId
              ? ` · Actor: ${memberLabels.get(item.actorUserId) ||
                (membersAvailable ? "Former team member" : "Unknown team member")}`
              : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>;
}

function SecondaryState<T>({
  result,
  unavailable,
  children,
}: {
  result: { status: "ready"; value: T[] } | { status: "error" };
  unavailable: string;
  children: (value: T[]) => React.ReactNode;
}) {
  return result.status === "ready"
    ? children(result.value)
    : <Unavailable>{unavailable}</Unavailable>;
}

function SourceBadge({ source }: { source: "marketplace" | "direct" }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
    Source: {customerSourceLabel(source)}
  </span>;
}

function DetailFact({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return <div>
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className={`mt-1 text-slate-900 ${breakAll ? "break-all" : "break-words"}`}>{value}</dd>
  </div>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{children}</p>;
}

function DetailLoading() {
  return <div role="status" aria-label="Loading customer" className="space-y-4">
    <div className="h-32 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
    <div className="h-64 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
  </div>;
}

function DetailPageState({ title, detail }: { title: string; detail: string }) {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
    <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
    <p className="mt-3 text-slate-600">{detail}</p>
    <Link href="/customers" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
      Back to Customers
    </Link>
  </section>;
}
