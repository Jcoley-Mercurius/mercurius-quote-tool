"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { fetchOrganizationMembers } from "@/lib/organizations/members";
import { getOrganizationMemberLabel, workspaceKey } from "@/lib/organizations/types";
import { formatCustomerDate, customerSourceLabel } from "@/lib/customers/format";
import { isUuid } from "@/lib/opportunities/format";
import { OPPORTUNITY_ORIGIN_LABELS, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES } from "@/lib/opportunities/types";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_STYLES } from "@/lib/quotes/types";
import { fetchPropertyDetail } from "@/lib/properties/repository";
import type { PropertyDetail } from "@/lib/properties/types";
import { PropertyEditDialog } from "./PropertyEditDialog";
import { CrmEntitySections } from "@/components/crm/CrmEntitySections";

export function PropertyDetailWorkspace({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const { workspace, isLoading } = useWorkspace();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const key = user ? `${user.id}:${workspaceKey(workspace)}:${propertyId}:${refresh}` : "signed-out";
  const [ready, setReady] = useState<{ key: string; detail: PropertyDetail; members: Map<string, string>; membersAvailable: boolean } | null>(null);
  const [state, setState] = useState<{ key: string; value: "not-found" | "error" } | null>(null);
  const current = ready?.key === key ? ready : null;
  const currentState = !isUuid(propertyId) ? "not-found" : state?.key === key ? state.value : null;
  useEffect(() => {
    if (!user || isLoading || !isUuid(propertyId)) return;
    let active = true;
    const members = workspace.type === "organization" ? fetchOrganizationMembers(workspace.organizationId) : Promise.resolve([]);
    void Promise.allSettled([fetchPropertyDetail(user.id, workspace, propertyId), members]).then(([detail, memberResult]) => {
      if (!active) return;
      if (detail.status === "rejected") return setState({ key, value: "error" });
      if (!detail.value) return setState({ key, value: "not-found" });
      const labels = new Map<string, string>();
      if (memberResult.status === "fulfilled") for (const member of memberResult.value) labels.set(member.userId, getOrganizationMemberLabel(member));
      setReady({ key, detail: detail.value, members: labels, membersAvailable: memberResult.status === "fulfilled" });
      setState(null);
      window.requestAnimationFrame(() => headingRef.current?.focus());
    });
    return () => { active = false; };
  }, [isLoading, key, propertyId, user, workspace]);
  if (isLoading || (!current && !currentState)) return <PageState title="Loading property…" />;
  if (currentState === "not-found") return <PageState title="Property not found" detail="This property is unavailable in the active workspace." />;
  if (currentState === "error") return <PageState title="Property couldn’t be loaded" detail="Return to the linked customer or opportunity and try again." />;
  if (!current) return <PageState title="Loading property…" />;
  const d = current.detail;
  const crmMemberLabels = new Map(current.members);
  if (workspace.type === "personal" && user) {
    crmMemberLabels.set(user.id, user.user_metadata?.full_name?.trim() || user.email || "You");
  }
  return <div className="space-y-6 pb-10">
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <header className="border-b border-slate-200 pb-6">
      <Link href="/properties" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700">← Back to Properties</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-sm font-semibold text-emerald-700">Property</p><h1 ref={headingRef} tabIndex={-1} className="mt-1 break-words text-3xl font-semibold text-slate-950 outline-none sm:text-4xl">{d.address.formatted}</h1></div>
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500">Edit property</button>
      </div>
      <p className="mt-3 text-sm text-slate-500">Recorded in Mercurius since {formatCustomerDate(d.recordedSince)} · Source: {customerSourceLabel(d.source)}</p>
      {d.source === "marketplace" ? <p className="mt-2 text-sm text-slate-600">Operational information in Vendor OS. Original Marketplace source data remains preserved.</p> : null}
    </header>
    {!d.indicators.complete ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Some relationship history is temporarily unavailable; displayed counts may be incomplete.</div> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Property overview"><dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Fact label="Active opportunities" value={d.indicators.activeOpportunities?.toString() ?? "Unavailable"} />
        <Fact label="Linked quotes" value={d.indicators.linkedQuotes?.toString() ?? "Unavailable"} />
        <Fact label="Accepted linked quotes" value={d.indicators.acceptedLinkedQuotes?.toString() ?? "Unavailable"} />
        <Fact label="Latest recorded activity" value={formatCustomerDate(d.indicators.latestActivityAt)} />
        <Fact label="Operational summary" value={d.summary || "Not specified"} />
        <Fact label="Tags" value={d.tags.join(", ") || "None"} />
      </dl></Section>
      <Section title="Associated customer">{d.customer.status === "error" ? <Unavailable /> : d.customer.value ? <div><Link href={`/customers/${d.customer.value.id}`} className="inline-flex min-h-11 items-center break-words font-semibold text-emerald-700">{d.customer.value.displayName}</Link>{d.customer.value.companyName ? <p className="text-sm text-slate-600">{d.customer.value.companyName}</p> : null}<p className="text-xs text-slate-500">Primary operational customer{d.customer.value.archived ? " · Archived" : ""}</p></div> : <p className="text-sm text-slate-600">No associated customer.</p>}</Section>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Property attributes">{Object.keys(d.attributes).length ? <dl className="grid gap-4 text-sm sm:grid-cols-2">{Object.entries(d.attributes).map(([label, value]) => <Fact key={label} label={label} value={value} />)}</dl> : <p className="text-sm text-slate-600">No supported structured attributes recorded.</p>}</Section>
      <Section title="Private access instructions"><details className="rounded-xl border border-amber-200 bg-amber-50 p-4"><summary className="min-h-11 cursor-pointer font-semibold text-amber-950">Reveal sensitive operational information</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm text-amber-950">{d.accessInstructions || "No private access instructions recorded."}</p></details></Section>
    </div>
    <Section title="Linked opportunities">{d.opportunities.status === "error" ? <Unavailable /> : d.opportunities.value.length ? <ul className="grid gap-3 lg:grid-cols-2">{d.opportunities.value.map((o) => <li key={o.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><Link href={`/opportunities/${o.id}`} className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-emerald-700">{o.title}</Link><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${OPPORTUNITY_STATUS_STYLES[o.status]}`}>{OPPORTUNITY_STATUS_LABELS[o.status]}</span></div><p className="text-sm text-slate-600">{OPPORTUNITY_ORIGIN_LABELS[o.origin]}{workspace.type === "organization" ? ` · ${o.assignedUserId ? current.members.get(o.assignedUserId) || (current.membersAvailable ? "Former team member" : "Assigned team member") : "Unassigned"}` : ""}</p><p className="text-xs text-slate-500">Updated {formatCustomerDate(o.updatedAt)}</p></li>)}</ul> : <p className="text-sm text-slate-600">No linked opportunities.</p>}</Section>
    <Section title="Linked quotes"><p className="mb-4 text-sm text-slate-600">Quotes connected through property opportunities only. These are not completed work or collected revenue.</p>{d.quotes.status === "error" ? <Unavailable /> : d.quotes.value.length ? <ul className="grid gap-3 lg:grid-cols-2">{d.quotes.value.map((q) => { const s = QUOTE_STATUS_STYLES[q.status]; return <li key={q.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><Link href={`/quote?quoteId=${q.id}`} className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-emerald-700">{q.reference} · {q.title}</Link><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>{QUOTE_STATUS_LABELS[q.status]}</span></div><p className="text-xs text-slate-500">Created {formatCustomerDate(q.createdAt)}{q.sharedAt ? " · Shared" : ""}{q.viewed ? " · Viewed" : ""}{q.accepted ? " · Accepted" : ""}</p></li>; })}</ul> : <p className="text-sm text-slate-600">No opportunity-connected quotes.</p>}</Section>
    <CrmEntitySections target={{ type: "property", id: d.id }} memberLabels={crmMemberLabels} onTimelineChanged={() => setRefresh((value) => value + 1)} />
    <Section title="Recorded property history">{d.timeline.status === "error" ? <Unavailable /> : <><ol className="space-y-4">{d.timeline.value.map((item) => <li key={item.id} className="border-l-2 border-slate-200 pl-5"><h3 className="break-words text-sm font-semibold text-slate-900">{item.title}</h3><p className="break-words text-xs text-slate-600">{item.detail}</p><p className="text-xs text-slate-500">{formatCustomerDate(item.occurredAt)}{item.actorUserId ? ` · Actor: ${current.members.get(item.actorUserId) || (current.membersAvailable ? "Former team member" : "Unknown team member")}` : ""}</p></li>)}</ol>{!d.timeline.complete ? <p role="status" className="mt-4 text-sm text-amber-800">Some recorded activity is temporarily unavailable.</p> : null}</>}</Section>
    {editing ? <PropertyEditDialog detail={d} onClose={() => setEditing(false)} onChanged={(message) => { if (message) setAnnouncement(message); setRefresh((value) => value + 1); }} /> : null}
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold text-slate-950">{title}</h2>{children}</section>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{value}</dd></div>; }
function Unavailable() { return <p role="status" className="text-sm text-amber-800">This information is temporarily unavailable.</p>; }
function PageState({ title, detail }: { title: string; detail?: string }) { return <section className="mx-auto max-w-xl py-16 text-center"><h1 className="text-2xl font-semibold text-slate-950">{title}</h1>{detail ? <p className="mt-2 text-slate-600">{detail}</p> : null}</section>; }
