"use client";

import { useWorkspace } from "./WorkspaceProvider";
import { workspaceLabel, type Workspace } from "@/lib/organizations/types";

interface QuoteSaveTargetSelectorProps {
  value: Workspace;
  onChange: (workspace: Workspace) => void;
}

export function QuoteSaveTargetSelector({
  value,
  onChange,
}: QuoteSaveTargetSelectorProps) {
  const { memberships } = useWorkspace();

  if (memberships.length === 0) {
    return null;
  }

  const selectedKey =
    value.type === "personal" ? "personal" : value.organizationId;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-700">Save quote to</p>
      <p className="mt-1 text-xs text-slate-500">
        Choose whether this quote stays private or is shared with your team.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SaveTargetOption
          label="Personal"
          description="Only you can see this quote"
          selected={value.type === "personal"}
          onSelect={() => onChange({ type: "personal" })}
        />

        {memberships.map((membership) => (
          <SaveTargetOption
            key={membership.organizationId}
            label={membership.organizationName}
            description="Shared with team members"
            selected={
              value.type === "organization" &&
              value.organizationId === membership.organizationId
            }
            onSelect={() =>
              onChange({
                type: "organization",
                organizationId: membership.organizationId,
                name: membership.organizationName,
              })
            }
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Currently viewing: <span className="font-medium">{workspaceLabel(value)}</span>
        {selectedKey !== "personal" && " workspace"}
      </p>
    </div>
  );
}

function SaveTargetOption({
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
      onClick={onSelect}
      className={[
        "min-w-[140px] flex-1 rounded-lg border-2 px-4 py-3 text-left transition-all",
        selected
          ? "border-mercurius-500 bg-white shadow-sm"
          : "border-transparent bg-white ring-1 ring-slate-200 hover:ring-mercurius-200",
      ].join(" ")}
    >
      <span className="block text-sm font-medium text-slate-900">{label}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
    </button>
  );
}