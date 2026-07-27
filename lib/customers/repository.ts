import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import type {
  CustomerRow,
  OpportunityAssignmentHistoryRow,
  OpportunityRow,
  OpportunityStatusHistoryRow,
  PropertyRow,
} from "@/lib/supabase/types";
import { formatOpportunityTitle } from "@/lib/opportunities/format";
import { ACTIVE_OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_LABELS } from "@/lib/opportunities/types";
import { QUOTE_STATUS_LABELS } from "@/lib/quotes/types";
import {
  cleanCustomerSearch,
  formatCustomerProperty,
  normalizedPhoneSearch,
  postgrestSearchPattern,
} from "./format";
import {
  CUSTOMER_DETAIL_LIMIT,
  CUSTOMER_PAGE_SIZE,
  CUSTOMER_TIMELINE_LIMIT,
  type CustomerCursor,
  type CustomerDetail,
  type CustomerDuplicateCandidate,
  type CustomerDirectoryItem,
  type CustomerDirectoryPage,
  type CustomerLinkedQuote,
  type CustomerOpportunity,
  type CustomerProperty,
  type CustomerTimelineItem,
} from "./types";

function comparablePhone(value: string | null): string {
  return value?.replace(/\D/g, "") ?? "";
}

export async function findCustomerDuplicates(
  userId: string,
  workspace: Workspace,
  customerId: string,
  values: { displayName: string; email: string | null; phone: string | null },
  client: SupabaseClient = getSupabaseClient()
): Promise<CustomerDuplicateCandidate[]> {
  const email = values.email?.trim().toLowerCase() || "";
  const phone = comparablePhone(values.phone);
  const name = values.displayName.trim().toLowerCase();
  if (!email && !phone && !name) return [];

  let query = client.from("customers")
    .select("id, display_name, company_name, email, phone, normalized_email, normalized_phone, archived_at")
    .neq("id", customerId);
  query = scope(query, userId, workspace);
  const filters = [
    ...(email ? [`normalized_email.eq.${email}`] : []),
    ...(phone ? [`normalized_phone.eq.${phone}`] : []),
    ...(name ? [`display_name.ilike.${postgrestSearchPattern(name)}`] : []),
  ];
  const result = await query.or(filters.join(",")).limit(8);
  if (result.error) throw result.error;
  return ((result.data ?? []) as {
    id: string;
    display_name: string;
    company_name: string | null;
    normalized_email: string | null;
    normalized_phone: string | null;
    archived_at: string | null;
  }[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    companyName: row.company_name,
    archived: Boolean(row.archived_at),
    reasons: [
      ...(email && row.normalized_email === email ? ["same email"] : []),
      ...(phone && row.normalized_phone === phone ? ["same phone"] : []),
      ...(name && row.display_name.trim().toLowerCase() === name ? ["same name"] : []),
    ],
  })).filter((row) => row.reasons.length > 0);
}

const CUSTOMER_SELECT =
  "id, marketplace_homeowner_id, display_name, company_name, email, phone, preferred_contact_method, notes, tags, archived_at, archived_by, archive_reason, created_at, updated_at";
const PROPERTY_SELECT =
  "id, customer_id, marketplace_property_id, address_line1, address_line2, city, region, postal_code, tags, updated_at";
const OPPORTUNITY_SELECT =
  "id, customer_id, property_id, summary, service_type, status, origin, assigned_user_id, created_at, updated_at";
const QUOTE_SELECT =
  "id, opportunity_id, reference, job_name, status, created_at, updated_at, shared_at";

type CustomerBase = Pick<CustomerRow,
  "id" | "marketplace_homeowner_id" | "display_name" | "email" | "phone" |
  "company_name" | "preferred_contact_method" | "notes" | "tags" | "archived_at" |
  "archived_by" | "archive_reason" | "created_at" | "updated_at">;
type PropertyBase = Pick<PropertyRow,
  "id" | "customer_id" | "marketplace_property_id" | "address_line1" |
  "address_line2" | "city" | "region" | "postal_code" | "tags" | "updated_at">;
