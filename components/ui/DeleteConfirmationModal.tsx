"use client";

import { useEffect, useRef } from "react";

interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Short identifier shown in the header, e.g. "MQ-2025-0042" */
  reference: string;
  /** Descriptive name shown below the reference, e.g. the job name */
  jobName: string;
  /** Swap to true while the delete promise is in flight */
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  open,
  onClose,
  onConfirm,
  reference,
  jobName,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus the destructive button so keyboard users can confirm immediately
    // (or press Escape to cancel).
    const timer = window.setTimeout(
      () => confirmButtonRef.current?.focus(),
      0
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isDeleting, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={isDeleting ? undefined : onClose}
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        {/* Icon + title row */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <TrashIcon className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="delete-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              Delete quote?
            </h2>
            <p id="delete-modal-desc" className="mt-1 text-sm text-slate-500">
              This action cannot be undone. The quote and all associated photos
              will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Quote context */}
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="font-mono text-xs font-medium text-slate-400">
            {reference}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700 line-clamp-2">
            {jobName}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Delete quote
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 0 0-.53.74l.03.15a.75.75 0 0 0 .75.75h.75v9.5c0 .966.784 1.75 1.75 1.75h7.5A1.75 1.75 0 0 0 16 15.25v-9.5h.75a.75.75 0 0 0 .75-.75l.03-.15a.75.75 0 0 0-.53-.74 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 13.25 1h-4.5ZM8 3.75V4h4v-.25A1.25 1.25 0 0 0 10.75 2.5h-1.5A1.25 1.25 0 0 0 8 3.75ZM7.5 7.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 .75-.75Zm5 0a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 .75-.75Z"
        clipRule="evenodd"
      />
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
