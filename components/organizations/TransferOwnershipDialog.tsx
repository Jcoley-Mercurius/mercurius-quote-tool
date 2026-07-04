"use client";

import { useEffect, useMemo, useState } from "react";
import { organizationsErrorMessage } from "@/lib/organizations/errors";
import { transferOrganizationOwnership } from "@/lib/organizations/members";
import {
  formatOrganizationRole,
  getOrganizationMemberLabel,
  getTransferOwnershipCandidates,
  type OrganizationMember,
} from "@/lib/organizations/types";
import { toastError, toastSuccess } from "@/lib/ui/toast";

interface TransferOwnershipDialogProps {
  organizationName: string;
  actorUserId: string;
  members: OrganizationMember[];
  onClose: () => void;
  onTransferred: () => Promise<void>;
}

export function TransferOwnershipDialog({
  organizationName,
  actorUserId,
  members,
  onClose,
  onTransferred,
}: TransferOwnershipDialogProps) {
  const candidates = useMemo(
    () => getTransferOwnershipCandidates(members, actorUserId),
    [members, actorUserId]
  );
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedMemberId =
    selectedMemberId || (candidates.length === 1 ? candidates[0].id : "");

  const selectedMember = candidates.find(
    (member) => member.id === resolvedMemberId
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedMember) {
      toastError(null, "Select a team member to transfer ownership to.");
      return;
    }

    const label = getOrganizationMemberLabel(selectedMember);
    const confirmed = confirm(
      `Transfer ownership of ${organizationName} to ${label}?\n\nYou will become an admin and ${label} will become the owner.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await transferOrganizationOwnership(selectedMember.id);
      toastSuccess(`Ownership transferred to ${label}. You are now an admin.`);
      await onTransferred();
      onClose();
    } catch (error) {
      toastError(
        error,
        organizationsErrorMessage(
          error,
          "Could not transfer ownership. Please try again."
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
        disabled={isSubmitting}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-ownership-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="transfer-ownership-title"
          className="text-lg font-semibold text-slate-900"
        >
          Transfer ownership
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Choose a member of <span className="font-medium">{organizationName}</span>{" "}
          to become the new owner. You will be downgraded to admin.
        </p>

        {candidates.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Add another team member before transferring ownership.
          </p>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="transfer-member"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                New owner
              </label>
              <select
                id="transfer-member"
                value={resolvedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20 disabled:opacity-60"
              >
                <option value="">Select a team member</option>
                {candidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getOrganizationMemberLabel(member)} (
                    {formatOrganizationRole(member.role).toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !resolvedMemberId}
                className="rounded-xl bg-mercurius-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
              >
                {isSubmitting ? "Transferring..." : "Transfer ownership"}
              </button>
            </div>
          </form>
        )}

        {candidates.length === 0 ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}