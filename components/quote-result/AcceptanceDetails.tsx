"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export interface QuoteAcceptanceData {
  id: string;
  quoteId: string;
  signerName: string;
  signatureData: string;
  ipAddress: string | null;
  acceptedAt: string;
}

interface AcceptanceDetailsProps {
  quoteId: string;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "none" }
  | { phase: "loaded"; acceptance: QuoteAcceptanceData }
  | { phase: "error" };

export function AcceptanceDetails({ quoteId }: AcceptanceDetailsProps) {
  const { session } = useAuth();
  const [state, setLoadState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchAcceptance = async () => {
      try {
        const response = await fetch("/api/quotes/" + quoteId + "/acceptance", {
          headers: { Authorization: "Bearer " + session.access_token },
        });

        if (!response.ok) {
          setLoadState({ phase: "error" });
          return;
        }

        const data = (await response.json()) as {
          acceptance: QuoteAcceptanceData | null;
        };

        if (!data.acceptance) {
          setLoadState({ phase: "none" });
          return;
        }

        setLoadState({ phase: "loaded", acceptance: data.acceptance });
      } catch {
        setLoadState({ phase: "error" });
      }
    };

    void fetchAcceptance();
  }, [quoteId, session?.access_token]);

  if (state.phase === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-mercurius-300 border-t-mercurius-600" />
          <span className="text-sm text-slate-500">Loading acceptance details...</span>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Could not load acceptance details. Try refreshing the page.
        </p>
      </div>
    );
  }

  if (state.phase === "none") {
    return null;
  }

  const { acceptance } = state;
  const acceptedDate = new Date(acceptance.acceptedAt);

  return (
    <section className="rounded-2xl border border-mercurius-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mercurius-100">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-mercurius-600">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Quote accepted</h2>
          <p className="text-xs text-slate-500">
            Signed by homeowner
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Signed by
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {acceptance.signerName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Accepted on
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {acceptedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-slate-400">
              {acceptedDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </p>
          </div>
          {acceptance.ipAddress && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                IP address
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {acceptance.ipAddress}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-500">
              The homeowner confirmed they reviewed the scope, pricing, and terms
              of this quote before signing.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Signature
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={acceptance.signatureData}
              alt={"Signature of " + acceptance.signerName}
              className="h-24 w-full object-contain"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Digitally drawn by {acceptance.signerName}
          </p>
        </div>
      </div>
    </section>
  );
}
