import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerDirectoryPage } from "@/lib/customers/types";
import type { Workspace } from "@/lib/organizations/types";
import { CustomerDirectory } from "./CustomerDirectory";

const { fetchCustomerDirectoryPage, mockUseAuth, mockUseWorkspace } = vi.hoisted(
  () => ({
    fetchCustomerDirectoryPage: vi.fn(),
    mockUseAuth: vi.fn(),
    mockUseWorkspace: vi.fn(),
  })
);

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/components/organizations/WorkspaceProvider", () => ({
  useWorkspace: () => mockUseWorkspace(),
}));
vi.mock("@/lib/customers/repository", () => ({
  fetchCustomerDirectoryPage,
}));

const orgOne: Workspace = {
  type: "organization",
  organizationId: "org-one",
  name: "One",
};
const orgTwo: Workspace = {
  type: "organization",
  organizationId: "org-two",
  name: "Two",
};

function page(name: string): CustomerDirectoryPage {
  return {
    items: [{
      id: name === "Old Customer"
        ? "11111111-1111-4111-8111-111111111111"
        : "22222222-2222-4222-8222-222222222222",
      displayName: name,
      email: null,
      phone: null,
      preferredContactMethod: null,
      source: "direct",
      primaryProperty: null,
      openOpportunityCount: 0,
      linkedQuoteCount: 0,
      latestActivityAt: "2026-07-25T10:00:00Z",
      createdAt: "2026-07-25T10:00:00Z",
      updatedAt: "2026-07-25T10:00:00Z",
    }],
    nextCursor: null,
    resultCount: 1,
    aggregatesComplete: true,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  return {
    promise: new Promise<T>((next) => {
      resolve = next;
    }),
    resolve,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: "user-1", email: "owner@example.com", user_metadata: {} },
  });
  mockUseWorkspace.mockReturnValue({ workspace: orgOne, isLoading: false });
});

afterEach(cleanup);

describe("CustomerDirectory workspace coordination", () => {
  it("rejects a late previous-workspace response during rapid switching", async () => {
    const oldRequest = deferred<CustomerDirectoryPage>();
    fetchCustomerDirectoryPage.mockImplementation(
      (_userId: string, workspace: Workspace) =>
        workspace.type === "organization" &&
        workspace.organizationId === "org-one"
          ? oldRequest.promise
          : Promise.resolve(page("Current Customer"))
    );

    const view = render(<CustomerDirectory />);
    mockUseWorkspace.mockReturnValue({ workspace: orgTwo, isLoading: false });
    view.rerender(<CustomerDirectory />);

    expect(await screen.findByRole("link", {
      name: "Current Customer",
    })).toBeInTheDocument();
    oldRequest.resolve(page("Old Customer"));
    await waitFor(() => {
      expect(screen.queryByText("Old Customer")).not.toBeInTheDocument();
    });
    expect(fetchCustomerDirectoryPage).toHaveBeenCalledWith(
      "user-1",
      orgTwo,
      "",
      null
    );
  });
});
