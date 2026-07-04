import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  createOrganization: vi.fn(),
  fetchUserOrganizations: vi.fn(),
}));

import { fetchUserOrganizations } from "./api";
import {
  clearWorkspaceStore,
  getWorkspaceHydrateErrorSnapshot,
  getWorkspaceMembershipsSnapshot,
  hydrateWorkspaceStore,
} from "./store";

describe("hydrateWorkspaceStore", () => {
  beforeEach(() => {
    clearWorkspaceStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearWorkspaceStore();
  });

  it("surfaces a friendly error when organization loading fails", async () => {
    vi.mocked(fetchUserOrganizations).mockRejectedValueOnce(
      new Error("Network error. Check your connection and try again.")
    );

    await hydrateWorkspaceStore("user-123");

    expect(getWorkspaceMembershipsSnapshot()).toEqual([]);
    expect(getWorkspaceHydrateErrorSnapshot()).toMatch(/network error/i);
  });

  it("clears hydrate error after a successful retry", async () => {
    vi.mocked(fetchUserOrganizations)
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce([
        {
          organizationId: "org-1",
          organizationName: "Gulf Coast HVAC",
          role: "owner",
        },
      ]);

    await hydrateWorkspaceStore("user-123");
    expect(getWorkspaceHydrateErrorSnapshot()).toBeTruthy();

    await hydrateWorkspaceStore("user-123", { force: true });
    expect(getWorkspaceHydrateErrorSnapshot()).toBeNull();
    expect(getWorkspaceMembershipsSnapshot()).toHaveLength(1);
  });
});