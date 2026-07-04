export type OrganizationRole = "owner" | "admin" | "member";

/** Roles that can be assigned when inviting a new member */
export type InvitableRole = Extract<OrganizationRole, "admin" | "member">;

/** Roles that owners and admins can assign to existing members */
export type ManageableMemberRole = InvitableRole;

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: OrganizationRole;
  joinedAt: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: InvitableRole;
  token: string;
  invitedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface OrganizationInvitePreview {
  organizationId: string;
  organizationName: string;
  email: string;
  role: InvitableRole;
  expiresAt: string;
  acceptedAt: string | null;
  isExpired: boolean;
  isValid: boolean;
}

export interface CreatedOrganizationInvite {
  id: string;
  token: string;
  expiresAt: string;
}

export function canManageOrganizationInvites(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageOrganizationMembers(role: OrganizationRole): boolean {
  return canManageOrganizationInvites(role);
}

export function canTransferOrganizationOwnership(
  role: OrganizationRole
): boolean {
  return role === "owner";
}

export function getTransferOwnershipCandidates(
  members: OrganizationMember[],
  actorUserId: string
): OrganizationMember[] {
  return members.filter(
    (member) =>
      member.userId !== actorUserId && member.role !== "owner"
  );
}

export function getOrganizationMemberLabel(member: OrganizationMember): string {
  const name = member.displayName?.trim();
  if (name) return name;
  return member.email;
}

export function countOrganizationOwners(members: OrganizationMember[]): number {
  return members.filter((member) => member.role === "owner").length;
}

export function canChangeOrganizationMemberRole(
  actorUserId: string,
  member: OrganizationMember,
  ownerCount: number
): boolean {
  if (member.role === "owner") return false;
  if (member.userId === actorUserId && ownerCount === 1) return false;
  return true;
}

export function canRemoveOrganizationMember(
  actorUserId: string,
  member: OrganizationMember,
  ownerCount: number
): boolean {
  if (member.role === "owner" && member.userId !== actorUserId) return false;
  if (member.userId === actorUserId && member.role === "owner" && ownerCount <= 1) {
    return false;
  }
  return true;
}

export function formatOrganizationRole(role: OrganizationRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  const normalized = normalizeInviteEmail(email);
  return normalized.length >= 3 && normalized.includes("@");
}

export function buildInviteUrl(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
}

export type Workspace =
  | { type: "personal" }
  | { type: "organization"; organizationId: string; name: string };

export function workspaceKey(workspace: Workspace): string {
  return workspace.type === "personal"
    ? "personal"
    : `org:${workspace.organizationId}`;
}

export function workspaceLabel(workspace: Workspace): string {
  return workspace.type === "personal" ? "Personal" : workspace.name;
}

export function parseStoredWorkspace(
  raw: string | null,
  memberships: OrganizationMembership[]
): Workspace {
  if (!raw || raw === "personal") {
    return { type: "personal" };
  }

  if (raw.startsWith("org:")) {
    const organizationId = raw.slice(4);
    const membership = memberships.find(
      (m) => m.organizationId === organizationId
    );
    if (membership) {
      return {
        type: "organization",
        organizationId,
        name: membership.organizationName,
      };
    }
  }

  return { type: "personal" };
}