export type RepairUrgency = "emergency" | "urgent" | "soon" | "flexible";

export type RepairRequestStatus = "pending" | "quoted" | "accepted";

/** List row for the vendor dashboard (excludes heavy photo payloads). */
export interface RepairRequestLead {
  id: string;
  createdAt: string;
  serviceType: string;
  description: string;
  location: string;
  zip: string;
  urgency: RepairUrgency;
  name: string;
  email: string;
  phone: string;
  status: RepairRequestStatus;
}

export const REPAIR_URGENCY_LABELS: Record<RepairUrgency, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  soon: "This week",
  flexible: "Flexible",
};
