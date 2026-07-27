import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import type { CustomerRow, OpportunityRow, PropertyRow } from "@/lib/supabase/types";
import { formatOpportunityTitle } from "@/lib/opportunities/format";
import { ACTIVE_OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_LABELS } from "@/lib/opportunities/types";
import { QUOTE_STATUS_LABELS } from "@/lib/quotes/types";
import { formatCustomerProperty } from "@/lib/customers/format";
import {
  PROPERTY_RELATIONSHIP_LIMIT,
  PROPERTY_TIMELINE_LIMIT,
  type PropertyDetail,
  type PropertyLinkedQuote,
  type PropertyTimelineItem,
} from "./types";
import { fetchCrmTimelineFacts } from "@/lib/crm/repository";

const PROPERTY_SELECT = "id, customer_id, marketplace_property_id, address_line1, address_line2, city, region, postal_code, country_code, property_data, notes, access_instructions, tags, created_at, updated_at";
const OPPORTUNITY_SELECT = "id, customer_id, property_id, summary, service_type, status, origin, assigned_user_id, created_at, updated_at";
const QUOTE_SELECT = "id, opportunity_id, reference, job_name, status, created_at, updated_at, shared_at";
const ATTRIBUTE_LABELS: Record<string, string> = {
  propertyType: "Property type",
  yearBuilt: "Year built",
  stories: "Stories",
  squareFootage: "Square footage",
  roofType: "Roof type",
  exteriorType: "Exterior type",
  usage: "Usage",
};

