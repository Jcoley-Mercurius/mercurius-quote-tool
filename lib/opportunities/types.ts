import type {
  OpportunityOrigin,
  OpportunityStatus,
  PreferredContactMethod,
} from "@/lib/supabase/types";
import type { QuoteStatus } from "@/lib/quotes/types";

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "new",
  "opened",
  "quoting",
  "quoted",
  "won",
  "lost",
  "declined",
  "closed",
];

export const ACTIVE_OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "new",
  "opened",
  "quoting",
  "quoted",
];

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  new: "New",
  opened: "Opened",
  quoting: "Ready to quote",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  declined: "Declined",
  closed: "Closed",
};

export const OPPORTUNITY_STATUS_STYLES: Record<OpportunityStatus, string> = {
  new: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  opened: "bg-sky-50 text-sky-800 ring-sky-200",
  quoting: "bg-amber-50 text-amber-800 ring-amber-200",
  quoted: "bg-violet-50 text-violet-800 ring-violet-200",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  lost: "bg-slate-100 text-slate-700 ring-slate-200",
  declined: "bg-slate-100 text-slate-700 ring-slate-200",
  closed: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const OPPORTUNITY_ORIGINS: OpportunityOrigin[] = [
  "marketplace",
  "direct",
  "repair_request",
];

export const OPPORTUNITY_ORIGIN_LABELS: Record<OpportunityOrigin, string> = {
  marketplace: "Marketplace",
  direct: "Direct",
  repair_request: "Repair request",
};

export type OpportunityStatusFilter = "active" | "all" | OpportunityStatus;
export type OpportunityOriginFilter = "all" | OpportunityOrigin;
export type OpportunityAssignmentFilter = "all" | "assigned" | "unassigned";

export interface OpportunityListFilters {
  status: OpportunityStatusFilter;
  origin: OpportunityOriginFilter;
  assignment: OpportunityAssignmentFilter;
}

export interface OpportunityListItem {
  id: string;
  title: string;
  serviceType: string;
  origin: OpportunityOrigin;
  status: OpportunityStatus;
  customerId: string | null;
  customerName: string | null;
  propertyId: string | null;
  propertyLabel: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityPage {
  items: OpportunityListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  workspaceTotalCount: number;
}

export interface MarketplaceRequestContext {
  assignedAt: string | null;
  serviceCategory: { code: string; displayName: string } | null;
  requestTitle: string | null;
  requestDescription: string | null;
  preferredTiming: string | null;
  budgetRange: {
    minimumAmountMinor: number | null;
    maximumAmountMinor: number | null;
    currency: string;
  } | null;
}

export interface OpportunityDetail {
  id: string;
  title: string;
  serviceType: string;
  origin: OpportunityOrigin;
  status: OpportunityStatus;
  description: string | null;
  assignedUserId: string | null;
  customer: {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    preferredContactMethod: PreferredContactMethod | null;
  } | null;
  property: {
    id: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string;
  } | null;
  marketplaceContext: MarketplaceRequestContext | null;
  openedAt: string | null;
  declinedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityHistoryItem {
  id: string;
  fromStatus: OpportunityStatus | null;
  toStatus: OpportunityStatus;
  actorUserId: string | null;
  sourceSystem: "marketplace" | "vendor_os" | "migration";
  reason: string | null;
  occurredAt: string;
}

export interface OpportunityLinkedQuote {
  id: string;
  reference: string;
  title: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export type SecondaryResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; message: string };

export const OPPORTUNITY_HISTORY_LIMIT = 25;
export const OPPORTUNITY_QUOTES_LIMIT = 10;

export const OPPORTUNITY_PAGE_SIZE = 20;
export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityListFilters = {
  status: "active",
  origin: "all",
  assignment: "all",
};
