import type {
  OpportunityOrigin,
  OpportunityStatus,
  PreferredContactMethod,
} from "@/lib/supabase/types";
import type { QuoteStatus } from "@/lib/quotes/types";

export const CUSTOMER_PAGE_SIZE = 20;
export const CUSTOMER_DETAIL_LIMIT = 25;
export const CUSTOMER_TIMELINE_LIMIT = 50;

export interface CustomerCursor {
  updatedAt: string;
  id: string;
}

export type CustomerSource = "marketplace" | "direct";

export interface CustomerDirectoryItem {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  source: CustomerSource;
  primaryProperty: string | null;
  openOpportunityCount: number | null;
  linkedQuoteCount: number | null;
  latestActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDirectoryPage {
  items: CustomerDirectoryItem[];
  nextCursor: CustomerCursor | null;
  resultCount: number;
  aggregatesComplete: boolean;
}

export interface CustomerProperty {
  id: string;
  address: string;
  tags: string[];
  source: CustomerSource;
  updatedAt: string;
}

export interface CustomerOpportunity {
  id: string;
  title: string;
  status: OpportunityStatus;
  origin: OpportunityOrigin;
  assignedUserId: string | null;
  propertyLabel: string | null;
  updatedAt: string;
}

export interface CustomerLinkedQuote {
  id: string;
  reference: string;
  title: string;
  status: QuoteStatus;
  createdAt: string;
  sharedAt: string | null;
  viewed: boolean;
}

export type CustomerTimelineItem =
  | {
      id: string;
      kind: "opportunity";
      title: string;
      detail: string;
      occurredAt: string;
      actorUserId: string | null;
    }
  | {
      id: string;
      kind: "assignment";
      title: string;
      detail: string;
      occurredAt: string;
      actorUserId: string | null;
    }
  | {
      id: string;
      kind: "quote";
      title: string;
      detail: string;
      occurredAt: string;
      actorUserId: null;
    };

export interface CustomerDetail {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  source: CustomerSource;
  createdAt: string;
  updatedAt: string;
  properties: { status: "ready"; value: CustomerProperty[] } | { status: "error" };
  opportunities: { status: "ready"; value: CustomerOpportunity[] } | { status: "error" };
  quotes: { status: "ready"; value: CustomerLinkedQuote[] } | { status: "error" };
  timeline:
    | { status: "ready"; value: CustomerTimelineItem[]; complete: boolean }
    | { status: "error" };
}
