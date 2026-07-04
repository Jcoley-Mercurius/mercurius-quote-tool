import { friendlyError } from "@/lib/errors/messages";

const MISSING_SCHEMA_PATTERNS = [
  /could not find the table ['"]?public\.organization/i,
  /could not find the function public\.(create_organization|get_user_organizations|get_organization_members|transfer_organization_ownership|get_organization_audit_log)/i,
  /could not find the table ['"]?public\.organization_audit_log/i,
  /relation ["']?public\.organization/i,
  /relation ["']?organization_members/i,
];

export function isMissingOrganizationsSchema(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return MISSING_SCHEMA_PATTERNS.some((pattern) => pattern.test(message));
}

export function organizationsErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (isMissingOrganizationsSchema(error)) {
    return "Team workspaces are not set up in Supabase yet. Run migrations 003_organizations.sql and 004_organization_invites.sql in the SQL Editor.";
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : fallback;

  if (/not authenticated/i.test(raw)) {
    return "Sign in to manage organizations.";
  }

  if (/organization name is required/i.test(raw)) {
    return "Enter an organization name.";
  }

  if (/only organization owners and admins can/i.test(raw)) {
    return "Only organization owners and admins can manage team members.";
  }

  if (/organization owner role cannot be changed/i.test(raw)) {
    return "The organization owner role cannot be changed.";
  }

  if (/organization owner cannot be removed/i.test(raw)) {
    return "The organization owner cannot be removed.";
  }

  if (/only owner/i.test(raw)) {
    return "You cannot do this while you are the only owner.";
  }

  if (/not a member of this organization/i.test(raw)) {
    return "You are not a member of this organization.";
  }

  if (/only the organization owner can transfer ownership/i.test(raw)) {
    return "Only the organization owner can transfer ownership.";
  }

  if (/cannot transfer ownership to yourself/i.test(raw)) {
    return "Choose another team member to receive ownership.";
  }

  if (/already the organization owner/i.test(raw)) {
    return "This member is already the organization owner.";
  }

  return friendlyError(error, fallback);
}