type OpportunityBase = Pick<OpportunityRow,
  "id" | "customer_id" | "property_id" | "summary" | "service_type" | "status" |
  "origin" | "assigned_user_id" | "created_at" | "updated_at">;
type QuoteBase = {
  id: string;
  opportunity_id: string | null;
  reference: string;
  job_name: string;
  status: CustomerLinkedQuote["status"];
  created_at: string;
  updated_at: string;
  shared_at: string | null;
};

function scope<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(query: T, userId: string, workspace: Workspace): T {
  return workspace.type === "organization"
    ? query.eq("organization_id", workspace.organizationId)
    : query.eq("user_id", userId).is("organization_id", null);
}

function afterCursor<T extends {
  or: (filters: string) => T;
}>(query: T, cursor: CustomerCursor | null): T {
  if (!cursor) return query;
  return query.or(
    `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`
  );
}

async function customerRows(
  userId: string,
  workspace: Workspace,
  search: string,
  cursor: CustomerCursor | null,
  client: SupabaseClient,
  archiveFilter: "active" | "archived"
): Promise<CustomerBase[]> {
  const cleaned = cleanCustomerSearch(search);
  const pattern = postgrestSearchPattern(cleaned);
  const phone = normalizedPhoneSearch(cleaned);
  if (cleaned && !pattern && !phone) return [];

  let propertyIds: string[] = [];
  if (cleaned) {
    let propertyQuery = client.from("properties").select("customer_id");
    propertyQuery = scope(propertyQuery, userId, workspace);
    const propertyResult = await propertyQuery
      .or(
        `address_line1.ilike.%${pattern}%,city.ilike.%${pattern}%,postal_code.ilike.%${pattern}%`
      )
      .not("customer_id", "is", null)
      .limit(100);
    if (propertyResult.error) throw propertyResult.error;
    propertyIds = [...new Set(
      ((propertyResult.data ?? []) as { customer_id: string | null }[])
        .map((row) => row.customer_id)
        .filter((id): id is string => Boolean(id))
    )];
  }

  function baseQuery() {
    let query = client.from("customers").select(CUSTOMER_SELECT);
    query = scope(query, userId, workspace);
    query = archiveFilter === "active"
      ? query.is("archived_at", null)
      : query.not("archived_at", "is", null);
    query = afterCursor(query, cursor);
    return query;
  }

  if (!cleaned) {
    const result = await baseQuery()
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CUSTOMER_PAGE_SIZE + 1);
    if (result.error) throw result.error;
    return (result.data ?? []) as CustomerBase[];
  }

  const directQuery = baseQuery().or(
    [
      `display_name.ilike.%${pattern}%`,
      `company_name.ilike.%${pattern}%`,
      `email.ilike.%${pattern}%`,
      `phone.ilike.%${pattern}%`,
      ...(phone.length >= 3 ? [`phone.ilike.%${phone}%`] : []),
    ].join(",")
  ).order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CUSTOMER_PAGE_SIZE + 1);
  const relatedQuery = propertyIds.length
    ? baseQuery().in("id", propertyIds)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CUSTOMER_PAGE_SIZE + 1)
    : Promise.resolve({ data: [], error: null });
  const [direct, related] = await Promise.all([directQuery, relatedQuery]);
  if (direct.error) throw direct.error;
  if (related.error) throw related.error;
  const unique = new Map<string, CustomerBase>();
  for (const row of [...(direct.data ?? []), ...(related.data ?? [])] as CustomerBase[]) {
    unique.set(row.id, row);
  }
  return [...unique.values()].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id)
  ).slice(0, CUSTOMER_PAGE_SIZE + 1);
}

