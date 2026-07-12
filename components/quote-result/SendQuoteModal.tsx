"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/lib/ui/toast";
import type { QuoteStatus } from "@/lib/quotes/types";

interface SendQuoteModalProps {
  open: boolean;
  quoteId: string;
  /** Current quote status — used to fire onStatusChange if promoted to "sent" */
  status: QuoteStatus;
  onClose: () => void;
  onStatusChange?: (status: QuoteStatus) => void;
}

export function SendQuoteModal({
  open,
  quoteId,
  status,
  onClose,
  onStatusChange,
}: SendQuoteModalProps) {
  const { session } = useAuth();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus the email field when modal opens; lock body scroll
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => emailInputRef.current?.focus(), 50);
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isSending, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setClientName("");
      setClientEmail("");
      setPersonalNote("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      toastError(null, "Sign in to send quotes.");
      return;
    }

    const email = clientEmail.trim();
    if (!email || !email.includes("@")) {
      toastError(null, "Please enter a valid email address.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientName: clientName.trim() || undefined,
          clientEmail: email,
          personalNote: personalNote.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        sent?: boolean;
        skippedReason?: string | null;
        statusUpdated?: string | null;
        error?: string;
      } | null;

      if (!response.ok) {
        toastError(
          new Error(payload?.error ?? "Send failed"),
          payload?.error ?? "Could not send the quote. Please try again."
        );
        return;
      }

      // Promote status on parent if quote was moved from draft → sent
      if (payload?.statusUpdated === "sent" && status === "draft") {
        onStatusChange?.("sent");
      }

      if (payload?.sent === false && payload?.skippedReason) {
        // Email was skipped (Resend not configured) — still close modal and inform
        toastSuccess(
          "Quote link ready — email delivery is not configured in this environment."
        );
      } else {
        toastSuccess(`Quote sent to ${email}.`);
      }

      onClose();
    } catch {
      toastError(null, "Could not send the quote. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={isSending ? undefined : onClose}
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-quote-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mercurius-50">
            <EnvelopeIcon className="h-5 w-5 text-mercurius-600" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="send-quote-title"
              className="text-base font-semibold text-slate-900"
            >
              Send Quote to Client
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              A branded email with the shareable quote link will be sent to the
              client.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Client name (optional) */}
          <div>
            <label
              htmlFor="send-client-name"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Client name{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="send-client-name"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className={inputClass}
              disabled={isSending}
              autoComplete="off"
            />
          </div>

          {/* Client email (required) */}
          <div>
            <label
              htmlFor="send-client-email"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Client email <span className="text-red-500">*</span>
            </label>
            <input
              id="send-client-email"
              ref={emailInputRef}
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className={inputClass}
              required
              disabled={isSending}
              autoComplete="off"
            />
          </div>

          {/* Personal note (optional) */}
          <div>
            <label
              htmlFor="send-personal-note"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Personal note{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="send-personal-note"
              rows={3}
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="e.g. Hi Sarah, great speaking with you today. Here's the estimate we discussed…"
              className={`${inputClass} resize-none`}
              disabled={isSending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !clientEmail.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-mercurius-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <EnvelopeIcon className="h-4 w-4" />
                  Send Quote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
      <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
