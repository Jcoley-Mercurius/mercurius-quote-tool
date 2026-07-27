import { describe, expect, it } from "vitest";
import type { CrmTask } from "./types";
import { taskDueLabel } from "./repository";

const task: CrmTask = {
  id: "task-1", title: "Follow up", description: null, assignedTo: null,
  dueAt: null, status: "open", createdBy: null, completedAt: null,
  completedBy: null, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", archivedAt: null,
};

describe("manual follow-up due labels", () => {
  const now = new Date(2026, 6, 10, 12);
  it("distinguishes no-date, overdue, today, and tomorrow factually", () => {
    expect(taskDueLabel(task, now)).toBe("No due date");
    expect(taskDueLabel({ ...task, dueAt: new Date(2026, 6, 9, 12).toISOString() }, now)).toBe("Overdue");
    expect(taskDueLabel({ ...task, dueAt: new Date(2026, 6, 10, 18).toISOString() }, now)).toBe("Due today");
    expect(taskDueLabel({ ...task, dueAt: new Date(2026, 6, 11, 9).toISOString() }, now)).toBe("Due tomorrow");
  });
  it("never labels completed work overdue", () => {
    expect(taskDueLabel({
      ...task, status: "completed", dueAt: new Date(2020, 1, 1).toISOString(),
      completedAt: "2026-07-10T10:00:00Z",
    }, now)).toBe("Completed");
  });
});
