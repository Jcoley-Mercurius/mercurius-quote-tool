import type { OpportunityOrigin, OpportunityStatus } from "@/lib/supabase/types";
export {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/opportunities/types";

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
