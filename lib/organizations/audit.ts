import { getSupabaseClient } from "@/lib/supabase/client";
import type { OrganizationRole } from "./types";
import { formatOrganizationRole } from "./types";

export type OrganizationAuditAction =
  | "ownership_transferred"
  | "role_changed"
  | "member_removed"
  | "invite_sent"
  | "invite_canceled"
  | "invite_accepted"
  | "quote_accepted";

export interface OrganizationAuditEntry {
  id: string;
  action: OrganizationAuditAction;
  actorUserId: string | null;
  actorEmail: string | null;
  actorDisplayName: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  targetDisplayName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FormattedAuditEntry {
  title: string;
  detail: string;
}

interface OrganizationAuditRow {
  id: string;
  action: OrganizationAuditAction;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  target_user_id: string | null;
  target_email: string | null;
  target_display_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function rowToAuditEntry(row: OrganizationAuditRow): OrganizationAuditEntry {
  return {
    id: row.id,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    actorDisplayName: row.actor_display_name,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    targetDisplayName: row.target_display_name,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function getAuditPersonLabel(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const name = displayName?.trim();
  if (name) return name;
  if (email?.trim()) return email.trim();
  return "Unknown user";
}

export function formatAuditTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function metadataRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value === "owner" || value === "admin" || value === "member") {
    return formatOrganizationRole(value as OrganizationRole).toLowerCase();
  }
  return value;
}

export function formatAuditEntry(entry: OrganizationAuditEntry): FormattedAuditEntry {
  const actor = getAuditPersonLabel(entry.actorDisplayName, entry.actorEmail);
  const target = getAuditPersonLabel(entry.targetDisplayName, entry.targetEmail);
  const email =
    typeof entry.metadata.email === "string" ? entry.metadata.email : null;

  switch (entry.action) {
    case "ownership_transferred":
      return {
        title: "Ownership transferred",
        detail: `${actor} transferred ownership to ${target}.`,
      };
    case "role_changed": {
      const previousRole = metadataRole(entry.metadata.previous_role);
      const newRole = metadataRole(entry.metadata.new_role);
      return {
        title: "Role changed",
        detail:
          previousRole && newRole
            ? `${actor} changed ${target}'s role from ${previousRole} to ${newRole}.`
            : `${actor} changed ${target}'s role.`,
      };
    }
    case "member_removed": {
      const previousRole = metadataRole(entry.metadata.previous_role);
      return {
        title: "Member removed",
        detail: previousRole
          ? `${actor} removed ${target} (${previousRole}).`
          : `${actor} removed ${target} from the team.`,
      };
    }
    case "invite_sent": {
      const role = metadataRole(entry.metadata.role);
      return {
        title: "Invite sent",
        detail: role
          ? `${actor} invited ${email ?? "a teammate"} as ${role}.`
          : `${actor} invited ${email ?? "a teammate"}.`,
      };
    }
    case "invite_canceled": {
      const role = metadataRole(entry.metadata.role);
      return {
        title: "Invite canceled",
        detail: role
          ? `${actor} canceled the invite for ${email ?? "a teammate"} (${role}).`
          : `${actor} canceled the invite for ${email ?? "a teammate"}.`,
      };
    }
    case "invite_accepted": {
      const role = metadataRole(entry.metadata.role);
      return {
        title: "Invite accepted",
        detail: role
          ? `${target} joined the team as ${role}.`
          : `${target} joined the team.`,
      };
    }
    case "quote_accepted": {
      const ref =
        typeof entry.metadata.quote_reference === "string"
          ? entry.metadata.quote_reference
          : null;
      const jobName =
        typeof entry.metadata.job_name === "string"
          ? entry.metadata.job_name
          : null;
      const signerName =
        typeof entry.metadata.signer_name === "string"
          ? entry.metadata.signer_name
          : null;
      const refLabel = ref ? ` (${ref})` : "";
      const jobLabel = jobName ? ` — "${jobName}"` : "";
      const signerLabel = signerName ? ` by ${signerName}` : "";
      return {
        title: "Quote accepted",
        detail: `Quote${refLabel}${jobLabel} was accepted${signerLabel}.`,
      };
    }
    default:
      return {
        title: "Team activity",
        detail: `${actor} performed an action.`,
      };
  }
}

export async function fetchOrganizationAuditLog(
  organizationId: string,
  limit = 50
): Promise<OrganizationAuditEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_organization_audit_log", {
    p_organization_id: organizationId,
    p_limit: limit,
  });

  if (error) throw error;
  return ((data ?? []) as OrganizationAuditRow[]).map(rowToAuditEntry);
}