function scope<T extends { eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(
  query: T, userId: string, workspace: Workspace
): T {
  return workspace.type === "organization"
    ? query.eq("organization_id", workspace.organizationId)
    : query.eq("user_id", userId).is("organization_id", null);
}

export async function fetchPropertyDetail(
  userId: string,
  workspace: Workspace,
  propertyId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<PropertyDetail | null> {
  let coreQuery = client.from("properties").select(PROPERTY_SELECT).eq("id", propertyId);
  coreQuery = scope(coreQuery, userId, workspace);
  const coreResult = await coreQuery.maybeSingle();
  if (coreResult.error) throw coreResult.error;
  if (!coreResult.data) return null;
  const property = coreResult.data as Pick<PropertyRow,
    "id" | "customer_id" | "marketplace_property_id" | "address_line1" | "address_line2" |
    "city" | "region" | "postal_code" | "country_code" | "property_data" | "notes" |
    "access_instructions" | "tags" | "created_at" | "updated_at">;

  const customerPromise = async () => {
    if (!property.customer_id) return null;
    let query = client.from("customers")
      .select("id, display_name, company_name, archived_at")
      .eq("id", property.customer_id);
    query = scope(query, userId, workspace);
    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    return result.data as Pick<CustomerRow, "id" | "display_name" | "company_name" | "archived_at"> | null;
  };
  const opportunitiesPromise = async () => {
    let query = client.from("opportunities").select(OPPORTUNITY_SELECT).eq("property_id", propertyId);
    query = scope(query, userId, workspace);
    const result = await query.order("updated_at", { ascending: false }).limit(PROPERTY_RELATIONSHIP_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as Pick<OpportunityRow,
      "id" | "customer_id" | "property_id" | "summary" | "service_type" | "status" |
      "origin" | "assigned_user_id" | "created_at" | "updated_at">[];
  };
  const auditPromise = async () => {
    const result = await client.from("property_audit_history")
      .select("id, action, changed_fields, actor_user_id, occurred_at")
      .eq("property_id", propertyId).order("occurred_at", { ascending: false })
      .limit(PROPERTY_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as { id: string; action: string; changed_fields: string[]; actor_user_id: string | null; occurred_at: string }[];
  };
  const [customerResult, opportunitiesResult, auditResult, crmResult] =
    await Promise.allSettled([
      customerPromise(), opportunitiesPromise(), auditPromise(),
      fetchCrmTimelineFacts(userId, workspace, { type: "property", id: propertyId }, client),
    ]);
  const opportunityRows = opportunitiesResult.status === "fulfilled" ? opportunitiesResult.value : null;
  const opportunityIds = opportunityRows?.map((row) => row.id) ?? [];

  const quotesPromise = async () => {
    if (!opportunityIds.length) return [] as {
      id: string; opportunity_id: string | null; reference: string; job_name: string;
      status: PropertyLinkedQuote["status"]; created_at: string; updated_at: string; shared_at: string | null;
    }[];
    let query = client.from("quotes").select(QUOTE_SELECT).in("opportunity_id", opportunityIds);
    query = scope(query, userId, workspace);
    const result = await query.order("created_at", { ascending: false }).limit(PROPERTY_RELATIONSHIP_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as {
      id: string; opportunity_id: string | null; reference: string; job_name: string;
      status: PropertyLinkedQuote["status"]; created_at: string; updated_at: string; shared_at: string | null;
    }[];
  };
  const statusPromise = async () => {
    if (!opportunityIds.length) return [] as { id: string; from_status: OpportunityRow["status"] | null; to_status: OpportunityRow["status"]; actor_user_id: string | null; occurred_at: string }[];
    const result = await client.from("opportunity_status_history")
      .select("id, from_status, to_status, actor_user_id, occurred_at")
      .in("opportunity_id", opportunityIds).order("occurred_at", { ascending: false })
      .limit(PROPERTY_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as { id: string; from_status: OpportunityRow["status"] | null; to_status: OpportunityRow["status"]; actor_user_id: string | null; occurred_at: string }[];
  };
  const assignmentPromise = async () => {
    if (!opportunityIds.length) return [] as { id: string; new_assigned_user_id: string | null; actor_user_id: string | null; occurred_at: string }[];
    const result = await client.from("opportunity_assignment_history")
      .select("id, new_assigned_user_id, actor_user_id, occurred_at")
      .in("opportunity_id", opportunityIds).order("occurred_at", { ascending: false })
      .limit(PROPERTY_TIMELINE_LIMIT);
    if (result.error) throw result.error;
    return (result.data ?? []) as { id: string; new_assigned_user_id: string | null; actor_user_id: string | null; occurred_at: string }[];
  };
  const [quotesResult, statusResult, assignmentResult] =
    await Promise.allSettled([quotesPromise(), statusPromise(), assignmentPromise()]);
  const quoteRows = quotesResult.status === "fulfilled" ? quotesResult.value : null;
  const quoteIds = quoteRows?.map((row) => row.id) ?? [];
  const [acceptanceResult, changeResult] = await Promise.allSettled([
    (async () => {
      if (!quoteIds.length) return [] as { id: string; quote_id: string; accepted_at: string }[];
      const result = await client.from("quote_acceptances").select("id, quote_id, accepted_at")
        .in("quote_id", quoteIds).limit(PROPERTY_TIMELINE_LIMIT);
      if (result.error) throw result.error;
      return (result.data ?? []) as { id: string; quote_id: string; accepted_at: string }[];
    })(),
    (async () => {
      if (!quoteIds.length) return [] as { id: string; quote_id: string; submitted_at: string }[];
      const result = await client.from("quote_change_requests").select("id, quote_id, submitted_at")
        .in("quote_id", quoteIds).limit(PROPERTY_TIMELINE_LIMIT);
      if (result.error) throw result.error;
      return (result.data ?? []) as { id: string; quote_id: string; submitted_at: string }[];
    })(),
  ]);
  const acceptedIds = new Set(acceptanceResult.status === "fulfilled"
    ? acceptanceResult.value.map((row) => row.quote_id) : []);
  const customer = customerResult.status === "fulfilled" ? customerResult.value : null;
  const quotes: PropertyLinkedQuote[] | null = quoteRows?.map((row) => ({
    id: row.id, reference: row.reference, title: row.job_name.trim() || row.reference,
    status: row.status, createdAt: row.created_at, sharedAt: row.shared_at,
    viewed: row.status === "viewed" || row.status === "accepted", accepted: acceptedIds.has(row.id) || row.status === "accepted",
  })) ?? null;
  const customerName = customer?.display_name?.trim() || null;
  const opportunities = opportunityRows?.map((row) => ({
    id: row.id, title: formatOpportunityTitle(row.summary, row.service_type),
    status: row.status, origin: row.origin, customerName,
    assignedUserId: row.assigned_user_id, updatedAt: row.updated_at,
  })) ?? null;

  const timeline: PropertyTimelineItem[] = [{
    id: `property:${property.id}`, title: "Property record created",
    detail: "Recorded in Mercurius", occurredAt: property.created_at, actorUserId: null,
  }];
  for (const row of opportunityRows ?? []) timeline.push({
    id: `opportunity:${row.id}`, title: "Opportunity created",
    detail: formatOpportunityTitle(row.summary, row.service_type), occurredAt: row.created_at, actorUserId: null,
  });
  if (auditResult.status === "fulfilled") for (const row of auditResult.value) timeline.push({
    id: `audit:${row.id}`, title: row.action === "associated_customer_changed" ? "Associated customer changed" : "Property information updated",
    detail: `Changed: ${row.changed_fields.map((field) => field.replaceAll("_", " ")).join(", ")}`,
    occurredAt: row.occurred_at, actorUserId: row.actor_user_id,
  });
  if (crmResult.status === "fulfilled") for (const row of crmResult.value) timeline.push({
    id: `crm:${row.id}`, title: row.title, detail: row.detail,
    occurredAt: row.occurredAt, actorUserId: row.actorUserId,
  });
  if (statusResult.status === "fulfilled") for (const row of statusResult.value) timeline.push({
    id: `status:${row.id}`, title: row.from_status
      ? `${OPPORTUNITY_STATUS_LABELS[row.from_status]} → ${OPPORTUNITY_STATUS_LABELS[row.to_status]}`
      : `Created as ${OPPORTUNITY_STATUS_LABELS[row.to_status]}`,
    detail: "Opportunity status", occurredAt: row.occurred_at, actorUserId: row.actor_user_id,
  });
  if (assignmentResult.status === "fulfilled") for (const row of assignmentResult.value) timeline.push({
    id: `assignment:${row.id}`, title: row.new_assigned_user_id ? "Assignment changed" : "Assignment cleared",
    detail: "Opportunity assignment", occurredAt: row.occurred_at, actorUserId: row.actor_user_id,
  });
  for (const row of quoteRows ?? []) {
    timeline.push({ id: `quote:${row.id}`, title: `Quote ${row.reference} created`, detail: QUOTE_STATUS_LABELS[row.status], occurredAt: row.created_at, actorUserId: null });
    if (row.shared_at) timeline.push({ id: `quote-shared:${row.id}`, title: `Quote ${row.reference} shared`, detail: "Linked quote", occurredAt: row.shared_at, actorUserId: null });
  }
  if (acceptanceResult.status === "fulfilled") for (const row of acceptanceResult.value) timeline.push({
    id: `accepted:${row.id}`, title: "Linked quote accepted", detail: "Acceptance recorded", occurredAt: row.accepted_at, actorUserId: null,
  });
  if (changeResult.status === "fulfilled") for (const row of changeResult.value) timeline.push({
    id: `change:${row.id}`, title: "Changes requested for linked quote", detail: "Change request recorded", occurredAt: row.submitted_at, actorUserId: null,
  });
  const sortedTimeline = [...new Map(timeline.map((item) => [item.id, item])).values()]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id))
    .slice(0, PROPERTY_TIMELINE_LIMIT);
  const complete = opportunityRows !== null && quoteRows !== null &&
    auditResult.status === "fulfilled" && statusResult.status === "fulfilled" &&
    assignmentResult.status === "fulfilled" && acceptanceResult.status === "fulfilled" &&
    changeResult.status === "fulfilled" && crmResult.status === "fulfilled";
  const dates = [property.created_at, ...(opportunityRows ?? []).map((row) => row.created_at), ...(quoteRows ?? []).map((row) => row.created_at)];
  const activity = [property.updated_at, ...(opportunityRows ?? []).map((row) => row.updated_at), ...(quoteRows ?? []).map((row) => row.updated_at)].sort().at(-1) ?? property.updated_at;
  const attributes: Record<string, string> = {};
  for (const [key, label] of Object.entries(ATTRIBUTE_LABELS)) {
    const value = property.property_data[key];
    if (typeof value === "string" || typeof value === "number") attributes[label] = String(value);
  }

  return {
    id: property.id,
    address: {
      line1: property.address_line1, line2: property.address_line2, city: property.city,
      region: property.region, postalCode: property.postal_code, countryCode: property.country_code,
      formatted: formatCustomerProperty(property),
    },
    source: property.marketplace_property_id ? "marketplace" : "direct",
    summary: property.notes?.trim() || null,
    accessInstructions: property.access_instructions?.trim() || null,
    tags: property.tags, attributes, createdAt: property.created_at, updatedAt: property.updated_at,
    recordedSince: dates.sort()[0] ?? property.created_at,
    indicators: {
      activeOpportunities: opportunityRows ? opportunityRows.filter((row) => ACTIVE_OPPORTUNITY_STATUSES.includes(row.status)).length : null,
      linkedQuotes: quotes?.length ?? null, acceptedLinkedQuotes: quotes ? quotes.filter((quote) => quote.accepted).length : null,
      latestActivityAt: activity, complete,
    },
    customer: customerResult.status === "fulfilled" ? { status: "ready", value: customer ? {
      id: customer.id, displayName: customerName || "Customer", companyName: customer.company_name,
      archived: Boolean(customer.archived_at),
    } : null } : { status: "error" },
    opportunities: opportunities ? { status: "ready", value: opportunities } : { status: "error" },
    quotes: quotes ? { status: "ready", value: quotes } : { status: "error" },
    timeline: opportunityRows ? { status: "ready", value: sortedTimeline, complete } : { status: "error" },
  };
}
