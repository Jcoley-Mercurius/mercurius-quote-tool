"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import {
  cancelOrganizationInvite,
  createOrganizationInvite,
  fetchPendingInvites,
} from "@/lib/organizations/invites";
import {
  buildInviteUrl,
  canManageOrganizationInvites,
  isValidInviteEmail,
  normalizeInviteEmail,
  type InvitableRole,
  type OrganizationInvite,
} from "@/lib/organizations/types";
import { formatShortDate } from "@/lib/quotes/helpers";
import { toastError, toastPromise, toastSuccess } from "@/lib/ui/toast";

export function OrganizationTeamSettings() {
  const { workspace, memberships } = useWorkspace();
  const [invites, setInvites] = useState<OrganizationInvite[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const membership =
    workspace.type === "organization"
      ? memberships.find((m) => m.organizationId === workspace.organizationId)
      : undefined;

  const canManage =
    workspace.type === "organization" &&
    membership &&
    canManageOrganizationInvites(membership.role);

  const organizationId =
    workspace.type === "organization" ? workspace.organizationId : null;

  useEffect(() => {
    if (!canManage || !organizationId) return;

    let cancelled = false;

    fetchPendingInvites(organizationId)
      .then((pending) => {
        if (!cancelled) {
          setInvites(pending);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setInvites([]);
        setLoadError(
          error instanceof Error ? error.message : "Could not load pending invites."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [canManage, organizationId]);

  const reloadInvites = async () => {
    if (!organizationId) return;
    setInvites(null);
    try {
      const pending = await fetchPendingInvites(organizationId);
      setInvites(pending);
      setLoadError(null);
    } catch (error) {
      setInvites([]);
      setLoadError(
        error instanceof Error ? error.message : "Could not load pending invites."
      );
      toastError(error, "Could not load pending invites.");
    }
  };

  if (workspace.type !== "organization") {
    return null;
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Team</h2>
        <p className="mt-2 text-sm text-slate-500">
          You are a member of <span className="font-medium">{workspace.name}</span>.
          Only owners and admins can invite new teammates.
        </p>
      </section>
    );
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidInviteEmail(email)) {
      toastError(null, "Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createOrganizationInvite(
        workspace.organizationId,
        email,
        role
      );
      await reloadInvites();
      setEmail("");

      const inviteUrl = buildInviteUrl(created.token);
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toastSuccess("Invite created. Link copied to clipboard.");
      } catch {
        toastSuccess("Invite created. Copy the link from the pending invites list.");
      }
    } catch (error) {
      toastError(error, "Could not send invite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (invite: OrganizationInvite) => {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(invite.token));
      toastSuccess("Invite link copied.");
    } catch {
      toastError(null, "Could not copy link. Please copy it manually.");
    }
  };

  const handleCancel = (invite: OrganizationInvite) => {
    if (!confirm(`Cancel invite for ${invite.email}?`)) return;

    void toastPromise(cancelOrganizationInvite(invite.id), {
      loading: "Canceling invite...",
      success: "Invite canceled.",
      error: "Could not cancel invite. Please try again.",
    }).then(() => reloadInvites());
  };

  return (
    <section
      id="team"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Team invites</h2>
        <p className="mt-2 text-sm text-slate-500">
          Invite people to <span className="font-medium">{workspace.name}</span> by
          email. They can accept via a shareable link (valid for 7 days).
        </p>
      </div>

      <form
        onSubmit={(event) => void handleInvite(event)}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
          />
        </div>

        <div className="sm:w-40">
          <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as InvitableRole)}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send invite"}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-900">Pending invites</h3>

        {loadError ? (
          <p className="mt-3 text-sm text-red-600">{loadError}</p>
        ) : invites === null ? (
          <p className="mt-3 text-sm text-slate-500">Loading invites...</p>
        ) : invites.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pending invites.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {invite.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {invite.role} · Expires {formatShortDate(invite.expiresAt)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(invite)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(invite)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {email && (
        <p className="mt-4 text-xs text-slate-400">
          Invites are sent to {normalizeInviteEmail(email)}. The recipient must sign
          in with that email to accept.
        </p>
      )}
    </section>
  );
}