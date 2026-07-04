"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import {
  fetchOrganizationAuditLog,
  formatAuditEntry,
  formatAuditTimestamp,
  getAuditPersonLabel,
  type OrganizationAuditEntry,
} from "@/lib/organizations/audit";
import { organizationsErrorMessage } from "@/lib/organizations/errors";
import { canManageOrganizationMembers } from "@/lib/organizations/types";

export function OrganizationAuditLogSettings() {
  const { workspace, memberships } = useWorkspace();
  const [entries, setEntries] = useState<OrganizationAuditEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const membership =
    workspace.type === "organization"
      ? memberships.find((m) => m.organizationId === workspace.organizationId)
      : undefined;

  const canViewSensitive =
    membership && canManageOrganizationMembers(membership.role);

  const organizationId =
    workspace.type === "organization" ? workspace.organizationId : null;

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;

    fetchOrganizationAuditLog(organizationId)
      .then((loaded) => {
        if (!cancelled) {
          setEntries(loaded);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setEntries([]);
        setLoadError(
          organizationsErrorMessage(error, "Could not load activity history.")
        );
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (workspace.type !== "organization") {
    return null;
  }

  return (
    <section
      id="audit-log"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Activity log</h2>
        <p className="mt-2 text-sm text-slate-500">
          Recent team changes for{" "}
          <span className="font-medium">{workspace.name}</span>.
          {!canViewSensitive ? (
            <>
              {" "}
              Some sensitive actions are only visible to owners and admins.
            </>
          ) : null}
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : entries === null ? (
        <div className="flex items-center gap-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercurius-200 border-t-mercurius-600" />
          <p className="text-sm text-slate-500">Loading activity...</p>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">No team activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {entries.map((entry) => {
            const formatted = formatAuditEntry(entry);
            const actor = getAuditPersonLabel(
              entry.actorDisplayName,
              entry.actorEmail
            );

            return (
              <li key={entry.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {formatted.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatted.detail}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {actor} · {formatAuditTimestamp(entry.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}