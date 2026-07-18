"use client";

import { useState } from "react";
import { SignaturePad } from "./SignaturePad";

type AcceptState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "submitting" }
  | { phase: "success"; signerName: string }
  | { phase: "already_accepted" }
  | { phase: "expired" }
  | { phase: "error"; message: string };

interface AcceptQuoteSectionProps {
  token: string;
  quoteReference: string;
  businessName: string;
  /** Pass true when the quote is already accepted (status check from server) */
  alreadyAccepted?: boolean;
  /** Pass true when the quote validity has expired */
  isExpired?: boolean;
  onAccepted?: () => void;
}

export function AcceptQuoteSection({
  token,
  quoteReference,
  businessName,
  alreadyAccepted = false,
  isExpired = false,
  onAccepted,
}: AcceptQuoteSectionProps) {
  const [state, setState] = useState<AcceptState>(
    alreadyAccepted ? { phase: "already_accepted" } : { phase: "idle" }
  );
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const canSubmit =
    signerName.trim().length >= 2 && signatureData !== null && agreed;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setState({ phase: "submitting" });

    try {
      const response = await fetch(
        `/api/quotes/share/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerName: signerName.trim(),
            signatureData,
          }),
        }
      );

      const data = (await response.json()) as {
        accepted?: boolean;
        error?: string;
        message?: string;
      };

      if (response.status === 409 || data.error === "already_accepted") {
        setState({ phase: "already_accepted" });
        return;
      }

      if (response.status === 410 || data.error === "expired") {
        setState({ phase: "expired" });
        return;
      }

      if (!response.ok || !data.accepted) {
        setState({
          phase: "error",
          message:
            data.error ??
            "Something went wrong. Please try again or contact your contractor.",
        });
        return;
      }

      setState({ phase: "success", signerName: signerName.trim() });
      onAccepted?.();
    } catch {
      setState({
        phase: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  };

  // Already accepted — stable confirmation state
  if (state.phase === "already_accepted") {
    return (
      <section className="rounded-2xl border border-mercurius-200 bg-mercurius-50 p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mercurius-100">
            <CheckIcon className="h-5 w-5 text-mercurius-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-mercurius-900">
              Quote accepted
            </h3>
            <p className="mt-1 text-sm text-mercurius-800/80">
              This quote has already been accepted. Your contractor will be in touch to schedule the work.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Expired — cannot accept (server-rejected mid-flow, edge case)
  if (state.phase === "expired" || isExpired) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <ClockIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-900">
              Quote has expired
            </h3>
            <p className="mt-1 text-sm text-red-800/80">
              This quote is no longer valid. Please contact {businessName} for an updated estimate.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Success screen
  if (state.phase === "success") {
    return (
      <section className="rounded-2xl border border-mercurius-200 bg-gradient-to-b from-mercurius-50 to-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-mercurius-100">
          <CheckIcon className="h-8 w-8 text-mercurius-600" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          You&apos;re all set!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Thank you, <span className="font-semibold">{state.signerName}</span>.
          Your acceptance of quote{" "}
          <span className="font-mono font-medium">{quoteReference}</span> has
          been recorded.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{businessName}</span> has
          been notified and will reach out within 24 hours to confirm your
          project timeline. Save this page link for your records.
        </p>
        <div className="mt-6 rounded-xl border border-mercurius-100 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Acceptance recorded
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </section>
    );
  }

  // Idle — CTA button only
  if (state.phase === "idle") {
    return (
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-6 w-6 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">
              Ready to move forward?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Accept this quote and {businessName} will follow up within 24
              hours to schedule your project. No payment due now.
            </p>
            <button
              type="button"
              onClick={() => setState({ phase: "signing" })}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              Accept This Quote
            </button>
            <p className="mt-3 text-xs text-slate-400">
              You&apos;ll sign below to confirm. Takes less than a minute.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Signing / Submitting phase
  const isSubmitting = state.phase === "submitting";

  return (
    <section className="rounded-2xl border border-mercurius-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Accept this quote</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review quote{" "}
          <span className="font-mono font-medium">{quoteReference}</span> above,
          then sign below to confirm your acceptance.
        </p>
      </div>

      {state.phase === "error" && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
          <button
            type="button"
            onClick={() => setState({ phase: "signing" })}
            className="ml-2 font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Full name */}
        <div>
          <label
            htmlFor="signer-name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Your full name{" "}
            <span className="text-red-500" aria-hidden>
              *
            </span>
          </label>
          <input
            id="signer-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60 sm:max-w-sm"
          />
        </div>

        {/* Signature pad */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Signature{" "}
            <span className="text-red-500" aria-hidden>
              *
            </span>
          </p>
          <SignaturePad
            onChange={setSignatureData}
            disabled={isSubmitting}
          />
        </div>

        {/* Agreement checkbox */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={isSubmitting}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-mercurius-600 accent-mercurius-600 focus:ring-mercurius-500 disabled:opacity-60"
          />
          <span className="text-sm leading-relaxed text-slate-600">
            I&apos;ve reviewed the full scope and pricing above and I&apos;m
            ready to move forward. I understand that {businessName} may confirm
            final details during a site visit.
          </span>
        </label>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            disabled={isSubmitting}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                Confirm Acceptance
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
