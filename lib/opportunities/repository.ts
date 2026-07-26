import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import type {
  CustomerRow,
  OpportunityRow,
  PropertyRow,
} from "@/lib/supabase/types";
import {
  formatOpportunityTitle,
  formatPropertyAddress,
} from "./format";
import {
  ACTIVE_OPPORTUNITY_STATUSES,
  OPPORTUNITY_PAGE_SIZE,
  type OpportunityListFilters,
  type OpportunityListItem,
  type OpportunityPage,
} from "./types";

export const OPPORTUNITY_LIST_SELECT = `
  id, summary, service_type, origin, status, assigned_user_id, created_at, updated_at,
  customer:customers(id, display_name),
  property:properties(id, address_line1, address_line2, city, region, postal_code, country_code)
`;

type CustomerSummary = Pick<CustomerRow, "id" | "display_name">;
type PropertySummary = Pick<
  PropertyRow,
  | "id"
  | "address_line1"
  | "address_line2"
  | "city"
  | "region"
  | "postal_code"
  | "country_code"
>;

type OpportunityListRow = Pick<
  OpportunityRow,
  | "id"
  | "summary"
  | "service_type"
  | "origin"
  | "status"
  | "assigned_user_id"
  | "created_at"
  | "updated_at"
> & {
  customer: CustomerSummary | CustomerSummary[] | null;
  property: PropertySummary | PropertySummary[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function scopeQuery<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(query: T, userId: string, workspace: Workspace): T {
  return workspace.type === "organization"
    ? query.eq("organization_id", workspace.organizationId)
    : query.eq("user_id", userId).is("organization_id", null);
}

function applyFilters<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
  not: (column: string, operator: string, value: null) => T;
  in: (column: string, values: readonly string[]) => T;
}>(query: T, filters: OpportunityListFilters): T {
  if (filters.status === "active") {
    query = query.in("status", ACTIVE_OPPORTUNITY_STATUSES);
  } else if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.origin !== "all") {
    query = query.eq("origin", filters.origin);
  }
  if (filters.assignment === "assigned") {
    query = query.not("assigned_user_id", "is", null);
  } else if (filters.assignment === "unassigned") {
    query = query.is("assigned_user_id", null);
  }
  return query;
}

function mapRow(row: OpportunityListRow): OpportunityListItem {
  const customer = first(row.customer);
  const property = first(row.property);
  return {
    id: row.id,
    title: formatOpportunityTitle(row.summary, row.service_type),
    serviceType: row.service_type.trim() || "Service not specified",
    origin: row.origin,
    status: row.status,
    customerId: customer?.id ?? null,
    customerName: customer?.display_name?.trim() || null,
    propertyId: property?.id ?? null,
    propertyLabel: property ? formatPropertyAddress(property) : null,
    assignedUserId: row.assigned_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOpportunityPage(
  userId: string,
  workspace: Workspace,
  filters: OpportunityListFilters,
  requestedPage: number,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityPage> {
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  let filteredCountQuery = client.from("opportunities").select("id", {
    count: "exact",
    head: true,
  });
  filteredCountQuery = scopeQuery(filteredCountQuery, userId, workspace);
  filteredCountQuery = applyFilters(filteredCountQuery, filters);

  let totalQuery = client.from("opportunities").select("id", {
    count: "exact",
    head: true,
  });
  totalQuery = scopeQuery(totalQuery, userId, workspace);

  const [filteredCountResult, totalResult] = await Promise.all([
    filteredCountQuery,
    totalQuery,
  ]);

  if (filteredCountResult.error) throw filteredCountResult.error;
  if (totalResult.error) throw totalResult.error;
  if (filteredCountResult.count === null || totalResult.count === null) {
    throw new Error("Opportunity count unavailable");
  }

  const maximumPage = Math.max(
    1,
    Math.ceil(filteredCountResult.count / OPPORTUNITY_PAGE_SIZE)
  );
  const clampedPage = Math.min(page, maximumPage);
  const from = (clampedPage - 1) * OPPORTUNITY_PAGE_SIZE;
  let listQuery = client
    .from("opportunities")
    .select(OPPORTUNITY_LIST_SELECT);
  listQuery = scopeQuery(listQuery, userId, workspace);
  listQuery = applyFilters(listQuery, filters);
  const listResult = await listQuery
    .order("updated_at", { ascending: false })
    .range(from, from + OPPORTUNITY_PAGE_SIZE - 1);
  if (listResult.error) throw listResult.error;

  return {
    items: ((listResult.data ?? []) as unknown as OpportunityListRow[]).map(mapRow),
    page: clampedPage,
    pageSize: OPPORTUNITY_PAGE_SIZE,
    totalCount: filteredCountResult.count,
    workspaceTotalCount: totalResult.count,
  };
}
