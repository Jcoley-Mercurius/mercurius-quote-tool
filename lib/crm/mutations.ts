import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CrmNote, CrmTarget, CrmTask } from "./types";

export class CrmMutationError extends Error {
  constructor(public readonly kind: "conflict" | "forbidden" | "validation" | "unavailable", message: string) { super(message); }
}

function safeError(error: { code?: string; message?: string }): CrmMutationError {
  if (error.code === "40001") return new CrmMutationError("conflict", "This CRM record changed elsewhere. Reload the latest version.");
  if (error.code === "42501" || error.code === "P0002") return new CrmMutationError("forbidden", "This CRM record is no longer available in the active workspace.");
  if (error.code === "22023" || error.code === "23514") return new CrmMutationError("validation", error.message || "Check the CRM information.");
  return new CrmMutationError("unavailable", "The CRM change could not be saved. Try again.");
}

function targetArgs(target: CrmTarget) {
  return {
    p_customer_id: target.type === "customer" ? target.id : null,
    p_property_id: target.type === "property" ? target.id : null,
  };
}

async function invoke<T>(name: string, args: Record<string, unknown>, client: SupabaseClient): Promise<T> {
  const result = await client.rpc(name, args);
  if (result.error) throw safeError(result.error);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!value) throw new CrmMutationError("unavailable", "The CRM change could not be saved.");
  return value as T;
}

export function createCrmNote(target: CrmTarget, body: string, client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmNote>("create_crm_note", { ...targetArgs(target), p_body: body }, client);
}
export function archiveCrmNote(noteId: string, expectedUpdatedAt: string, client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmNote>("archive_crm_note", { p_note_id: noteId, p_expected_updated_at: expectedUpdatedAt }, client);
}
export function createCrmTask(target: CrmTarget, values: {
  title: string; description: string | null; dueAt: string | null; assignedTo: string | null;
}, client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmTask>("create_crm_task", {
    ...targetArgs(target), p_title: values.title, p_description: values.description,
    p_due_at: values.dueAt, p_assigned_to: values.assignedTo,
  }, client);
}
export function updateCrmTask(taskId: string, expectedUpdatedAt: string, values: {
  title: string; description: string | null; dueAt: string | null; assignedTo: string | null;
}, client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmTask>("update_crm_task", {
    p_task_id: taskId, p_expected_updated_at: expectedUpdatedAt, p_title: values.title,
    p_description: values.description, p_due_at: values.dueAt, p_assigned_to: values.assignedTo,
  }, client);
}
export function setCrmTaskStatus(taskId: string, expectedUpdatedAt: string, status: "open" | "completed", client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmTask>("set_crm_task_status", { p_task_id: taskId, p_expected_updated_at: expectedUpdatedAt, p_status: status }, client);
}
export function archiveCrmTask(taskId: string, expectedUpdatedAt: string, client: SupabaseClient = getSupabaseClient()) {
  return invoke<CrmTask>("archive_crm_task", { p_task_id: taskId, p_expected_updated_at: expectedUpdatedAt }, client);
}
