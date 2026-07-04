import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CreatedOrganizationInvite,
  InvitableRole,
  OrganizationInvite,
  OrganizationInvitePreview,
} from "./types";

interface OrganizationInviteRow {
  id: string;
  organization_id: string;
  email: string;
  role: InvitableRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface InvitePreviewRow {
  organization_id: string;
  organization_name: string;
  email: string;
  role: InvitableRole;
  expires_at: string;
  accepted_at: string | null;
  is_expired: boolean;
  is_valid: boolean;
}

interface CreatedInviteRow {
  id: string;
  token: string;
  expires_at: string;
}

interface AcceptedInviteRow {
  organization_id: string;
  organization_name: string;
}

function rowToInvite(row: OrganizationInviteRow): OrganizationInvite {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  };
}

export async function fetchPendingInvites(
  organizationId: string
): Promise<OrganizationInvite[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as OrganizationInviteRow[]).map(rowToInvite);
}

export async function createOrganizationInvite(
  organizationId: string,
  email: string,
  role: InvitableRole = "member"
): Promise<CreatedOrganizationInvite> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("create_organization_invite", {
    p_organization_id: organizationId,
    p_email: email.trim(),
    p_role: role,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Invite was not created");

  const created = row as CreatedInviteRow;
  return {
    id: created.id,
    token: created.token,
    expiresAt: created.expires_at,
  };
}

export async function cancelOrganizationInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("cancel_organization_invite", {
    p_invite_id: inviteId,
  });
  if (error) throw error;
}

export async function fetchOrganizationInvitePreview(
  token: string
): Promise<OrganizationInvitePreview | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_organization_invite_preview", {
    p_token: token,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const preview = row as InvitePreviewRow;
  return {
    organizationId: preview.organization_id,
    organizationName: preview.organization_name,
    email: preview.email,
    role: preview.role,
    expiresAt: preview.expires_at,
    acceptedAt: preview.accepted_at,
    isExpired: preview.is_expired,
    isValid: preview.is_valid,
  };
}

export async function acceptOrganizationInvite(
  token: string
): Promise<{ organizationId: string; organizationName: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("accept_organization_invite", {
    p_token: token,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Invite could not be accepted");

  const accepted = row as AcceptedInviteRow;
  return {
    organizationId: accepted.organization_id,
    organizationName: accepted.organization_name,
  };
}