export async function fetchCustomerDirectoryPage(
  userId: string,
  workspace: Workspace,
  search = "",
  cursor: CustomerCursor | null = null,
  client: SupabaseClient = getSupabaseClient(),
  archiveFilter: "active" | "archived" = "active"
): Promise<CustomerDirectoryPage> {
  const rows = await customerRows(userId, workspace, search, cursor, client, archiveFilter);
  const hasMore = rows.length > CUSTOMER_PAGE_SIZE;
  const pageRows = rows.slice(0, CUSTOMER_PAGE_SIZE);
  const customerIds = pageRows.map((row) => row.id);
  if (!customerIds.length) {
    return { items: [], nextCursor: null, resultCount: 0, aggregatesComplete: true };
  }

  let propertiesQuery = client.from("properties").select(PROPERTY_SELECT).in("customer_id", customerIds);
  propertiesQuery = scope(propertiesQuery, userId, workspace);
  let opportunitiesQuery = client.from("opportunities").select(OPPORTUNITY_SELECT).in("customer_id", customerIds);
  opportunitiesQuery = scope(opportunitiesQuery, userId, workspace);
  const [propertiesResult, opportunitiesResult] = await Promise.allSettled([
    propertiesQuery.order("updated_at", { ascending: false }).limit(500),
    opportunitiesQuery.order("updated_at", { ascending: false }).limit(500),
  ]);
  const properties = propertiesResult.status === "fulfilled" && !propertiesResult.value.error
    ? (propertiesResult.value.data ?? []) as PropertyBase[] : [];
  const opportunities = opportunitiesResult.status === "fulfilled" && !opportunitiesResult.value.error
    ? (opportunitiesResult.value.data ?? []) as OpportunityBase[] : [];
  const aggregatesComplete =
    propertiesResult.status === "fulfilled" && !propertiesResult.value.error &&
    opportunitiesResult.status === "fulfilled" && !opportunitiesResult.value.error;
  const opportunityIds = opportunities.map((row) => row.id);
  let quotes: QuoteBase[] = [];
  let quotesComplete = true;
  if (opportunityIds.length) {
    let quotesQuery = client.from("quotes").select(QUOTE_SELECT).in("opportunity_id", opportunityIds);
    quotesQuery = scope(quotesQuery, userId, workspace);
    const result = await quotesQuery.limit(500);
    if (result.error) quotesComplete = false;
    else quotes = (result.data ?? []) as QuoteBase[];
  }

  const items: CustomerDirectoryItem[] = pageRows.map((customer) => {
    const customerProperties = properties.filter((row) => row.customer_id === customer.id);
    const customerOpportunities = opportunities.filter((row) => row.customer_id === customer.id);
    const opportunitySet = new Set(customerOpportunities.map((row) => row.id));
    const customerQuotes = quotes.filter((row) =>
      row.opportunity_id ? opportunitySet.has(row.opportunity_id) : false
    );
    const activity = [
      customer.updated_at,
      ...customerProperties.map((row) => row.updated_at),
      ...customerOpportunities.map((row) => row.updated_at),
      ...customerQuotes.map((row) => row.updated_at),
    ].sort().at(-1) ?? customer.updated_at;
    return {
      id: customer.id,
      displayName: customer.display_name.trim() || "Customer",
      companyName: customer.company_name?.trim() || null,
      email: customer.email?.trim() || null,
      phone: customer.phone?.trim() || null,
      preferredContactMethod: customer.preferred_contact_method,
      source: customer.marketplace_homeowner_id ? "marketplace" : "direct",
      primaryProperty: customerProperties[0]
        ? formatCustomerProperty(customerProperties[0]) : null,
      openOpportunityCount: aggregatesComplete
        ? customerOpportunities.filter((row) =>
            ACTIVE_OPPORTUNITY_STATUSES.includes(row.status)
          ).length : null,
      linkedQuoteCount: aggregatesComplete && quotesComplete
        ? customerQuotes.length : null,
      latestActivityAt: activity,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      archivedAt: customer.archived_at,
    };
  });
  const last = pageRows.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? { updatedAt: last.updated_at, id: last.id } : null,
    resultCount: items.length,
    aggregatesComplete: aggregatesComplete && quotesComplete,
  };
}

