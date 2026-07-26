import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OpportunityAssignmentError,
  type OpportunityAssignmentResult,
} from "@/lib/opportunities/assignment";
import type {
  OrganizationMember,
  OrganizationRole,
} from "@/lib/organizations/types";
import { OpportunityAssignmentCard } from "./OpportunityAssignmentCard";

const { assignOpportunity, toastError, toastSuccess } = vi.hoisted(() => ({
  assignOpportunity: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/opportunities/assignment", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/opportunities/assignment")>();
  return { ...actual, assignOpportunity };
});

vi.mock("@/lib/ui/toast", () => ({ toastError, toastSuccess }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

const members: OrganizationMember[] = [
  {
    id: "membership-owner",
    userId: "user-owner",
    email: "owner@example.com",
    displayName: "Olivia Owner",
    role: "owner",
    joinedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "membership-member",
    userId: "user-member",
    email: "member@example.com",
    displayName: null,
    role: "member",
    joinedAt: "2026-07-02T00:00:00Z",
  },
];

function result(
  assignedUserId: string | null,
  updatedAt = "2026-07-27T11:00:00Z"
): OpportunityAssignmentResult {
  return {
    opportunityId: "opp-1",
    assignedUserId,
    updatedAt,
    historyId: "history-1",
    occurredAt: updatedAt,
  };
}

function props(overrides: Partial<React.ComponentProps<
  typeof OpportunityAssignmentCard
>> = {}): React.ComponentProps<typeof OpportunityAssignmentCard> {
  return {
    opportunityId: "opp-1",
    assignedUserId: null,
    updatedAt: "2026-07-27T10:00:00Z",
    assignmentLabel: "Unassigned",
    personal: false,
    currentUserId: "user-owner",
    currentRole: "owner",
    members,
    onAssigned: vi.fn(),
    onNotFound: vi.fn(),
    onConflict: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("OpportunityAssignmentCard", () => {
  it("shows You without controls in personal workspaces, including a null assignee", () => {
    render(<OpportunityAssignmentCard {...props({
      personal: true,
      assignedUserId: null,
      assignmentLabel: "Unassigned",
      members: [],
      currentRole: null,
    })} />);

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(assignOpportunity).not.toHaveBeenCalled();
  });

  it.each(["owner", "admin"] as OrganizationRole[])(
    "shows the trusted native member selector for an %s",
    (currentRole) => {
      render(<OpportunityAssignmentCard {...props({
        currentRole,
        assignedUserId: "user-member",
        assignmentLabel: "member@example.com",
      })} />);

      const select = screen.getByRole("combobox", {
        name: "Assign opportunity",
      });
      expect(select).toHaveValue("user-member");
      expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Olivia Owner" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "member@example.com" })).toBeInTheDocument();
      expect(screen.queryByText(/pending|removed/i)).not.toBeInTheDocument();
    }
  );

  it("uses a narrow payload and applies the authoritative result before a later clear", async () => {
    const user = userEvent.setup();
    assignOpportunity
      .mockResolvedValueOnce(result("user-member"))
      .mockResolvedValueOnce(result(null, "2026-07-27T12:00:00Z"));

    function Harness() {
      const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
      const [updatedAt, setUpdatedAt] = useState("2026-07-27T10:00:00Z");
      return (
        <OpportunityAssignmentCard
          {...props({
            assignedUserId,
            updatedAt,
            assignmentLabel:
              assignedUserId === "user-member" ? "member@example.com" : "Unassigned",
            onAssigned: (next) => {
              setAssignedUserId(next.assignedUserId);
              setUpdatedAt(next.updatedAt);
            },
          })}
        />
      );
    }

    render(<Harness />);
    const select = screen.getByRole("combobox", { name: "Assign opportunity" });
    await user.selectOptions(select, "user-member");
    await waitFor(() => expect(select).toHaveValue("user-member"));
    expect(assignOpportunity).toHaveBeenNthCalledWith(1, {
      opportunityId: "opp-1",
      assignedUserId: "user-member",
      expectedUpdatedAt: "2026-07-27T10:00:00Z",
    });

    await user.selectOptions(select, "");
    await waitFor(() => expect(select).toHaveValue(""));
    expect(assignOpportunity).toHaveBeenNthCalledWith(2, {
      opportunityId: "opp-1",
      assignedUserId: null,
      expectedUpdatedAt: "2026-07-27T11:00:00Z",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Assignment updated.");
  });

  it("keeps the authoritative selection and prevents duplicate submissions while pending", async () => {
    let resolveAssignment!: (value: OpportunityAssignmentResult) => void;
    assignOpportunity.mockReturnValueOnce(new Promise((resolve) => {
      resolveAssignment = resolve;
    }));
    const viewProps = props();
    render(<OpportunityAssignmentCard {...viewProps} />);
    const select = screen.getByRole("combobox", { name: "Assign opportunity" });

    fireEvent.change(select, { target: { value: "user-member" } });
    fireEvent.change(select, { target: { value: "user-owner" } });
    expect(select).toBeDisabled();
    expect(select).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Updating assignment");
    fireEvent.change(select, { target: { value: "user-owner" } });
    expect(assignOpportunity).toHaveBeenCalledTimes(1);

    resolveAssignment(result("user-member"));
    await waitFor(() => expect(select).not.toBeDisabled());
  });

  it("gives members only a self-assignment action and then shows Assigned to you", async () => {
    const user = userEvent.setup();
    assignOpportunity.mockResolvedValueOnce(result("user-member"));
    const onAssigned = vi.fn();
    const { rerender } = render(<OpportunityAssignmentCard {...props({
      currentRole: "member",
      currentUserId: "user-member",
      assignedUserId: "user-owner",
      assignmentLabel: "Olivia Owner",
      onAssigned,
    })} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText(/unassign/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Assign to me" }));
    expect(assignOpportunity).toHaveBeenCalledWith({
      opportunityId: "opp-1",
      assignedUserId: "user-member",
      expectedUpdatedAt: "2026-07-27T10:00:00Z",
    });
    expect(onAssigned).toHaveBeenCalledWith(result("user-member"));

    rerender(<OpportunityAssignmentCard {...props({
      currentRole: "member",
      currentUserId: "user-member",
      assignedUserId: "user-member",
      assignmentLabel: "member@example.com",
    })} />);
    expect(screen.getByText("Assigned to you")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
  });

  it("withholds controls when trusted membership data or role is unavailable", () => {
    const { rerender } = render(<OpportunityAssignmentCard {...props({
      assignedUserId: "former-user",
      assignmentLabel: "Assigned team member",
      members: null,
    })} />);
    expect(screen.getByText("Assigned team member")).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    rerender(<OpportunityAssignmentCard {...props({
      currentRole: null,
      members,
    })} />);
    expect(screen.getByText("Assignment controls are unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it.each([
    ["not_authenticated", /session is no longer available/i],
    ["forbidden", /do not have permission/i],
    ["invalid", /target is no longer valid/i],
    ["unavailable", /could not be updated/i],
  ] as const)("renders a safe persistent %s error", async (code, message) => {
    const user = userEvent.setup();
    assignOpportunity.mockRejectedValueOnce(
      new OpportunityAssignmentError(code, "raw database policy UUID 123")
    );
    render(<OpportunityAssignmentCard {...props()} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Assign opportunity" }),
      "user-member"
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText(/raw database|UUID 123/i)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("refreshes authoritative detail after a conflict before allowing retry", async () => {
    const user = userEvent.setup();
    const onConflict = vi.fn().mockResolvedValue(undefined);
    assignOpportunity.mockRejectedValueOnce(
      new OpportunityAssignmentError("conflict", "raw stale details")
    );
    render(<OpportunityAssignmentCard {...props({ onConflict })} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Assign opportunity" }),
      "user-member"
    );
    expect(onConflict).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /review the current assignment/i
    );
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("uses the existing hidden state callback for not-found responses", async () => {
    const user = userEvent.setup();
    const onNotFound = vi.fn();
    assignOpportunity.mockRejectedValueOnce(
      new OpportunityAssignmentError("not_found", "cross-workspace row exists")
    );
    render(<OpportunityAssignmentCard {...props({ onNotFound })} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Assign opportunity" }),
      "user-member"
    );
    expect(onNotFound).toHaveBeenCalledOnce();
    expect(screen.queryByText(/cross-workspace|row exists/i)).not.toBeInTheDocument();
  });
});
