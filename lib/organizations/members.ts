import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  ManageableMemberRole,
  OrganizationMember,
  OrganizationRole,
} from "./types";

interface OrganizationMemberRow {
  member_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: OrganizationRole;
  joined_at: string;
}

function rowToMember(row: OrganizationMemberRow): OrganizationMember {
  return {
    id: row.member_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

export async function fetchOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_organization_members", {
    p_organization_id: organizationId,
  });

  if (error) throw error;
  return ((data ?? []) as OrganizationMemberRow[]).map(rowToMember);
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: ManageableMemberRole
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("update_organization_member_role", {
    p_member_id: memberId,
    p_role: role,
  });
  if (error) throw error;
}

export async function removeOrganizationMember(memberId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("remove_organization_member", {
    p_member_id: memberId,
  });
  if (error) throw error;
}

export async function transferOrganizationOwnership(
  memberId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("transfer_organization_ownership", {
    p_member_id: memberId,
  });
  if (error) throw error;
}