import { describe, expect, it, vi } from "vitest";
import { archiveCrmNote, createCrmNote, createCrmTask, setCrmTaskStatus, updateCrmTask } from "./mutations";

function client(result: { data: unknown; error: null | { code: string; message: string } }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

describe("CRM mutation boundaries", () => {
  it("creates notes with exactly one entity target and no workspace input", async () => {
    const scoped = client({ data: { id: "note-1" }, error: null });
    await createCrmNote({ type: "customer", id: "customer-1" }, "Private context", scoped as never);
    expect(scoped.rpc).toHaveBeenCalledWith("create_crm_note", {
      p_customer_id: "customer-1", p_property_id: null, p_body: "Private context",
    });
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("organization_id");
    await archiveCrmNote("note-1", "version", scoped as never);
    expect(scoped.rpc).toHaveBeenLastCalledWith("archive_crm_note", {
      p_note_id: "note-1", p_expected_updated_at: "version",
    });
  });

  it("creates, edits, completes, and reopens manual tasks through explicit operations", async () => {
    const scoped = client({ data: { id: "task-1" }, error: null });
    const values = { title: "Call back", description: null, dueAt: null, assignedTo: null };
    await createCrmTask({ type: "property", id: "property-1" }, values, scoped as never);
    await updateCrmTask("task-1", "v1", values, scoped as never);
    await setCrmTaskStatus("task-1", "v2", "completed", scoped as never);
    await setCrmTaskStatus("task-1", "v3", "open", scoped as never);
    expect(scoped.rpc.mock.calls.map((call) => call[0])).toEqual([
      "create_crm_task", "update_crm_task", "set_crm_task_status", "set_crm_task_status",
    ]);
  });

  it("maps stale and hidden failures without exposing raw database details", async () => {
    await expect(setCrmTaskStatus("task-1", "old", "completed", client({
      data: null, error: { code: "40001", message: "raw row version" },
    }) as never)).rejects.toMatchObject({ kind: "conflict" });
    await expect(createCrmNote({ type: "customer", id: "hidden" }, "Body", client({
      data: null, error: { code: "P0002", message: "secret customer exists" },
    }) as never)).rejects.toMatchObject({
      kind: "forbidden",
      message: "This CRM record is no longer available in the active workspace.",
    });
  });
});
