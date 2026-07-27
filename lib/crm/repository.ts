import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import { CRM_PAGE_LIMIT, type CrmEntityActivity, type CrmNote, type CrmTarget, type CrmTask, type CrmTimelineFact } from "./types";

function scope<T extends { eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(
  query: T, userId: string, workspace: Workspace
): T {
  return workspace.type === "organization"
    ? query.eq("organization_id", workspace.organizationId)
    : query.eq("user_id", userId).is("organization_id", null);
}

function target<T extends { eq: (column: string, value: string) => T }>(query: T, value: CrmTarget): T {
  return query.eq(value.type === "customer" ? "customer_id" : "property_id", value.id);
}

export function taskDueLabel(task: CrmTask, now = new Date()): string {
  if (task.status === "completed") return "Completed";
  if (!task.dueAt) return "No due date";
  const due = new Date(task.dueAt);
  if (due.getTime() < now.getTime()) return "Overdue";
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((dueDay - nowDay) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(due)}`;
}

export async function fetchCrmEntityActivity(
  userId: string,
  workspace: Workspace,
  entity: CrmTarget,
  client: SupabaseClient = getSupabaseClient(),
  limit = CRM_PAGE_LIMIT
): Promise<CrmEntityActivity> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  let notesQuery = client.from("crm_notes")
    .select("id, body, author_id, created_at, updated_at, archived_at, archived_by");
  notesQuery = target(scope(notesQuery, userId, workspace), entity);
  let tasksQuery = client.from("crm_tasks")
    .select("id, title, description, assigned_to, due_at, status, created_by, completed_at, completed_by, created_at, updated_at, archived_at")
    .is("archived_at", null);
  tasksQuery = target(scope(tasksQuery, userId, workspace), entity);
  const [notes, tasks] = await Promise.allSettled([
    notesQuery.order("created_at", { ascending: false }).limit(boundedLimit + 1),
    tasksQuery.order("status", { ascending: true }).order("due_at", { ascending: true, nullsFirst: false }).limit(boundedLimit + 1),
  ]);
  return {
    notes: notes.status === "fulfilled" && !notes.value.error
      ? {
          status: "ready",
          value: (notes.value.data ?? []).slice(0, boundedLimit).map((row) => ({
            id: row.id, body: row.body, authorId: row.author_id, createdAt: row.created_at,
            updatedAt: row.updated_at, archivedAt: row.archived_at, archivedBy: row.archived_by,
          })) as CrmNote[],
          complete: (notes.value.data ?? []).length <= boundedLimit,
        } : { status: "error" },
    tasks: tasks.status === "fulfilled" && !tasks.value.error
      ? {
          status: "ready",
          value: (tasks.value.data ?? []).slice(0, boundedLimit).map((row) => ({
            id: row.id, title: row.title, description: row.description, assignedTo: row.assigned_to,
            dueAt: row.due_at, status: row.status, createdBy: row.created_by,
            completedAt: row.completed_at, completedBy: row.completed_by,
            createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at,
          })) as CrmTask[],
          complete: (tasks.value.data ?? []).length <= boundedLimit,
        } : { status: "error" },
  };
}

export async function fetchCrmTimelineFacts(
  userId: string,
  workspace: Workspace,
  entity: CrmTarget,
  client: SupabaseClient = getSupabaseClient()
): Promise<CrmTimelineFact[]> {
  let notesQuery = client.from("crm_notes")
    .select("id, body, author_id, created_at, archived_at, archived_by");
  notesQuery = target(scope(notesQuery, userId, workspace), entity);
  let tasksQuery = client.from("crm_tasks").select("id, title");
  tasksQuery = target(scope(tasksQuery, userId, workspace), entity);
  const [notesResult, tasksResult] = await Promise.all([notesQuery.limit(CRM_PAGE_LIMIT), tasksQuery.limit(CRM_PAGE_LIMIT)]);
  if (notesResult.error) throw notesResult.error;
  if (tasksResult.error) throw tasksResult.error;
  const taskTitles = new Map((tasksResult.data ?? []).map((row) => [row.id, row.title]));
  const taskIds = [...taskTitles.keys()];
  const historyResult = taskIds.length
    ? await client.from("crm_task_history")
      .select("id, task_id, action, actor_user_id, occurred_at")
      .in("task_id", taskIds).order("occurred_at", { ascending: false }).limit(CRM_PAGE_LIMIT)
    : { data: [], error: null };
  if (historyResult.error) throw historyResult.error;
  const facts: CrmTimelineFact[] = [];
  for (const row of notesResult.data ?? []) {
    facts.push({
      id: `note-created:${row.id}`, title: "Internal note added",
      detail: row.body.length > 120 ? `${row.body.slice(0, 120)}…` : row.body,
      occurredAt: row.created_at, actorUserId: row.author_id,
    });
    if (row.archived_at) facts.push({
      id: `note-archived:${row.id}`, title: "Internal note archived",
      detail: "Note removed from the active record", occurredAt: row.archived_at,
      actorUserId: row.archived_by,
    });
  }
  const labels: Record<string, string> = {
    task_created: "Follow-up created", task_updated: "Follow-up updated",
    task_assigned: "Follow-up assigned", task_due_changed: "Follow-up due date changed",
    task_completed: "Follow-up completed", task_reopened: "Follow-up reopened",
    task_archived: "Follow-up archived",
  };
  for (const row of historyResult.data ?? []) facts.push({
    id: `task:${row.id}`, title: labels[row.action] ?? "Follow-up updated",
    detail: taskTitles.get(row.task_id) ?? "Manual follow-up",
    occurredAt: row.occurred_at, actorUserId: row.actor_user_id,
  });
  return facts.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
}
