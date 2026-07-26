import type { OpportunityOrigin, OpportunityStatus } from "@/lib/supabase/types";

export type MetricResult<T> =
  | { status: "ready"; value: T }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

export interface OpportunitySummary {
  id: string;
  title: string;
  origin: OpportunityOrigin;
  status: OpportunityStatus;
  customerName: string | null;
  propertyLabel: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardRepositoryData {
  opportunities: MetricResult<OpportunitySummary[]>;
  newOpportunityCount: MetricResult<number>;
  openOpportunityCount: MetricResult<number>;
  unassignedOpportunityCount: MetricResult<number>;
  customerCount: MetricResult<number>;
  propertyCount: MetricResult<number>;
}

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

export const OPPORTUNITY_ORIGIN_LABELS: Record<OpportunityOrigin, string> = {
  marketplace: "Marketplace",
  direct: "Direct",
  repair_request: "Repair request",
};
