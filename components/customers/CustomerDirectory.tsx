"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import {
  customerSourceLabel,
  formatCustomerDate,
} from "@/lib/customers/format";
import { fetchCustomerDirectoryPage } from "@/lib/customers/repository";
import type {
  CustomerCursor,
  CustomerDirectoryItem,
} from "@/lib/customers/types";
import { workspaceKey } from "@/lib/organizations/types";

interface DirectoryState {
  key: string;
  items: CustomerDirectoryItem[];
  nextCursor: CustomerCursor | null;
  aggregatesComplete: boolean;
}

export function CustomerDirectory() {
  const { user } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const scopeKey = user ? `${user.id}:${workspaceKey(workspace)}` : "signed-out";
  return (
    <CustomerDirectoryScope
      key={scopeKey}
      user={user}
      workspace={workspace}
      workspaceLoading={workspaceLoading}
      scopeKey={scopeKey}
    />
  );
}

function CustomerDirectoryScope({
  user,
  workspace,
  workspaceLoading,
  scopeKey,
}: {
  user: User | null;
  workspace: ReturnType<typeof useWorkspace>["workspace"];
  workspaceLoading: boolean;
  scopeKey: string;
}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<CustomerCursor | null>(null);
  const [loadMore, setLoadMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState<DirectoryState | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);

  const requestKey = useMemo(
    () =>
      `${scopeKey}:${search}:${cursor?.updatedAt ?? "first"}:${cursor?.id ?? ""}:${retry}`,
    [cursor, retry, scopeKey, search]
  );

  useEffect(() => {
    if (!user || workspaceLoading) return;
    let active = true;
    void fetchCustomerDirectoryPage(user.id, workspace, search, cursor)
      .then((page) => {
        if (!active) return;
        setReady((previous) => ({
          key: requestKey,
          items: cursor && previous
            ? [...previous.items, ...page.items.filter((next) =>
                !previous.items.some((item) => item.id === next.id)
              )]
            : page.items,
          nextCursor: page.nextCursor,
          aggregatesComplete:
            page.aggregatesComplete &&
            (cursor ? previous?.aggregatesComplete !== false : true),
        }));
        setErrorKey(null);
      })
      .catch(() => {
        if (active) setErrorKey(requestKey);
      })
      .finally(() => {
        if (active) setLoadMore(false);
      });
    return () => {
      active = false;
    };
  }, [cursor, requestKey, search, user, workspace, workspaceLoading]);

  const current =
    ready && (ready.key === requestKey || (cursor && loadMore)) ? ready : null;
  const loading = workspaceLoading || (!current && errorKey !== requestKey);
  const error = errorKey === requestKey;

  return (
    <div className="space-y-6 pb-8">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-emerald-700">CRM</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Customers
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Find the people, properties, opportunities, and linked quotes in this workspace.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="customer-search" className="text-sm font-semibold text-slate-900">
          Search customers
        </label>
        <input
          id="customer-search"
          type="search"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setCursor(null);
            setReady(null);
          }}
          placeholder="Name, contact, or property"
          autoComplete="off"
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Search stays in this page and is not added to the URL.
        </p>
      </div>

      {current ? (
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          {current.items.length} {current.items.length === 1 ? "customer" : "customers"} shown
        </p>
      ) : null}
      {current && !current.aggregatesComplete ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Some property, opportunity, or linked quote counts are temporarily unavailable.
        </div>
      ) : null}

      <DirectoryState
        loading={loading}
        error={error}
        search={search}
        items={current?.items ?? []}
        onRetry={() => setRetry((value) => value + 1)}
      />

      {current?.nextCursor ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadMore}
            onClick={() => {
              setLoadMore(true);
              setCursor(current.nextCursor);
            }}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
          >
            {loadMore ? "Loading more…" : "Load more customers"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DirectoryState({
  loading,
  error,
  search,
  items,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  search: string;
  items: CustomerDirectoryItem[];
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading customers" className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (error) {
    return <DirectoryMessage title="Customers couldn’t be loaded" detail="Try again in a moment.">
      <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
        Try again
      </button>
    </DirectoryMessage>;
  }
  if (!items.length) {
    return (
      <DirectoryMessage
        title={search ? "No customers match this search" : "No customers yet"}
        detail={search
          ? "Try a different name, contact detail, or property."
          : "Customer records connected to this workspace will appear here."}
      />
    );
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => <CustomerCard key={item.id} item={item} />)}
    </ul>
  );
}

export function CustomerCard({ item }: { item: CustomerDirectoryItem }) {
  return (
    <li className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-slate-950">
            <Link
              href={`/customers/${encodeURIComponent(item.id)}`}
              className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {item.displayName}
            </Link>
          </h2>
          <p className="break-all text-sm text-slate-600">
            {[item.email, item.phone].filter(Boolean).join(" · ") || "Contact details unavailable"}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Source: {customerSourceLabel(item.source)}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <CardFact label="Primary property" value={item.primaryProperty || "No linked property"} />
        <CardFact label="Latest activity" value={formatCustomerDate(item.latestActivityAt)} />
        <CardFact label="Open opportunities" value={item.openOpportunityCount?.toString() ?? "Unavailable"} />
        <CardFact label="Linked quotes" value={item.linkedQuoteCount?.toString() ?? "Unavailable"} />
      </dl>
    </li>
  );
}

function CardFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-slate-800">{value}</dd>
  </div>;
}

function DirectoryMessage({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    <p className="mt-2 text-sm text-slate-600">{detail}</p>
    {children}
  </section>;
}