export async function fetchCustomerDetail(
  userId: string,
  workspace: Workspace,
  customerId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<CustomerDetail | null> {
  let customerQuery = client.from("customers").select(CUSTOMER_SELECT).eq("id", customerId);
  customerQuery = scope(customerQuery, userId, workspace);
  const customerResult = await customerQuery.maybeSingle();
  if (customerResult.error) throw customerResult.error;
  if (!customerResult.data) return null;
  const customer = customerResult.data as CustomerBase;

  let propertiesQuery = client.from("properties").select(PROPERTY_SELECT).eq("customer_id", customerId);
  propertiesQuery = scope(propertiesQuery, userId, workspace);
  let opportunitiesQuery = client.from("opportunities").select(OPPORTUNITY_SELECT).eq("customer_id", customerId);
  opportunitiesQuery = scope(opportunitiesQuery, userId, workspace);
  const [propertiesSettled, opportunitiesSettled] = await Promise.allSettled([
    propertiesQuery.order("updated_at", { ascending: false }).limit(CUSTOMER_DETAIL_LIMIT),
    opportunitiesQuery.order("updated_at", { ascending: false }).limit(CUSTOMER_DETAIL_LIMIT),
  ]);
  const propertyRows = propertiesSettled.status === "fulfilled" && !propertiesSettled.value.error
    ? (propertiesSettled.value.data ?? []) as PropertyBase[] : null;
  const opportunityRows = opportunitiesSettled.status === "fulfilled" && !opportunitiesSettled.value.error
    ? (opportunitiesSettled.value.data ?? []) as OpportunityBase[] : null;
  const opportunityIds = opportunityRows?.map((row) => row.id) ?? [];

  const quotePromise = async () => {
    if (!opportunityIds.length) return [] as QuoteBase[];
    let query = client.from("quotes").select(QUOTE_SELECT).in("opportunity_id", opportunityIds);
    query = scope(query, userId, workspace);
    const result = await query.order("created_at", { ascending: false }).limit(CUSTOMER_DETAIL_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as QuoteBase[];
  };
  const statusPromise = async () => {
    if (!opportunityIds.length) return [] as OpportunityStatusHistoryRow[];
    const result = await client.from("opportunity_status_history")
      .select("id, opportunity_id, from_status, to_status, actor_user_id, source_system, occurred_at")
      .in("opportunity_id", opportunityIds)
      .order("occurred_at", { ascending: false }).limit(CUSTOMER_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as OpportunityStatusHistoryRow[];
  };
  const assignmentPromise = async () => {
    if (!opportunityIds.length) return [] as OpportunityAssignmentHistoryRow[];
    const result = await client.from("opportunity_assignment_history")
      .select("id, opportunity_id, previous_assigned_user_id, new_assigned_user_id, actor_user_id, source_system, reason_code, occurred_at")
      .in("opportunity_id", opportunityIds)
      .order("occurred_at", { ascending: false }).limit(CUSTOMER_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as OpportunityAssignmentHistoryRow[];
  };
  const auditPromise = async () => {
    const result = await client.from("customer_audit_history")
      .select("id, action, changed_fields, actor_user_id, occurred_at")
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: false })
      .limit(CUSTOMER_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as {
      id: string;
      action: "customer_updated" | "customer_archived" | "customer_restored";
      changed_fields: string[];
      actor_user_id: string | null;
      occurred_at: string;
    }[];
  };
  const [quotesSettled, statusSettled, assignmentSettled, auditSettled] =
    await Promise.allSettled([quotePromise(), statusPromise(), assignmentPromise(), auditPromise()]);
  const quoteRows = quotesSettled.status === "fulfilled" ? quotesSettled.value : null;
  const quoteIds = quoteRows?.map((row) => row.id) ?? [];
  const [acceptancesSettled, changesSettled] = await Promise.allSettled([
    (async () => {
      if (!quoteIds.length) return [] as {
        id: string; quote_id: string; accepted_at: string;
      }[];
      const result = await client.from("quote_acceptances")
        .select("id, quote_id, accepted_at")
        .in("quote_id", quoteIds)
        .order("accepted_at", { ascending: false })
        .limit(CUSTOMER_TIMELINE_LIMIT);
      if (result.error) throw result.error;
      return (result.data ?? []) as {
        id: string; quote_id: string; accepted_at: string;
      }[];
    })(),
    (async () => {
      if (!quoteIds.length) return [] as {
        id: string; quote_id: string; submitted_at: string;
      }[];
      const result = await client.from("quote_change_requests")
        .select("id, quote_id, submitted_at")
        .in("quote_id", quoteIds)
        .order("submitted_at", { ascending: false })
        .limit(CUSTOMER_TIMELINE_LIMIT);
      if (result.error) throw result.error;
      return (result.data ?? []) as {
        id: string; quote_id: string; submitted_at: string;
      }[];
    })(),
  ]);

  const properties: CustomerProperty[] | null = propertyRows?.map((row) => ({
    id: row.id,
    address: formatCustomerProperty(row),
    tags: row.tags,
    source: row.marketplace_property_id ? "marketplace" : "direct",
    updatedAt: row.updated_at,
  })) ?? null;
  const propertyLabels = new Map(propertyRows?.map((row) => [
    row.id, formatCustomerProperty(row),
  ]) ?? []);
  const opportunities: CustomerOpportunity[] | null = opportunityRows?.map((row) => ({
    id: row.id,
    title: formatOpportunityTitle(row.summary, row.service_type),
    status: row.status,
    origin: row.origin,
    assignedUserId: row.assigned_user_id,
    propertyLabel: row.property_id ? propertyLabels.get(row.property_id) ?? null : null,
    updatedAt: row.updated_at,
  })) ?? null;
  const quotes: CustomerLinkedQuote[] | null = quoteRows?.map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.job_name.trim() || row.reference,
    status: row.status,
    createdAt: row.created_at,
    sharedAt: row.shared_at,
    viewed: row.status === "viewed" || row.status === "accepted",
  })) ?? null;
  const timeline: CustomerTimelineItem[] = [];
  const initialHistoryOpportunityIds = new Set(
    statusSettled.status === "fulfilled"
      ? statusSettled.value
          .filter((row) => row.from_status === null)
          .map((row) => row.opportunity_id)
      : []
  );
  for (const row of opportunityRows ?? []) {
    if (initialHistoryOpportunityIds.has(row.id)) continue;
    timeline.push({
      id: `opportunity:${row.id}`,
      kind: "opportunity",
      title: "Opportunity created",
      detail: formatOpportunityTitle(row.summary, row.service_type),
      occurredAt: row.created_at,
      actorUserId: null,
    });
  }
  if (statusSettled.status === "fulfilled") {
    for (const row of statusSettled.value) {
      timeline.push({
        id: `status:${row.id}`,
        kind: "opportunity",
        title: row.from_status
          ? `${OPPORTUNITY_STATUS_LABELS[row.from_status]} → ${OPPORTUNITY_STATUS_LABELS[row.to_status]}`
          : `Created as ${OPPORTUNITY_STATUS_LABELS[row.to_status]}`,
        detail: "Opportunity status",
        occurredAt: row.occurred_at,
        actorUserId: row.actor_user_id,
      });
    }
  }
  if (assignmentSettled.status === "fulfilled") {
    for (const row of assignmentSettled.value) {
      timeline.push({
        id: `assignment:${row.id}`,
        kind: "assignment",
        title: row.new_assigned_user_id ? "Assignment changed" : "Assignment cleared",
        detail: "Opportunity assignment",
        occurredAt: row.occurred_at,
        actorUserId: row.actor_user_id,
      });
    }
  }
  for (const row of quoteRows ?? []) {
    timeline.push({
      id: `quote:${row.id}`,
      kind: "quote",
      title: `Quote ${row.reference} created`,
      detail: QUOTE_STATUS_LABELS[row.status],
      occurredAt: row.created_at,
      actorUserId: null,
    });
    if (row.shared_at) {
      timeline.push({
        id: `quote-shared:${row.id}`,
        kind: "quote",
        title: `Quote ${row.reference} shared`,
        detail: "Quote shared",
        occurredAt: row.shared_at,
        actorUserId: null,
      });
    }
    if (row.status === "viewed") {
      timeline.push({
        id: `quote-viewed:${row.id}`,
        kind: "quote",
        title: `Quote ${row.reference} viewed`,
        detail: "Quote viewed",
        occurredAt: row.updated_at,
        actorUserId: null,
      });
    }
  }
  const quoteReferences = new Map(
    (quoteRows ?? []).map((row) => [row.id, row.reference])
  );
  if (acceptancesSettled.status === "fulfilled") {
    for (const row of acceptancesSettled.value) {
      timeline.push({
        id: `acceptance:${row.id}`,
        kind: "quote",
        title: `Quote ${quoteReferences.get(row.quote_id) ?? ""} accepted`.replace(
          "  ",
          " "
        ),
        detail: "Quote accepted",
        occurredAt: row.accepted_at,
        actorUserId: null,
      });
    }
  }
  if (changesSettled.status === "fulfilled") {
    for (const row of changesSettled.value) {
      timeline.push({
        id: `change-request:${row.id}`,
        kind: "quote",
        title: `Changes requested for quote ${
          quoteReferences.get(row.quote_id) ?? ""
        }`.trim(),
        detail: "Quote change requested",
        occurredAt: row.submitted_at,
        actorUserId: null,
      });
    }
  }
  if (auditSettled.status === "fulfilled") {
    for (const row of auditSettled.value) {
      const labels = row.changed_fields.map((field) => field.replaceAll("_", " ")).join(", ");
      timeline.push({
        id: `customer:${row.id}`,
        kind: "customer",
        title: row.action === "customer_archived"
          ? "Customer archived"
          : row.action === "customer_restored" ? "Customer restored" : "Customer details updated",
        detail: labels ? `Changed: ${labels}` : "Customer record",
        occurredAt: row.occurred_at,
        actorUserId: row.actor_user_id,
      });
    }
  }
  const timelineComplete =
    statusSettled.status === "fulfilled" &&
    assignmentSettled.status === "fulfilled" &&
    quotesSettled.status === "fulfilled" &&
    acceptancesSettled.status === "fulfilled" &&
    changesSettled.status === "fulfilled";
  const completeTimeline = timelineComplete && auditSettled.status === "fulfilled";
  const uniqueTimeline = [...new Map(timeline.map((item) => [item.id, item])).values()]
    .sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)
    ).slice(0, CUSTOMER_TIMELINE_LIMIT);

  return {
    id: customer.id,
    displayName: customer.display_name.trim() || "Customer",
    companyName: customer.company_name?.trim() || null,
    email: customer.email?.trim() || null,
    phone: customer.phone?.trim() || null,
    preferredContactMethod: customer.preferred_contact_method,
    source: customer.marketplace_homeowner_id ? "marketplace" : "direct",
    summary: customer.notes?.trim() || null,
    tags: customer.tags,
    archivedAt: customer.archived_at,
    archivedBy: customer.archived_by,
    archiveReason: customer.archive_reason?.trim() || null,
    customerSince: [
      customer.created_at,
      ...(opportunityRows ?? []).map((row) => row.created_at),
      ...(quoteRows ?? []).map((row) => row.created_at),
    ].sort()[0] ?? customer.created_at,
    health: {
      label: !customer.email && !customer.phone
        ? "Profile incomplete"
        : (opportunityRows?.length ?? 0) > 1 || (quoteRows?.length ?? 0) > 1
          ? "Returning customer"
          : "New relationship",
      detail: propertyRows && opportunityRows && quoteRows
        ? `${propertyRows.length} linked ${propertyRows.length === 1 ? "property" : "properties"} · ${opportunityRows.length} ${opportunityRows.length === 1 ? "opportunity" : "opportunities"} · ${quoteRows.length} linked ${quoteRows.length === 1 ? "quote" : "quotes"}`
        : "Some relationship signals are temporarily unavailable.",
    },
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    properties: propertyRows ? { status: "ready", value: properties ?? [] } : { status: "error" },
    opportunities: opportunityRows ? { status: "ready", value: opportunities ?? [] } : { status: "error" },
    quotes: quoteRows ? { status: "ready", value: quotes ?? [] } : { status: "error" },
    timeline: opportunityRows
      ? { status: "ready", value: uniqueTimeline, complete: completeTimeline }
      : { status: "error" },
  };
}
