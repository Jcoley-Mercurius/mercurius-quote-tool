import { describe, expect, it } from "vitest";
import {
  canChangeOrganizationMemberRole,
  canManageOrganizationInvites,
  canManageOrganizationMembers,
  canRemoveOrganizationMember,
  canTransferOrganizationOwnership,
  countOrganizationOwners,
  formatOrganizationRole,
  getOrganizationMemberLabel,
  getTransferOwnershipCandidates,
  isValidInviteEmail,
  normalizeInviteEmail,
  parseStoredWorkspace,
  workspaceKey,
  workspaceLabel,
  type OrganizationMember,
  type OrganizationMembership,
} from "./types";

const memberships: OrganizationMembership[] = [
  {
    organizationId: "org-1",
    organizationName: "Cape Team",
    role: "owner",
  },
  {
    organizationId: "org-2",
    organizationName: "Fort Myers Crew",
    role: "member",
  },
];

describe("workspaceKey", () => {
  it("returns personal key for personal workspace", () => {
    expect(workspaceKey({ type: "personal" })).toBe("personal");
  });

  it("returns org key for organization workspace", () => {
    expect(
      workspaceKey({
        type: "organization",
        organizationId: "org-1",
        name: "Cape Team",
      })
    ).toBe("org:org-1");
  });
});

describe("workspaceLabel", () => {
  it("labels personal workspace", () => {
    expect(workspaceLabel({ type: "personal" })).toBe("Personal");
  });

  it("labels organization workspace with name", () => {
    expect(
      workspaceLabel({
        type: "organization",
        organizationId: "org-1",
        name: "Cape Team",
      })
    ).toBe("Cape Team");
  });
});

describe("parseStoredWorkspace", () => {
  it("defaults to personal when storage is empty", () => {
    expect(parseStoredWorkspace(null, memberships)).toEqual({ type: "personal" });
  });

  it("restores organization workspace from storage", () => {
    expect(parseStoredWorkspace("org:org-2", memberships)).toEqual({
      type: "organization",
      organizationId: "org-2",
      name: "Fort Myers Crew",
    });
  });

  it("falls back to personal when stored org is not a membership", () => {
    expect(parseStoredWorkspace("org:missing", memberships)).toEqual({
      type: "personal",
    });
  });
});

describe("invite helpers", () => {
  it("normalizes invite emails", () => {
    expect(normalizeInviteEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("validates invite emails", () => {
    expect(isValidInviteEmail("contractor@example.com")).toBe(true);
    expect(isValidInviteEmail("not-an-email")).toBe(false);
  });

  it("allows owners and admins to manage invites", () => {
    expect(canManageOrganizationInvites("owner")).toBe(true);
    expect(canManageOrganizationInvites("admin")).toBe(true);
    expect(canManageOrganizationInvites("member")).toBe(false);
  });
});

const sampleMembers: OrganizationMember[] = [
  {
    id: "m-1",
    userId: "u-owner",
    email: "owner@example.com",
    displayName: "Taylor Owner",
    role: "owner",
    joinedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "m-2",
    userId: "u-admin",
    email: "admin@example.com",
    displayName: null,
    role: "admin",
    joinedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "m-3",
    userId: "u-member",
    email: "member@example.com",
    displayName: "Casey Member",
    role: "member",
    joinedAt: "2026-03-01T00:00:00.000Z",
  },
];

describe("organization member helpers", () => {
  it("allows owners and admins to manage members", () => {
    expect(canManageOrganizationMembers("owner")).toBe(true);
    expect(canManageOrganizationMembers("admin")).toBe(true);
    expect(canManageOrganizationMembers("member")).toBe(false);
  });

  it("labels members with display name or email", () => {
    expect(getOrganizationMemberLabel(sampleMembers[0])).toBe("Taylor Owner");
    expect(getOrganizationMemberLabel(sampleMembers[1])).toBe("admin@example.com");
  });

  it("counts organization owners", () => {
    expect(countOrganizationOwners(sampleMembers)).toBe(1);
  });

  it("formats organization roles", () => {
    expect(formatOrganizationRole("admin")).toBe("Admin");
  });

  it("prevents changing owner roles", () => {
    expect(
      canChangeOrganizationMemberRole("u-admin", sampleMembers[0], 1)
    ).toBe(false);
    expect(
      canChangeOrganizationMemberRole("u-admin", sampleMembers[2], 1)
    ).toBe(true);
  });

  it("prevents removing owners and sole owners", () => {
    expect(
      canRemoveOrganizationMember("u-admin", sampleMembers[0], 1)
    ).toBe(false);
    expect(
      canRemoveOrganizationMember("u-owner", sampleMembers[0], 1)
    ).toBe(false);
    expect(
      canRemoveOrganizationMember("u-admin", sampleMembers[2], 1)
    ).toBe(true);
  });

  it("allows only owners to transfer ownership", () => {
    expect(canTransferOrganizationOwnership("owner")).toBe(true);
    expect(canTransferOrganizationOwnership("admin")).toBe(false);
    expect(canTransferOrganizationOwnership("member")).toBe(false);
  });

  it("lists transfer candidates excluding self and owners", () => {
    expect(getTransferOwnershipCandidates(sampleMembers, "u-owner")).toEqual([
      sampleMembers[1],
      sampleMembers[2],
    ]);
    expect(getTransferOwnershipCandidates(sampleMembers, "u-admin")).toEqual([
      sampleMembers[2],
    ]);
  });
});