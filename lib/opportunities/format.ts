import type { CustomerRow, PropertyRow } from "@/lib/supabase/types";
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  OPPORTUNITY_ORIGINS,
  OPPORTUNITY_STATUSES,
  type OpportunityAssignmentFilter,
  type OpportunityListFilters,
  type OpportunityOriginFilter,
  type OpportunityStatusFilter,
} from "./types";

export function formatCustomerName(
  customer: Pick<CustomerRow, "display_name"> | null
): string {
  return customer?.display_name?.trim() || "Customer details unavailable";
}

export function formatPropertyAddress(
  property:
    | Pick<
        PropertyRow,
        | "address_line1"
        | "address_line2"
        | "city"
        | "region"
        | "postal_code"
        | "country_code"
      >
    | null
): string {
  if (!property) return "Property details unavailable";
  const street = [property.address_line1, property.address_line2]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  const locality = [property.city, property.region, property.postal_code]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  const country =
    property.country_code && property.country_code !== "US"
      ? property.country_code
      : "";
  return [street, locality, country].filter(Boolean).join(" · ") ||
    "Property details unavailable";
}

export function formatOpportunityTitle(
  summary: string | null | undefined,
  serviceType: string | null | undefined
): string {
  return summary?.trim() || serviceType?.trim() || "Opportunity";
}

export function clampPage(value: string | number | null | undefined): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseOpportunityFilters(
  values: {
    status?: string | null;
    origin?: string | null;
    assignment?: string | null;
  }
): OpportunityListFilters {
  const status: OpportunityStatusFilter =
    values.status === "all" ||
    values.status === "active" ||
    OPPORTUNITY_STATUSES.includes(values.status as never)
      ? (values.status as OpportunityStatusFilter)
      : DEFAULT_OPPORTUNITY_FILTERS.status;
  const origin: OpportunityOriginFilter =
    values.origin === "all" ||
    OPPORTUNITY_ORIGINS.includes(values.origin as never)
      ? (values.origin as OpportunityOriginFilter)
      : DEFAULT_OPPORTUNITY_FILTERS.origin;
  const assignment: OpportunityAssignmentFilter =
    values.assignment === "all" ||
    values.assignment === "assigned" ||
    values.assignment === "unassigned"
      ? values.assignment
      : DEFAULT_OPPORTUNITY_FILTERS.assignment;
  return { status, origin, assignment };
}

export function hasNonDefaultOpportunityFilters(
  filters: OpportunityListFilters
): boolean {
  return (
    filters.status !== DEFAULT_OPPORTUNITY_FILTERS.status ||
    filters.origin !== DEFAULT_OPPORTUNITY_FILTERS.origin ||
    filters.assignment !== DEFAULT_OPPORTUNITY_FILTERS.assignment
  );
}

export function formatOpportunityDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
