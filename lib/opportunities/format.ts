import type { CustomerRow, PropertyRow } from "@/lib/supabase/types";
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  OPPORTUNITY_ORIGINS,
  OPPORTUNITY_STATUSES,
  type OpportunityAssignmentFilter,
  type OpportunityListFilters,
  type OpportunityOriginFilter,
  type OpportunityStatusFilter,
  type MarketplaceRequestContext,
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

export function formatOpportunityDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function minorAmount(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function timestamp(value: unknown): string | null {
  const parsed = text(value);
  return parsed && Number.isFinite(Date.parse(parsed)) ? parsed : null;
}

export function parseMarketplaceRequestContext(
  snapshot: unknown
): MarketplaceRequestContext | null {
  const value = record(snapshot);
  if (!value) return null;
  const category = record(value.serviceCategory);
  const displayName = text(category?.displayName);
  const code = text(category?.code);
  const budget = record(value.budgetRange);
  const currencyValue = text(budget?.currency)?.toUpperCase() ?? null;
  const currency = currencyValue && /^[A-Z]{3}$/.test(currencyValue)
    ? currencyValue
    : null;
  const minimumAmountMinor = minorAmount(budget?.minimumAmountMinor);
  const maximumAmountMinor = minorAmount(budget?.maximumAmountMinor);
  const budgetRange =
    currency &&
    (minimumAmountMinor !== null || maximumAmountMinor !== null) &&
    (minimumAmountMinor === null ||
      maximumAmountMinor === null ||
      minimumAmountMinor <= maximumAmountMinor)
      ? { minimumAmountMinor, maximumAmountMinor, currency }
      : null;
  const result: MarketplaceRequestContext = {
    assignedAt: timestamp(value.assignedAt),
    serviceCategory:
      displayName && code ? { displayName, code } : null,
    requestTitle: text(value.requestTitle),
    requestDescription: text(value.requestDescription),
    preferredTiming: text(value.preferredTiming),
    budgetRange,
  };
  return Object.values(result).some((entry) => entry !== null) ? result : null;
}

export function formatMarketplaceBudget(
  budget: MarketplaceRequestContext["budgetRange"]
): string | null {
  if (!budget) return null;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: budget.currency,
    });
  } catch {
    return null;
  }
  const minimum = budget.minimumAmountMinor === null
    ? null
    : formatter.format(budget.minimumAmountMinor / 100);
  const maximum = budget.maximumAmountMinor === null
    ? null
    : formatter.format(budget.maximumAmountMinor / 100);
  if (minimum && maximum) return `${minimum}–${maximum}`;
  if (minimum) return `${minimum} minimum`;
  if (maximum) return `Up to ${maximum}`;
  return null;
}

export function formatReasonCode(reason: string | null): string | null {
  if (!reason) return null;
  return reason.replace(/[_-]+/g, " ").trim().replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
