export const CRM_PAGE_LIMIT = 20;

export type CrmTarget =
  | { type: "customer"; id: string }
  | { type: "property"; id: string };

export interface CrmNote {
  id: string;
  body: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  archivedBy: string | null;
}

export interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueAt: string | null;
  status: "open" | "completed";
  createdBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CrmEntityActivity {
  notes: { status: "ready"; value: CrmNote[]; complete: boolean } | { status: "error" };
  tasks: { status: "ready"; value: CrmTask[]; complete: boolean } | { status: "error" };
}

export interface CrmTimelineFact {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  actorUserId: string | null;
}
