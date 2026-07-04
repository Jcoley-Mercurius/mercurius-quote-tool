"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "./WorkspaceProvider";
import { organizationsErrorMessage } from "@/lib/organizations/errors";
import {
  fetchOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/lib/organizations/members";
import {
  canChangeOrganizationMemberRole,
  canManageOrganizationMembers,
  canRemoveOrganizationMember,
  canTransferOrganizationOwnership,
  countOrganizationOwners,
  formatOrganizationRole,
  getOrganizationMemberLabel,
  getTransferOwnershipCandidates,
  type ManageableMemberRole,
  type OrganizationMember,
} from "@/lib/organizations/types";
import { formatShortDate } from "@/lib/quotes/helpers";
import { toastError, toastPromise } from "@/lib/ui/toast";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";

export function OrganizationMembersSettings() {
  const { user } = useAuth();
  const { workspace, memberships, refreshOrganizations, switchWorkspace } =
    useWorkspace();
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const membership =
    workspace.type === "organization"
      ? memberships.find((m) => m.organizationId === workspace.organizationId)
      : undefined;

  const canManage =
    workspace.type === "organization" &&
    membership &&
    canManageOrganizationMembers(membership.role);

  const canTransfer =
    workspace.type === "organization" &&
    membership &&
    canTransferOrganizationOwnership(membership.role);

  const transferCandidates =
    members && user
      ? getTransferOwnershipCandidates(members, user.id)
      : [];

  const organizationId =
    workspace.type === "organization" ? workspace.organizationId : null;

  const ownerCount = useMemo(
    () => (members ? countOrganizationOwners(members) : 0),
    [members]
  );

  useEffect(() => {
    if (workspace.type !== "organization" || !organizationId) return;

    let cancelled = false;

    fetchOrganizationMembers(organizationId)
      .then((loaded) => {
        if (!cancelled) {
          setMembers(loaded);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setMembers([]);
        setLoadError(
          organizationsErrorMessage(error, "Could not load team members.")
        );
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, workspace.type]);

  const reloadMembers = async () => {
    if (!organizationId) return;
    setMembers(null);
    try {
      const loaded = await fetchOrganizationMembers(organizationId);
      setMembers(loaded);
      setLoadError(null);
    } catch (error) {
      setMembers([]);
      setLoadError(
        organizationsErrorMessage(error, "Could not load team members.")
      );
      toastError(error, "Could not load team members.");
    }
  };

  if (workspace.type !== "organization") {
    return null;
  }

  const handleRoleChange = async (
    member: OrganizationMember,
    nextRole: ManageableMemberRole
  ) => {
    if (!user || !canManage) return;
    if (member.role === nextRole) return;

    if (!canChangeOrganizationMemberRole(user.id, member, ownerCount)) {
      toastError(null, "You cannot change this member's role.");
      return;
    }

    setUpdatingMemberId(member.id);
    try {
      await toastPromise(updateOrganizationMemberRole(member.id, nextRole), {
        loading: "Updating role...",
        success: `${getOrganizationMemberLabel(member)} is now ${formatOrganizationRole(nextRole).toLowerCase()}.`,
        error: "Could not update member role.",
      });
      await reloadMembers();
      await refreshOrganizations();
    } catch {
      // toastPromise already surfaced the error
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemove = (member: OrganizationMember) => {
    if (!user || !canManage) return;

    if (!canRemoveOrganizationMember(user.id, member, ownerCount)) {
      toastError(null, "You cannot remove this member.");
      return;
    }

    const label = getOrganizationMemberLabel(member);
    if (!confirm(`Remove ${label} from ${workspace.name}?`)) return;

    setRemovingMemberId(member.id);
    void toastPromise(removeOrganizationMember(member.id), {
      loading: "Removing member...",
      success: `${label} was removed from the team.`,
      error: "Could not remove member.",
    })
      .then(async () => {
        if (member.userId === user.id) {
          switchWorkspace({ type: "personal" });
          await refreshOrganizations();
          return;
        }
        await reloadMembers();
        await refreshOrganizations();
      })
      .finally(() => {
        setRemovingMemberId(null);
      });
  };

  return (
    <section
      id="team-members"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team members</h2>
          <p className="mt-2 text-sm text-slate-500">
            {canManage ? (
              <>
                Manage who has access to{" "}
                <span className="font-medium">{workspace.name}</span>.
              </>
            ) : (
              <>
                People in <span className="font-medium">{workspace.name}</span>.
                Only owners and admins can change roles or remove members.
              </>
            )}
          </p>
        </div>

        {canTransfer ? (
          <button
            type="button"
            onClick={() => setTransferDialogOpen(true)}
            disabled={transferCandidates.length === 0}
            className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Transfer ownership
          </button>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : members === null ? (
        <div className="flex items-center gap-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercurius-200 border-t-mercurius-600" />
          <p className="text-sm text-slate-500">Loading team members...</p>
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-500">No team members found.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {members.map((member) => {
            const isCurrentUser = user?.id === member.userId;
            const canEditRole =
              canManage &&
              user &&
              canChangeOrganizationMemberRole(user.id, member, ownerCount);
            const canRemove =
              canManage &&
              user &&
              canRemoveOrganizationMember(user.id, member, ownerCount);
            const isUpdating = updatingMemberId === member.id;
            const isRemoving = removingMemberId === member.id;

            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {getOrganizationMemberLabel(member)}
                    {isCurrentUser ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  {member.displayName ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {member.email}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {formatOrganizationRole(member.role)}
                    {" · "}
                    Joined {formatShortDate(member.joinedAt)}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEditRole ? (
                      <select
                        value={member.role === "owner" ? "admin" : member.role}
                        disabled={isUpdating || isRemoving || member.role === "owner"}
                        onChange={(event) =>
                          void handleRoleChange(
                            member,
                            event.target.value as ManageableMemberRole
                          )
                        }
                        aria-label={`Role for ${getOrganizationMemberLabel(member)}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20 disabled:opacity-60"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {formatOrganizationRole(member.role)}
                      </span>
                    )}

                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={isUpdating || isRemoving}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {isRemoving ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className="shrink-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {formatOrganizationRole(member.role)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {user && transferDialogOpen ? (
        <TransferOwnershipDialog
          organizationName={workspace.name}
          actorUserId={user.id}
          members={members ?? []}
          onClose={() => setTransferDialogOpen(false)}
          onTransferred={async () => {
            await reloadMembers();
            await refreshOrganizations();
          }}
        />
      ) : null}
    </section>
  );
}