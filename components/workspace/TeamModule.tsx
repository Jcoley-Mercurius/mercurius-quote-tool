"use client";

import { OrganizationMembersSettings } from "@/components/organizations/OrganizationMembersSettings";
import { OrganizationTeamSettings } from "@/components/organizations/OrganizationTeamSettings";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import Link from "next/link";

export function TeamModule() {
  const { workspace } = useWorkspace();
  return (
    <div className="mx-auto max-w-3xl py-4">
      <header className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Team</h1>
        <p className="mt-2 text-slate-600">Manage the people who can work in this organization.</p>
      </header>
      {workspace.type === "organization" ? (
        <div className="space-y-6">
          <OrganizationMembersSettings />
          <OrganizationTeamSettings />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-950">Choose an organization workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Team management is available for organization workspaces. Use the workspace switcher above, or create an organization.
          </p>
          <Link href="/command-center" className="mt-5 inline-block text-sm font-semibold text-emerald-700">
            Back to Command Center
          </Link>
        </div>
      )}
    </div>
  );
}
