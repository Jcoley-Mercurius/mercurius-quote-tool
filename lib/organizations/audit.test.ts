import { describe, expect, it } from "vitest";
import {
  formatAuditEntry,
  formatAuditTimestamp,
  getAuditPersonLabel,
  type OrganizationAuditEntry,
} from "./audit";

const baseEntry: OrganizationAuditEntry = {
  id: "a-1",
  action: "role_changed",
  actorUserId: "u-1",
  actorEmail: "admin@example.com",
  actorDisplayName: "Alex Admin",
  targetUserId: "u-2",
  targetEmail: "member@example.com",
  targetDisplayName: "Casey Member",
  metadata: {
    previous_role: "member",
    new_role: "admin",
  },
  createdAt: "2026-06-20T16:00:00.000Z",
};

describe("audit helpers", () => {
  it("labels people with display name or email", () => {
    expect(getAuditPersonLabel("Taylor Owner", "owner@example.com")).toBe(
      "Taylor Owner"
    );
    expect(getAuditPersonLabel(null, "owner@example.com")).toBe("owner@example.com");
    expect(getAuditPersonLabel(null, null)).toBe("Unknown user");
  });

  it("formats role changes", () => {
    expect(formatAuditEntry(baseEntry)).toEqual({
      title: "Role changed",
      detail: "Alex Admin changed Casey Member's role from member to admin.",
    });
  });

  it("formats invite actions with metadata email", () => {
    expect(
      formatAuditEntry({
        ...baseEntry,
        action: "invite_sent",
        targetUserId: null,
        targetEmail: null,
        targetDisplayName: null,
        metadata: { email: "new@example.com", role: "member" },
      })
    ).toEqual({
      title: "Invite sent",
      detail: "Alex Admin invited new@example.com as member.",
    });
  });

  it("formats ownership transfers", () => {
    expect(
      formatAuditEntry({
        ...baseEntry,
        action: "ownership_transferred",
      })
    ).toEqual({
      title: "Ownership transferred",
      detail: "Alex Admin transferred ownership to Casey Member.",
    });
  });

  it("formats timestamps", () => {
    expect(formatAuditTimestamp("2026-06-20T16:00:00.000Z")).toMatch(/Jun/);
  });
});