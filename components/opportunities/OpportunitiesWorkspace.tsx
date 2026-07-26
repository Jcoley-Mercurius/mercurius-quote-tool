"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import {
  fetchOrganizationMembers,
} from "@/lib/organizations/members";
import { getOrganizationMemberLabel } from "@/lib/organizations/types";
import {
  clampPage,
  opportunityFiltersForWorkspace,
  parseOpportunityFilters,
} from "@/lib/opportunities/format";
import { fetchOpportunityPage } from "@/lib/opportunities/repository";
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  type OpportunityListFilters,
  type OpportunityPage,
} from "@/lib/opportunities/types";
import { OpportunityFilters } from "./OpportunityFilters";
import { OpportunityList } from "./OpportunityList";

interface ReadyState {
  key: string;
  page: OpportunityPage;
  assignmentLabels: Map<string, string>;
}

export function OpportunitiesWorkspace() {
  const { user } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = useMemo(
    () => parseOpportunityFilters({
        status: searchParams.get("status"),
        origin: searchParams.get("origin"),
        assignment: searchParams.get("assignment"),
      }),
    [searchParams]
  );
  const filters = useMemo(
    () => opportunityFiltersForWorkspace(parsedFilters, workspace),
    [parsedFilters, workspace]
  );
  const requestedPage = clampPage(searchParams.get("page"));
  const [retryVersion, setRetryVersion] = useState(0);
  const workspaceKey =
    workspace.type === "organization"
      ? `org:${workspace.organizationId}`
      : "personal";
  const requestKey = user
    ? `${user.id}:${workspaceKey}:${filters.status}:${filters.origin}:${filters.assignment}:${requestedPage}:${retryVersion}`
    : "signed-out";
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const current = ready?.key === requestKey ? ready : null;
  const currentError = error?.key === requestKey ? error.message : null;
  const loading = !workspaceLoading && Boolean(user) && !current && !currentError;

  useEffect(() => {
    if (!user || workspaceLoading) return;
    let active = true;
    const pagePromise = fetchOpportunityPage(
      user.id,
      workspace,
      filters,
      requestedPage
    );
    const membersPromise =
      workspace.type === "organization"
        ? fetchOrganizationMembers(workspace.organizationId)
        : Promise.resolve([]);

    void Promise.all([pagePromise, membersPromise])
      .then(([page, members]) => {
        if (!active) return;
        const assignmentLabels = new Map(
          members.map((member) => [
            member.userId,
            getOrganizationMemberLabel(member),
          ])
        );
        if (workspace.type === "personal") {
          const personalLabel =
            user.user_metadata?.full_name?.trim() || user.email || "You";
          assignmentLabels.set(user.id, personalLabel);
        }
        setReady({ key: requestKey, page, assignmentLabels });
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError({
          key: requestKey,
          message: "Opportunities could not be loaded. Try again in a moment.",
        });
      });
    return () => {
      active = false;
    };
  }, [
    filters,
    requestKey,
    requestedPage,
    user,
    workspace,
    workspaceLoading,
  ]);

  function navigate(nextFilters: OpportunityListFilters, page = 1) {
    const params = new URLSearchParams();
    if (nextFilters.status !== DEFAULT_OPPORTUNITY_FILTERS.status) {
      params.set("status", nextFilters.status);
    }
    if (nextFilters.origin !== DEFAULT_OPPORTUNITY_FILTERS.origin) {
      params.set("origin", nextFilters.origin);
    }
    if (nextFilters.assignment !== DEFAULT_OPPORTUNITY_FILTERS.assignment) {
      params.set("assignment", nextFilters.assignment);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Pipeline</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Opportunities
            </h1>
          </div>
          {current ? (
            <p className="text-sm font-medium text-slate-500" aria-live="polite">
              {current.page.totalCount} matching{" "}
              {current.page.totalCount === 1 ? "opportunity" : "opportunities"}
            </p>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          Review incoming service requests and move the right work forward.
        </p>
      </header>

      <OpportunityFilters
        filters={filters}
        showAssignment={workspace.type === "organization"}
        onChange={(next) => navigate(next, 1)}
      />

      <OpportunityListState
        loading={loading || workspaceLoading}
        error={currentError}
        result={current?.page ?? null}
        assignmentLabels={current?.assignmentLabels ?? new Map()}
        onReset={() => navigate(DEFAULT_OPPORTUNITY_FILTERS, 1)}
        onRetry={() => setRetryVersion((value) => value + 1)}
      />

      {current && current.page.totalCount > 0 ? (
        <OpportunityPagination
          result={current.page}
          onPage={(page) => navigate(filters, page)}
        />
      ) : null}
    </div>
  );
}

export function OpportunityListState({
  loading,
  error,
  result,
  assignmentLabels,
  onReset,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  result: OpportunityPage | null;
  assignmentLabels: Map<string, string>;
  onReset: () => void;
  onRetry: () => void;
}) {
  if (loading) return <OpportunityListSkeleton />;
  if (error) {
    return (
      <StateCard title="Opportunities couldn’t be loaded" detail={error} tone="error">
        <StateButton onClick={onRetry}>Try again</StateButton>
      </StateCard>
    );
  }
  if (!result) return <OpportunityListSkeleton />;
  if (result.items.length === 0 && result.workspaceTotalCount === 0) {
    return (
      <StateCard
        title="No opportunities yet"
        detail="New Marketplace assignments and manually created opportunities will appear here."
      />
    );
  }
  if (result.items.length === 0) {
    return (
      <StateCard
        title="No opportunities match these filters"
        detail="Adjust or reset the filters to see other opportunities in this workspace."
      >
        <StateButton onClick={onReset}>Reset filters</StateButton>
      </StateCard>
    );
  }
  return (
    <OpportunityList items={result.items} assignmentLabels={assignmentLabels} />
  );
}

export function OpportunityPagination({
  result,
  onPage,
}: {
  result: OpportunityPage;
  onPage: (page: number) => void;
}) {
  const start = (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.page * result.pageSize, result.totalCount);
  const hasNext = end < result.totalCount;
  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"
      aria-label="Opportunity pages"
    >
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {result.totalCount}
      </p>
      <div className="flex gap-2">
        <PaginationButton
          disabled={result.page === 1}
          onClick={() => onPage(result.page - 1)}
        >
          Previous
        </PaginationButton>
        <PaginationButton
          disabled={!hasNext}
          onClick={() => onPage(result.page + 1)}
        >
          Next
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function OpportunityListSkeleton() {
  return (
    <div role="status" aria-label="Loading opportunities" className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 motion-reduce:animate-none sm:h-36"
        />
      ))}
    </div>
  );
}

function StateCard({
  title,
  detail,
  tone = "neutral",
  children,
}: {
  title: string;
  detail: string;
  tone?: "neutral" | "error";
  children?: React.ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-2xl border px-6 py-12 text-center",
        tone === "error"
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <h2 className={tone === "error" ? "font-semibold text-red-800" : "font-semibold text-slate-900"}>
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {detail}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function StateButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
