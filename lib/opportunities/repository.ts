import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import type {
  CustomerRow,
  OpportunityStatusHistoryRow,
  OpportunityRow,
  PropertyRow,
  QuoteRow,
} from "@/lib/supabase/types";
import {
  formatOpportunityTitle,
  formatPropertyAddress,
  parseMarketplaceRequestContext,
} from "./format";
import {
  ACTIVE_OPPORTUNITY_STATUSES,
  OPPORTUNITY_PAGE_SIZE,
  type OpportunityListFilters,
  type OpportunityListItem,
  type OpportunityPage,
  type OpportunityDetail,
  type OpportunityHistoryItem,
  type OpportunityLinkedQuote,
} from "./types";

export const OPPORTUNITY_LIST_SELECT = `
  id, summary, service_type, origin, status, assigned_user_id, created_at, updated_at,
  customer:customers(id, display_name),
  property:properties(id, address_line1, address_line2, city, region, postal_code, country_code)
`;

export const OPPORTUNITY_DETAIL_SELECT = `
  id, origin, status, service_type, summary, description, assigned_user_id,
  source_snapshot, opened_at, declined_at, closed_at, created_at, updated_at,
  customer:customers(id, display_name, email, phone, preferred_contact_method),
  property:properties(id, address_line1, address_line2, city, region, postal_code, country_code)
`;

export const OPPORTUNITY_HISTORY_SELECT = `
  id, from_status, to_status, actor_user_id, source_system, reason_code, occurred_at,
  opportunity:opportunities!inner(id)
`;

export const OPPORTUNITY_QUOTES_SELECT =
  "id, reference, job_name, status, created_at, updated_at";

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

type DetailCustomer = Pick<
  CustomerRow,
  "id" | "display_name" | "email" | "phone" | "preferred_contact_method"
>;
type DetailProperty = PropertySummary;
type OpportunityDetailRow = Pick<
  OpportunityRow,
  | "id" | "origin" | "status" | "service_type" | "summary" | "description"
  | "assigned_user_id" | "source_snapshot" | "opened_at" | "declined_at"
  | "closed_at" | "created_at" | "updated_at"
> & {
  customer: DetailCustomer | DetailCustomer[] | null;
  property: DetailProperty | DetailProperty[] | null;
};

function mapDetail(row: OpportunityDetailRow): OpportunityDetail {
  const customer = first(row.customer);
  const property = first(row.property);
  return {
    id: row.id,
    title: formatOpportunityTitle(row.summary, row.service_type),
    serviceType: row.service_type.trim() || "Service not specified",
    origin: row.origin,
    status: row.status,
    description: row.description.trim() || null,
    assignedUserId: row.assigned_user_id,
    customer: customer ? {
      id: customer.id,
      displayName: customer.display_name.trim() || null,
      email: customer.email?.trim() || null,
      phone: customer.phone?.trim() || null,
      preferredContactMethod: customer.preferred_contact_method,
    } : null,
    property: property ? {
      id: property.id,
      addressLine1: property.address_line1,
      addressLine2: property.address_line2,
      city: property.city,
      region: property.region,
      postalCode: property.postal_code,
      countryCode: property.country_code,
    } : null,
    marketplaceContext: row.origin === "marketplace"
      ? parseMarketplaceRequestContext(row.source_snapshot)
      : null,
    openedAt: row.opened_at,
    declinedAt: row.declined_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOpportunityDetail(
  userId: string,
  workspace: Workspace,
  opportunityId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityDetail | null> {
  let query = client.from("opportunities")
    .select(OPPORTUNITY_DETAIL_SELECT)
    .eq("id", opportunityId);
  query = scopeQuery(query, userId, workspace);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapDetail(data as unknown as OpportunityDetailRow) : null;
}

function scopeRelatedOpportunity<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(query: T, userId: string, workspace: Workspace): T {
  return workspace.type === "organization"
    ? query.eq("opportunity.organization_id", workspace.organizationId)
    : query.eq("opportunity.user_id", userId)
      .is("opportunity.organization_id", null);
}

export async function fetchOpportunityHistory(
  userId: string,
  workspace: Workspace,
  opportunityId: string,
  limit = 25,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityHistoryItem[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  let query = client.from("opportunity_status_history")
    .select(OPPORTUNITY_HISTORY_SELECT)
    .eq("opportunity_id", opportunityId);
  query = scopeRelatedOpportunity(query, userId, workspace);
  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(boundedLimit);
  if (error) throw error;
  return ((data ?? []) as unknown as OpportunityStatusHistoryRow[]).map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorUserId: row.actor_user_id,
    sourceSystem: row.source_system,
    reason: row.reason_code?.trim() || null,
    occurredAt: row.occurred_at,
  }));
}

export async function fetchOpportunityQuotes(
  userId: string,
  workspace: Workspace,
  opportunityId: string,
  limit = 10,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityLinkedQuote[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  let query = client.from("quotes")
    .select(OPPORTUNITY_QUOTES_SELECT)
    .eq("opportunity_id", opportunityId);
  query = scopeQuery(query, userId, workspace);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(boundedLimit);
  if (error) throw error;
  return ((data ?? []) as Pick<
    QuoteRow,
    "id" | "reference" | "job_name" | "status" | "created_at" | "updated_at"
  >[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.job_name.trim() || row.reference,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
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
