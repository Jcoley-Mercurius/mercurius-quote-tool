"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { organizationsErrorMessage } from "@/lib/organizations/errors";
import { toastError, toastSuccess } from "@/lib/ui/toast";

interface CreateOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateOrganizationDialog({
  open,
  onClose,
}: CreateOrganizationDialogProps) {
  const { createNewOrganization } = useWorkspace();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setName("");
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setName("");
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toastError(new Error("Name required"), "Enter an organization name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const workspace = await createNewOrganization(trimmed);
      toastSuccess(`Created "${workspace.type === "organization" ? workspace.name : trimmed}".`);
      handleClose();
    } catch (error) {
      toastError(
        error,
        organizationsErrorMessage(
          error,
          "Could not create organization. Please try again."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-org-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="create-org-title" className="text-lg font-semibold text-slate-900">
          Create organization
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Team members can share quotes and view them in a shared workspace.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Organization name
            </label>
            <input
              ref={inputRef}
              id="org-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Cape Coral HVAC Team"
              maxLength={80}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-mercurius-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}