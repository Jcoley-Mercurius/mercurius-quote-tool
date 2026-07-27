import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/lib/organizations/types";
import type { OpportunityDetail } from "@/lib/opportunities/types";
import { OpportunityDetailWorkspace } from "./OpportunityDetailWorkspace";

const {
  assignOpportunity,
  fetchOrganizationMembers,
  fetchOpportunityAssignmentHistory,
  fetchOpportunityDetail,
  fetchOpportunityHistory,
  fetchOpportunityQuotes,
  mockUseAuth,
  mockUseWorkspace,
} = vi.hoisted(() => ({
  assignOpportunity: vi.fn(),
  fetchOrganizationMembers: vi.fn(),
  fetchOpportunityAssignmentHistory: vi.fn(),
  fetchOpportunityDetail: vi.fn(),
  fetchOpportunityHistory: vi.fn(),
  fetchOpportunityQuotes: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseWorkspace: vi.fn(),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/components/organizations/WorkspaceProvider", () => ({
  useWorkspace: () => mockUseWorkspace(),
}));
vi.mock("@/lib/organizations/members", () => ({
  fetchOrganizationMembers,
}));
vi.mock("@/lib/opportunities/assignment-history", () => ({
  fetchOpportunityAssignmentHistory,
}));
vi.mock("@/lib/opportunities/repository", () => ({
  fetchOpportunityDetail,
  fetchOpportunityHistory,
  fetchOpportunityQuotes,
}));
vi.mock("@/lib/opportunities/assignment", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/opportunities/assignment")>();
  return { ...actual, assignOpportunity };
});
vi.mock("@/lib/ui/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const opportunityId = "11111111-1111-4111-8111-111111111111";
const orgOne: Workspace = {
  type: "organization",
  organizationId: "org-one",
  name: "Organization One",
};
const orgTwo: Workspace = {
  type: "organization",
  organizationId: "org-two",
  name: "Organization Two",
};

const detail: OpportunityDetail = {
  id: opportunityId,
  title: "Workspace assignment",
  serviceType: "HVAC",
  origin: "direct",
  status: "new",
  description: null,
  assignedUserId: "user-owner",
  customer: null,
  property: null,
  marketplaceContext: null,
  openedAt: null,
  declinedAt: null,
  closedAt: null,
  createdAt: "2026-07-28T10:00:00Z",
  updatedAt: "2026-07-28T11:00:00Z",
};

const members = [
  {
    id: "membership-owner",
    userId: "user-owner",
    email: "owner@example.com",
    displayName: "Olivia Owner",
    role: "owner" as const,
    joinedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "membership-member",
    userId: "user-member",
    email: "member@example.com",
    displayName: "Morgan Member",
    role: "member" as const,
    joinedAt: "2026-07-02T00:00:00Z",
  },
];

function workspaceValue(workspace: Workspace, role: "owner" | "member") {
  return {
    workspace,
    memberships: workspace.type === "organization"
      ? [{
          organizationId: workspace.organizationId,
          organizationName: workspace.name,
          role,
        }]
      : [],
    isLoading: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: {
      id: "user-owner",
      email: "owner@example.com",
      user_metadata: { full_name: "Olivia Owner" },
    },
  });
  mockUseWorkspace.mockReturnValue(workspaceValue(orgOne, "owner"));
  fetchOrganizationMembers.mockResolvedValue(members);
  fetchOpportunityHistory.mockResolvedValue([]);
  fetchOpportunityQuotes.mockResolvedValue([]);
  fetchOpportunityAssignmentHistory.mockResolvedValue([]);
  fetchOpportunityDetail.mockResolvedValue(detail);
});

afterEach(cleanup);

