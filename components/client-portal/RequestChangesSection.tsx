"use client";

import { useState } from "react";

type RequestState =
  | { phase: "idle" }
  | { phase: "composing" }
  | { phase: "submitting" }
  | { phase: "success" }
  | { phase: "error"; message: string };

interface RequestChangesSectionProps {
  token: string;
  quoteReference: string;
  businessName: string;
  /** Disable when quote is already accepted */
  disabled?: boolean;
  onSubmitted?: () => void;
}

export function RequestChangesSection({
  token,
  businessName,
  disabled = false,
  onSubmitted,
}: RequestChangesSectionProps) {
  const [state, setState] = useState<RequestState>({ phase: "idle" });
  const [message, setMessage] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");

  const charCount = message.length;
  const maxChars = 2000;
  const canSubmit = message.trim().length >= 10 && !disabled;
  const isSubmitting = state.phase === "submitting";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setState({ phase: "submitting" });

    try {
      const response = await fetch(
        `/api/quotes/share/${encodeURIComponent(token)}/request-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message.trim(),
            requesterName: requesterName.trim() || undefined,
            requesterPhone: requesterPhone.trim() || undefined,
          }),
        }
      );

      const data = (await response.json()) as {
        submitted?: boolean;
        error?: string;
      };

      if (response.status === 409) {
        setState({
          phase: "error",
          message: "This quote has already been accepted and cannot be changed.",
        });
        return;
      }

      if (!response.ok || !data.submitted) {
        setState({
          phase: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setState({ phase: "success" });
      onSubmitted?.();
    } catch {
      setState({
        phase: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  };

  if (disabled) return null;

  // Success state
  if (state.phase === "success") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <CheckIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-amber-900">
              Request sent
            </h3>
            <p className="mt-1 text-sm text-amber-800/80">
              <span className="font-medium">{businessName}</span> has received
              your feedback and will follow up with a revised quote. You can
              keep this page open to check for updates.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Idle — small link-style trigger to avoid crowding the accept CTA
  if (state.phase === "idle") {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setState({ phase: "composing" })}
          className="text-sm font-medium text-slate-400 underline decoration-dotted underline-offset-4 transition-colors hover:text-slate-600"
        >
          Not ready to accept? Request changes instead
        </button>
      </div>
    );
  }

  // Composing / Submitting / Error
  return (
    <section className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">
          Something not right?
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Tell {businessName} what you&apos;d like adjusted. They&apos;ll review
          your feedback and send a revised quote.
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
            onClick={() => setState({ phase: "composing" })}
            className="ml-2 font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Message */}
        <div>
          <label
            htmlFor="changes-message"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            What would you like changed?{" "}
            <span className="text-red-500" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id="changes-message"
            rows={5}
            placeholder="Example: Can you break out the labor and materials separately? Also, can you provide an option that uses a different brand for the condenser unit?"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            disabled={isSubmitting}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between">
            {message.trim().length > 0 && message.trim().length < 10 && (
              <p className="text-xs text-red-500">
                Please write at least 10 characters.
              </p>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {charCount}/{maxChars}
            </span>
          </div>
        </div>

        {/* Optional contact fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="requester-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Your name{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="requester-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="requester-phone"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Phone for callback{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="requester-phone"
              type="tel"
              autoComplete="tel"
              placeholder="(239) 555-0100"
              value={requesterPhone}
              onChange={(e) => setRequesterPhone(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>
        </div>

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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Sending request...
              </>
            ) : (
              "Send Request"
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
