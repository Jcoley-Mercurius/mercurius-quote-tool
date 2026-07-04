"use client";

import { useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function WorkspaceStatusBanner() {
  const { loadError, isRetrying, retryOrganizations, schemaAvailable } =
    useWorkspace();
  const [dismissed, setDismissed] = useState(false);

  if (!loadError || dismissed) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">Team workspaces unavailable</p>
          <p className="mt-1 leading-relaxed text-amber-800/90">{loadError}</p>
          {!schemaAvailable && (
            <p className="mt-2 text-xs text-amber-700/80">
              Apply Supabase organization migrations to enable team features.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void retryOrganizations()}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRetrying ? (
              <>
                <LoadingSpinner size="sm" />
                Retrying...
              </>
            ) : (
              "Retry"
            )}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100/80"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}