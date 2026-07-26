"use client";

import { useId, useRef, useState } from "react";
import {
  assignOpportunity,
  OpportunityAssignmentError,
  type OpportunityAssignmentResult,
} from "@/lib/opportunities/assignment";
import {
  getOrganizationMemberLabel,
  type OrganizationMember,
  type OrganizationRole,
} from "@/lib/organizations/types";
import { toastError, toastSuccess } from "@/lib/ui/toast";

interface OpportunityAssignmentCardProps {
  opportunityId: string;
  assignedUserId: string | null;
  updatedAt: string;
  assignmentLabel: string;
  personal: boolean;
  currentUserId: string;
  currentRole: OrganizationRole | null;
  members: OrganizationMember[] | null;
  onAssigned: (result: OpportunityAssignmentResult) => void;
  onNotFound: () => void;
  onConflict: () => Promise<void>;
}

type Feedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

function safeAssignmentMessage(error: unknown): string {
  if (!(error instanceof OpportunityAssignmentError)) {
    return "The assignment could not be updated. Try again in a moment.";
  }
  switch (error.code) {
    case "not_authenticated":
      return "Your session is no longer available. Sign in again to update assignments.";
    case "forbidden":
      return "You do not have permission to make that assignment.";
    case "conflict":
      return "This opportunity changed. Review the current assignment and try again.";
    case "invalid":
      return "That assignment target is no longer valid or the request cannot be completed.";
    case "unavailable":
      return "The assignment could not be updated. Try again in a moment.";
    case "not_found":
      return "This opportunity is unavailable in the active workspace.";
  }
}

export function OpportunityAssignmentCard({
  opportunityId,
  assignedUserId,
  updatedAt,
  assignmentLabel,
  personal,
  currentUserId,
  currentRole,
  members,
  onAssigned,
  onNotFound,
  onConflict,
}: OpportunityAssignmentCardProps) {
  const controlId = useId();
  const feedbackId = useId();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const mutationActive = useRef(false);

  async function updateAssignment(nextAssignedUserId: string | null) {
    if (mutationActive.current || personal) return;
    mutationActive.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await assignOpportunity({
        opportunityId,
        assignedUserId: nextAssignedUserId,
        expectedUpdatedAt: updatedAt,
      });
      onAssigned(result);
      setFeedback({ tone: "success", message: "Assignment updated." });
      toastSuccess("Assignment updated.");
    } catch (error) {
      if (
        error instanceof OpportunityAssignmentError &&
        error.code === "not_found"
      ) {
        onNotFound();
        return;
      }
      if (
        error instanceof OpportunityAssignmentError &&
        error.code === "conflict"
      ) {
        await onConflict();
      }
      const message = safeAssignmentMessage(error);
      setFeedback({ tone: "error", message });
      toastError(null, message);
    } finally {
      mutationActive.current = false;
      setPending(false);
    }
  }

  const canManage =
    currentRole === "owner" || currentRole === "admin";
  const assignedToCurrentUser = assignedUserId === currentUserId;
  const knownCurrentAssignee =
    assignedUserId === null ||
    Boolean(members?.some((member) => member.userId === assignedUserId));
  const feedbackDescription = feedback ? feedbackId : undefined;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        Assignment
      </h2>
      <div className="mt-4 space-y-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Assigned to
          </p>
          <p className="mt-1 break-words text-sm font-medium text-slate-700">
            {personal ? "You" : assignmentLabel}
          </p>
        </div>

        {!personal && members === null ? (
          <p className="text-sm leading-6 text-slate-500">
            Assignment controls are temporarily unavailable.
          </p>
        ) : !personal && canManage && members ? (
          <div>
            <label
              htmlFor={controlId}
              className="block text-sm font-semibold text-slate-800"
            >
              Assign opportunity
            </label>
            <select
              id={controlId}
              value={assignedUserId ?? ""}
              disabled={pending}
              aria-busy={pending}
              aria-describedby={feedbackDescription}
              onChange={(event) => {
                void updateAssignment(event.target.value || null);
              }}
              className="mt-2 min-h-11 w-full max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">Unassigned</option>
              {!knownCurrentAssignee && assignedUserId ? (
                <option value={assignedUserId} disabled>
                  Assigned team member (unavailable)
                </option>
              ) : null}
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {getOrganizationMemberLabel(member)}
                </option>
              ))}
            </select>
          </div>
        ) : !personal && currentRole === "member" ? (
          assignedToCurrentUser ? (
            <p className="text-sm font-medium text-emerald-800">
              Assigned to you
            </p>
          ) : (
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              aria-describedby={feedbackDescription}
              onClick={() => void updateAssignment(currentUserId)}
              className="min-h-11 w-full rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {pending ? "Assigning…" : "Assign to me"}
            </button>
          )
        ) : !personal ? (
          <p className="text-sm leading-6 text-slate-500">
            Assignment controls are unavailable.
          </p>
        ) : null}

        {pending ? (
          <p role="status" aria-live="polite" className="text-sm text-slate-600">
            Updating assignment…
          </p>
        ) : null}
        {feedback ? (
          <p
            id={feedbackId}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live={feedback.tone === "error" ? "assertive" : "polite"}
            className={
              feedback.tone === "error"
                ? "break-words text-sm text-red-700"
                : "text-sm text-emerald-700"
            }
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