describe("OpportunityDetailWorkspace assignment coordination", () => {
  it("ignores a stale detail response after a rapid workspace switch", async () => {
    const oldRequest = deferred<OpportunityDetail | null>();
    fetchOpportunityDetail.mockImplementation(
      (_userId: string, workspace: Workspace) =>
        workspace.type === "organization" &&
        workspace.organizationId === "org-one"
          ? oldRequest.promise
          : Promise.resolve(null)
    );

    const view = render(
      <OpportunityDetailWorkspace opportunityId={opportunityId} />
    );
    mockUseWorkspace.mockReturnValue(workspaceValue(orgTwo, "member"));
    view.rerender(<OpportunityDetailWorkspace opportunityId={opportunityId} />);

    expect(await screen.findByRole("heading", {
      name: "Opportunity not found",
    })).toBeInTheDocument();
    oldRequest.resolve(detail);
    await waitFor(() => {
      expect(screen.getByRole("heading", {
        name: "Opportunity not found",
      })).toBeInTheDocument();
    });
    expect(screen.queryByRole("combobox", {
      name: "Assign opportunity",
    })).not.toBeInTheDocument();
    expect(fetchOpportunityAssignmentHistory).toHaveBeenCalledWith(
      "user-owner",
      orgTwo,
      opportunityId,
      25
    );
  });

  it("discards the previous workspace role and member controls", async () => {
    const view = render(
      <OpportunityDetailWorkspace opportunityId={opportunityId} />
    );
    expect(await screen.findByRole("combobox", {
      name: "Assign opportunity",
    })).toBeInTheDocument();

    mockUseWorkspace.mockReturnValue(workspaceValue(orgTwo, "member"));
    fetchOpportunityDetail.mockResolvedValueOnce({
      ...detail,
      assignedUserId: null,
    });
    view.rerender(<OpportunityDetailWorkspace opportunityId={opportunityId} />);

    expect(await screen.findByRole("button", {
      name: "Assign to me",
    })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", {
      name: "Assign opportunity",
    })).not.toBeInTheDocument();
  });

  it("refreshes assignment history once after success without resetting status", async () => {
    const user = userEvent.setup();
    fetchOpportunityAssignmentHistory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: "assignment-history-1",
        previousAssignedUserId: "user-owner",
        newAssignedUserId: "user-member",
        actorUserId: "user-owner",
        sourceSystem: "vendor_os",
        reason: null,
        occurredAt: "2026-07-28T12:00:00Z",
      }]);
    fetchOpportunityHistory.mockResolvedValueOnce([{
      id: "status-history-1",
      fromStatus: null,
      toStatus: "new",
      actorUserId: null,
      sourceSystem: "vendor_os",
      reason: null,
      occurredAt: "2026-07-28T10:00:00Z",
    }]);
    assignOpportunity.mockResolvedValueOnce({
      opportunityId,
      assignedUserId: "user-member",
      updatedAt: "2026-07-28T12:00:00Z",
      historyId: "assignment-history-1",
      occurredAt: "2026-07-28T12:00:00Z",
    });
    render(<OpportunityDetailWorkspace opportunityId={opportunityId} />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Assign opportunity" }),
      "user-member"
    );
    expect(await screen.findByText(
      "Reassigned · Olivia Owner → Morgan Member"
    )).toBeInTheDocument();
    expect(screen.getAllByText(
      "Reassigned · Olivia Owner → Morgan Member"
    )).toHaveLength(1);
    expect(screen.getByText("Created as New")).toBeInTheDocument();
    expect(fetchOpportunityAssignmentHistory).toHaveBeenCalledTimes(2);
    expect(fetchOpportunityHistory).toHaveBeenCalledTimes(1);
  });

  it("keeps assignment success authoritative when history refresh fails", async () => {
    const user = userEvent.setup();
    fetchOpportunityAssignmentHistory
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("raw SQL UUID details"))
      .mockResolvedValueOnce([]);
    assignOpportunity.mockResolvedValueOnce({
      opportunityId,
      assignedUserId: "user-member",
      updatedAt: "2026-07-28T12:00:00Z",
      historyId: "assignment-history-1",
      occurredAt: "2026-07-28T12:00:00Z",
    });
    render(<OpportunityDetailWorkspace opportunityId={opportunityId} />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Assign opportunity" }),
      "user-member"
    );
    expect((await screen.findAllByText("Morgan Member")).length)
      .toBeGreaterThan(0);
    expect(screen.getByText(
      "Assignment history is temporarily unavailable."
    )).toBeInTheDocument();
    expect(screen.queryByText(/raw SQL|UUID details/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {
      name: "Retry assignment history",
    }));
    await waitFor(() => {
      expect(screen.queryByText(
        "Assignment history is temporarily unavailable."
      )).not.toBeInTheDocument();
    });
    expect(fetchOpportunityAssignmentHistory).toHaveBeenCalledTimes(3);
  });
});
