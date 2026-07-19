"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import { fetchPendingRepairRequests } from "@/lib/repair/api";
import {
  REPAIR_URGENCY_LABELS,
  type RepairRequestLead,
  type RepairUrgency,
} from "@/lib/repair/types";
import { formatShortDate } from "@/lib/quotes/helpers";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const URGENCY_STYLES: Record<RepairUrgency, string> = {
  emergency: "bg-red-50 text-red-700 ring-red-200",
  urgent: "bg-amber-50 text-amber-800 ring-amber-200",
  soon: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  flexible: "bg-slate-100 text-slate-600 ring-slate-200",
};

function serviceLabel(serviceType: string): string {
  return (
    SERVICE_OPTIONS.find((option) => option.id === serviceType)?.label ??
    serviceType
  );
}

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function IncomingRepairRequests() {
  const [requests, setRequests] = useState<RepairRequestLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const pending = await fetchPendingRepairRequests();
        if (cancelled) return;
        setRequests(pending);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load incoming repair requests."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const pending = await fetchPendingRepairRequests();
      setRequests(pending);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load incoming repair requests."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <section
      aria-labelledby="incoming-repair-requests-title"
      className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="incoming-repair-requests-title"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              New Repair Requests
            </h2>
            {!isLoading && requests.length > 0 && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {requests.length} pending
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Warm leads from homeowners — review the job and send a quote.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? (
            <>
              <LoadingSpinner size="sm" />
              Refreshing…
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-white/70 px-4 py-8 text-sm text-slate-500">
            <LoadingSpinner size="sm" />
            Loading incoming requests…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <p className="font-medium">Could not load repair requests</p>
            <p className="mt-1 text-amber-800/90">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Try again
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No pending repair requests
            </p>
            <p className="mt-1 text-xs text-slate-500">
              New homeowner submissions will show up here automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id}>
                <RepairRequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RepairRequestCard({ request }: { request: RepairRequestLead }) {
  const urgencyClass = URGENCY_STYLES[request.urgency];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {serviceLabel(request.serviceType)}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                urgencyClass,
              ].join(" ")}
            >
              {REPAIR_URGENCY_LABELS[request.urgency]}
            </span>
            <span className="text-xs text-slate-400">
              {formatShortDate(request.createdAt)}
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {request.name}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {truncate(request.description)}
          </p>

          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <div>
              <dt className="sr-only">Location</dt>
              <dd>
                {request.location
                  ? `${request.location} · ${request.zip}`
                  : request.zip}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd>
                <a
                  href={`mailto:${request.email}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {request.email}
                </a>
              </dd>
            </div>
            {request.phone ? (
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>
                  <a
                    href={`tel:${request.phone}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {request.phone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <Link
          href={`/quote?repairRequestId=${request.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Create quote
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.06-1.06l5.5 5.25a.75.75 0 010 1.06l-5.5 5.25a.75.75 0 11-1.06-1.06l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
}
