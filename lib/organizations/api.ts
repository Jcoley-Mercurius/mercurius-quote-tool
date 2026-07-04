import { getSupabaseClient } from "@/lib/supabase/client";
import { isMissingOrganizationsSchema } from "./errors";
import type { OrganizationMembership } from "./types";

interface OrganizationSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMemberRow {
  role: OrganizationMembership["role"];
  organization: OrganizationSummary | OrganizationSummary[] | null;
}

interface UserOrganizationRow {
  organization_id: string;
  organization_name: string;
  role: OrganizationMembership["role"];
}

async function fetchUserOrganizationsViaRpc(): Promise<OrganizationMembership[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_user_organizations");

  if (error) throw error;

  return ((data ?? []) as UserOrganizationRow[]).map((row) => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    role: row.role,
  }));
}

async function fetchUserOrganizationsViaQuery(
  userId: string
): Promise<OrganizationMembership[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
        role,
        organization:organizations (
          id,
          name,
          created_at,
          updated_at
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as OrganizationMemberRow[])
    .map((row) => {
      const organization = Array.isArray(row.organization)
        ? row.organization[0]
        : row.organization;
      if (!organization) return null;
      return {
        organizationId: organization.id,
        organizationName: organization.name,
        role: row.role,
      };
    })
    .filter((row): row is OrganizationMembership => row !== null);
}

export async function fetchUserOrganizations(
  userId: string
): Promise<OrganizationMembership[]> {
  try {
    return await fetchUserOrganizationsViaRpc();
  } catch (rpcError) {
    if (isMissingOrganizationsSchema(rpcError)) {
      throw rpcError;
    }

    try {
      return await fetchUserOrganizationsViaQuery(userId);
    } catch (queryError) {
      if (isMissingOrganizationsSchema(queryError)) {
        throw queryError;
      }
      throw queryError;
    }
  }
}

export async function createOrganization(name: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: name.trim(),
  });

  if (error) throw error;
  if (!data) throw new Error("Organization was not created");

  return data as string;
}