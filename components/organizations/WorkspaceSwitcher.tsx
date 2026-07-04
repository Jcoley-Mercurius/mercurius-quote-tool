"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { workspaceLabel, type Workspace } from "@/lib/organizations/types";
import { toastInfo } from "@/lib/ui/toast";

export function WorkspaceSwitcher() {
  const {
    workspace,
    memberships,
    isLoading,
    loadError,
    isRetrying,
    schemaAvailable,
    switchWorkspace,
    retryOrganizations,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, open]);

  const handleSelect = (next: Workspace) => {
    switchWorkspace(next);
    toastInfo(`Switched to ${workspaceLabel(next)} workspace.`, {
      duration: 2500,
    });
    closeMenu();
  };

  if (isLoading) {
    return (
      <span className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 lg:inline-flex">
        <LoadingSpinner size="sm" />
        Loading workspace...
      </span>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative hidden lg:block">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={[
            "inline-flex max-w-[220px] items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50",
            loadError
              ? "border-amber-300 text-amber-800"
              : "border-slate-200 text-slate-700",
          ].join(" ")}
        >
          <WorkspaceIcon />
          <span className="truncate">{workspaceLabel(workspace)}</span>
          {loadError && (
            <span
              className="shrink-0 text-amber-500"
              title="Team workspaces could not be loaded"
              aria-hidden
            >
              <WarningIcon />
            </span>
          )}
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label="Select workspace"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {loadError && (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-medium">Team list unavailable</p>
                <p className="mt-1 leading-relaxed text-amber-800/90">
                  {loadError}
                </p>
                <button
                  type="button"
                  onClick={() => void retryOrganizations()}
                  disabled={isRetrying}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
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
              </div>
            )}

            <WorkspaceOption
              label="Personal"
              description="Your private quotes"
              selected={workspace.type === "personal"}
              onSelect={() => handleSelect({ type: "personal" })}
            />

            {memberships.length > 0 && (
              <div className="my-1 border-t border-slate-100" />
            )}

            {memberships.map((membership) => (
              <WorkspaceOption
                key={membership.organizationId}
                label={membership.organizationName}
                description={`${membership.role} · Team workspace`}
                selected={
                  workspace.type === "organization" &&
                  workspace.organizationId === membership.organizationId
                }
                onSelect={() =>
                  handleSelect({
                    type: "organization",
                    organizationId: membership.organizationId,
                    name: membership.organizationName,
                  })
                }
              />
            ))}

            {memberships.length === 0 && !loadError && schemaAvailable && (
              <p className="px-4 py-2 text-xs text-slate-500">
                No team workspaces yet. Create one to collaborate.
              </p>
            )}

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setCreateOpen(true);
              }}
              disabled={!schemaAvailable}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-mercurius-700 transition-colors hover:bg-mercurius-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <PlusIcon />
              Create organization
            </button>
          </div>
        )}
      </div>

      <CreateOrganizationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}

function WorkspaceOption({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
        selected ? "bg-mercurius-50" : "hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="mt-0.5 text-mercurius-600">
        {selected ? <CheckIcon /> : <WorkspaceIcon />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">
          {label}
        </span>
        <span className="block truncate text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
}

function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5V5h1.25A2.75 2.75 0 0 1 17 7.75v8.5A2.75 2.75 0 0 1 14.25 19h-8.5A2.75 2.75 0 0 1 3 16.25v-8.5A2.75 2.75 0 0 1 5.75 5H7V3.5Zm1.5-.5a.5.5 0 0 0-.5.5V5h4V3.5a.5.5 0 0 0-.5-.5h-3ZM5.75 6.5c-.69 0-1.25.56-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={["h-4 w-4 text-slate-400 transition-transform", open ? "rotate-180" : ""].join(" ")}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.414.006l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.528 2.528 6.543-6.59a1 1 0 0 1 1.414-.017Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
    </svg>
  );
}