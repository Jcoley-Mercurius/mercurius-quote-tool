"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export interface ChangeRequestData {
  id: string;
  quoteId: string;
  message: string;
  requesterName: string | null;
  requesterPhone: string | null;
  ipAddress: string | null;
  submittedAt: string;
}

interface ChangeRequestsBannerProps {
  quoteId: string;
  /** Called when the contractor clicks "Revise & Re-Send" */
  onReviseAndResend?: () => void;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "none" }
  | { phase: "loaded"; requests: ChangeRequestData[] }
  | { phase: "error" };

export function ChangeRequestsBanner({ quoteId, onReviseAndResend }: ChangeRequestsBannerProps) {
  const { session } = useAuth();
  const [state, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchRequests = async () => {
      try {
        const response = await fetch(
          "/api/quotes/" + quoteId + "/change-requests",
          {
            headers: { Authorization: "Bearer " + session.access_token },
          }
        );

        if (!response.ok) {
          setLoadState({ phase: "error" });
          return;
        }

        const data = (await response.json()) as {
          changeRequests: ChangeRequestData[];
        };

        if (!data.changeRequests || data.changeRequests.length === 0) {
          setLoadState({ phase: "none" });
          return;
        }

        setLoadState({ phase: "loaded", requests: data.changeRequests });
      } catch {
        setLoadState({ phase: "error" });
      }
    };

    void fetchRequests();
  }, [quoteId, session?.access_token]);

  if (state.phase === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
          <span className="text-sm text-slate-500">Loading change requests...</span>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-700">
          Could not load change requests. Try refreshing the page.
        </p>
      </div>
    );
  }

  if (state.phase === "none") return null;

  const { requests } = state;
  const mostRecent = requests[0];

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-600">
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 0 1-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7ZM7 9H5v2h2V9Zm8 0h-2v2h2V9ZM9 9h2v2H9V9Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {requests.length === 1
              ? "Change request"
              : `${requests.length} change requests`}
          </h2>
          <p className="text-xs text-slate-500">
            The homeowner has requested revisions before accepting.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((req, index) => {
          const isExpanded = expanded.has(req.id);
          const isFirst = index === 0;
          const date = new Date(req.submittedAt);

          return (
            <div
              key={req.id}
              className={[
                "rounded-xl border p-4",
                isFirst
                  ? "border-amber-200 bg-amber-50/60"
                  : "border-slate-200 bg-slate-50/60",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isFirst && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Most recent
                      </span>
                    )}
                    {req.requesterName && (
                      <span className="text-sm font-semibold text-slate-800">
                        {req.requesterName}
                      </span>
                    )}
                    {req.requesterPhone && (
                      <a
                        href={"tel:" + req.requesterPhone}
                        className="text-xs font-medium text-mercurius-700 hover:underline"
                      >
                        {req.requesterPhone}
                      </a>
                    )}
                    <span className="text-xs text-slate-400">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Message — truncate if long unless expanded */}
                  <p
                    className={[
                      "mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap",
                      !isExpanded && req.message.length > 240
                        ? "line-clamp-3"
                        : "",
                    ].join(" ")}
                  >
                    {req.message}
                  </p>

                  {req.message.length > 240 && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(req.id)}
                      className="mt-1 text-xs font-medium text-slate-400 hover:text-slate-700"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mostRecent && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Next step:</span>{" "}
            Update the quote to address these changes, then send the revised
            version directly to the client.
          </p>
          {onReviseAndResend && (
            <button
              type="button"
              onClick={onReviseAndResend}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 1.449-.39 7 7 0 0 0-11.712-3.138l-.31-.31H4.99a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 0-1.5H6.8l.312.311a5.5 5.5 0 0 1 9.201 2.466.75.75 0 0 0 1.449.39Z"
                  clipRule="evenodd"
                />
              </svg>
              Revise &amp; Re-Send
            </button>
          )}
        </div>
      )}
    </section>
  );
}
