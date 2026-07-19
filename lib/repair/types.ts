export type RepairUrgency = "emergency" | "urgent" | "soon" | "flexible";

export type RepairRequestStatus = "pending" | "quoted" | "accepted";

/** Photo payload stored on repair_requests.photos (jsonb). */
export interface RepairRequestPhoto {
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

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

/** Full request used to prefill the quote builder (includes photos). */
export interface RepairRequestDetail extends RepairRequestLead {
  photos: RepairRequestPhoto[];
}

export const REPAIR_URGENCY_LABELS: Record<RepairUrgency, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  soon: "This week",
  flexible: "Flexible",
};
