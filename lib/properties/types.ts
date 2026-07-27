import type { OpportunityOrigin, OpportunityStatus } from "@/lib/supabase/types";
import type { QuoteStatus } from "@/lib/quotes/types";

export const PROPERTY_RELATIONSHIP_LIMIT = 25;
export const PROPERTY_TIMELINE_LIMIT = 50;

export interface PropertyCustomer {
  id: string;
  displayName: string;
  companyName: string | null;
  archived: boolean;
}

export interface PropertyOpportunity {
  id: string;
  title: string;
  status: OpportunityStatus;
  origin: OpportunityOrigin;
  customerName: string | null;
  assignedUserId: string | null;
  updatedAt: string;
}

export interface PropertyLinkedQuote {
  id: string;
  reference: string;
  title: string;
  status: QuoteStatus;
  createdAt: string;
  sharedAt: string | null;
  viewed: boolean;
  accepted: boolean;
}

export interface PropertyTimelineItem {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  actorUserId: string | null;
}

export interface PropertyDetail {
  id: string;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string;
    formatted: string;
  };
  source: "marketplace" | "direct";
  summary: string | null;
  accessInstructions: string | null;
  tags: string[];
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  recordedSince: string;
  indicators: {
    activeOpportunities: number | null;
    linkedQuotes: number | null;
    acceptedLinkedQuotes: number | null;
    latestActivityAt: string;
    complete: boolean;
  };
  customer: { status: "ready"; value: PropertyCustomer | null } | { status: "error" };
  opportunities: { status: "ready"; value: PropertyOpportunity[] } | { status: "error" };
  quotes: { status: "ready"; value: PropertyLinkedQuote[] } | { status: "error" };
  timeline: { status: "ready"; value: PropertyTimelineItem[]; complete: boolean } | { status: "error" };
}
