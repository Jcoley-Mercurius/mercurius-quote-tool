import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CustomerRow,
  OpportunityRow,
  PropertyRow,
} from "@/lib/supabase/types";
import type { Workspace } from "@/lib/organizations/types";
import type {
  DashboardRepositoryData,
  MetricResult,
  OpportunitySummary,
} from "./types";

type OpportunityQueryRow = Pick<
  OpportunityRow,
  | "id"
  | "origin"
  | "status"
  | "service_type"
  | "summary"
  | "assigned_user_id"
  | "created_at"
  | "updated_at"
> & {
  customer:
    | Pick<CustomerRow, "display_name">
    | Pick<CustomerRow, "display_name">[]
    | null;
  property:
    | Pick<PropertyRow, "address_line1" | "city" | "region">
    | Pick<PropertyRow, "address_line1" | "city" | "region">[]
    | null;
};

function scopeQuery<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(
  query: T,
  userId: string,
  workspace: Workspace
): T {
  return workspace.type === "organization"
    ? query.eq("organization_id", workspace.organizationId)
    : query.eq("user_id", userId).is("organization_id", null);
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function propertyLabel(property: OpportunityQueryRow["property"]): string | null {
  const row = first(property);
  if (!row) return null;
  const locality = [row.city, row.region].filter(Boolean).join(", ");
  return [row.address_line1, locality].filter(Boolean).join(" · ") || null;
}

function toOpportunitySummary(row: OpportunityQueryRow): OpportunitySummary {
  const customer = first(row.customer);
  return {
    id: row.id,
    title: row.summary.trim() || row.service_type.trim() || "Opportunity",
    origin: row.origin,
    status: row.status,
    customerName: customer?.display_name?.trim() || null,
    propertyLabel: propertyLabel(row.property),
    assignedUserId: row.assigned_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function safely<T>(
  operation: () => Promise<T>,
  message: string
): Promise<MetricResult<T>> {
  try {
    return { status: "ready", value: await operation() };
  } catch {
    return { status: "error", message };
  }
}

export async function fetchDashboardData(
  userId: string,
  workspace: Workspace
): Promise<DashboardRepositoryData> {
  const supabase = getSupabaseClient();

  const opportunities = safely(async () => {
    let query = supabase.from("opportunities").select(`
      id, origin, status, service_type, summary, assigned_user_id, created_at, updated_at,
      customer:customers(display_name),
      property:properties(address_line1, city, region)
    `);
    query = scopeQuery(query, userId, workspace);
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return ((data ?? []) as unknown as OpportunityQueryRow[]).map(
      toOpportunitySummary
    );
  }, "Opportunities could not be loaded.");

  const count = (
    table: "customers" | "properties",
    message: string
  ): Promise<MetricResult<number>> =>
    safely(async () => {
      let query = supabase.from(table).select("id", {
        count: "exact",
        head: true,
      });
      query = scopeQuery(query, userId, workspace);
      const { count: value, error } = await query;
      if (error) throw error;
      if (value === null) throw new Error("Count unavailable");
      return value;
    }, message);

  const opportunityCount = (
    message: string,
    filter: "new" | "open" | "unassigned"
  ): Promise<MetricResult<number>> =>
    safely(async () => {
      let query = supabase.from("opportunities").select("id", {
        count: "exact",
        head: true,
      });
      query = scopeQuery(query, userId, workspace);
      if (filter === "new") {
        query = query.eq("status", "new");
      } else if (filter === "open") {
        query = query.in("status", ["new", "opened", "quoting", "quoted"]);
      } else {
        query = query.is("assigned_user_id", null);
      }
      const { count: value, error } = await query;
      if (error) throw error;
      if (value === null) throw new Error("Count unavailable");
      return value;
    }, message);

  const [
    opportunitiesResult,
    newOpportunityCount,
    openOpportunityCount,
    unassignedOpportunityCount,
    customerCount,
    propertyCount,
  ] = await Promise.all([
    opportunities,
    opportunityCount(
      "New opportunity count could not be loaded.",
      "new"
    ),
    opportunityCount(
      "Open opportunity count could not be loaded.",
      "open"
    ),
    opportunityCount(
      "Unassigned opportunity count could not be loaded.",
      "unassigned"
    ),
    count("customers", "Customer count could not be loaded."),
    count("properties", "Property count could not be loaded."),
  ]);

  return {
    opportunities: opportunitiesResult,
    newOpportunityCount,
    openOpportunityCount,
    unassignedOpportunityCount,
    customerCount,
    propertyCount,
  };
}
