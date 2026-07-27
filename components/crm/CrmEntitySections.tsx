"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { workspaceKey } from "@/lib/organizations/types";
import { formatCustomerDate } from "@/lib/customers/format";
import { archiveCrmNote, archiveCrmTask, createCrmNote, createCrmTask, setCrmTaskStatus, updateCrmTask } from "@/lib/crm/mutations";
import { fetchCrmEntityActivity, taskDueLabel } from "@/lib/crm/repository";
import type { CrmEntityActivity, CrmTarget, CrmTask } from "@/lib/crm/types";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

export function CrmEntitySections({
  target,
  memberLabels,
  onTimelineChanged,
}: {
  target: CrmTarget;
  memberLabels: Map<string, string>;
  onTimelineChanged: () => void;
}) {
  const { user } = useAuth();
  const { workspace, isLoading } = useWorkspace();
  const [refresh, setRefresh] = useState(0);
  const [limit, setLimit] = useState(20);
  const [mode, setMode] = useState<string | null>(null);
  const key = user ? `${user.id}:${workspaceKey(workspace)}:${target.type}:${target.id}:${limit}:${refresh}` : "signed-out";
  const [ready, setReady] = useState<{ key: string; value: CrmEntityActivity } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [now] = useState(() => new Date());
  useEffect(() => {
    if (!user || isLoading) return;
    let active = true;
    void fetchCrmEntityActivity(user.id, workspace, target, undefined, limit).then((value) => {
      if (active) { setReady({ key, value }); setErrorKey(null); }
    }).catch(() => { if (active) setErrorKey(key); });
    return () => { active = false; };
  }, [isLoading, key, limit, target, user, workspace]);
  const current = ready?.key === key ? ready.value : null;
  const reload = (message?: string) => {
    if (message) setAnnouncement(message);
    setRefresh((value) => value + 1);
    onTimelineChanged();
  };
  if (isLoading || (!current && errorKey !== key)) return <div role="status" className="h-32 animate-pulse rounded-2xl bg-slate-100" />;
  if (errorKey === key) return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Internal CRM activity is temporarily unavailable.</div>;
  if (!current) return null;
  const open = current.tasks.status === "ready" ? current.tasks.value.filter((task) => task.status === "open") : [];
  const overdue = open.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now.getTime());
  return <div className="space-y-6">
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Internal notes</h2><p className="mt-1 text-sm text-slate-600">Workspace-private context. Notes are not customer-facing messages.</p></div><button type="button" onClick={() => setMode("note")} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white">Add note</button></div>
      {current.notes.status === "error" ? <Unavailable /> : current.notes.value.filter((note) => !note.archivedAt).length ? <ul className="mt-4 space-y-3">{current.notes.value.filter((note) => !note.archivedAt).map((note) => <li key={note.id} className="rounded-xl border border-slate-200 p-4"><p className="whitespace-pre-wrap break-words text-sm text-slate-800">{note.body}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>{memberLabels.get(note.authorId ?? "") || (note.authorId ? "Former team member" : "Unknown author")} · {formatCustomerDate(note.createdAt)}</p><button type="button" onClick={() => { if (window.confirm("Archive this internal note?")) void archiveCrmNote(note.id, note.updatedAt).then(() => reload("Internal note archived.")).catch(() => setAnnouncement("The note could not be archived.")); }} className="min-h-11 px-3 font-semibold text-slate-700 underline">Archive note</button></div></li>)}</ul> : <p className="mt-4 text-sm text-slate-600">No internal notes yet.</p>}
      {current.notes.status === "ready" && !current.notes.complete ? <p className="mt-3 text-xs text-slate-500">More notes are available.</p> : null}
      {current.notes.status === "ready" && !current.notes.complete ? <button type="button" onClick={() => setLimit((value) => Math.min(value + 20, 100))} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Load more CRM activity</button> : null}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Manual follow-up</h2><p className="mt-1 text-sm text-slate-600">{open.length} open · {overdue.length} overdue. No messages or reminders are sent automatically.</p></div><button type="button" onClick={() => setMode("task")} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white">Add follow-up</button></div>
      {current.tasks.status === "error" ? <Unavailable /> : current.tasks.value.length ? <ul className="mt-4 space-y-3">{current.tasks.value.map((task) => <TaskCard key={task.id} task={task} now={now} memberLabels={memberLabels} onEdit={() => setMode(`task:${task.id}`)} onChanged={reload} />)}</ul> : <p className="mt-4 text-sm text-slate-600">No manual follow-ups yet.</p>}
      {current.tasks.status === "ready" && !current.tasks.complete ? <p className="mt-3 text-xs text-slate-500">More follow-ups are available.</p> : null}
      {current.tasks.status === "ready" && !current.tasks.complete ? <button type="button" onClick={() => setLimit((value) => Math.min(value + 20, 100))} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Load more CRM activity</button> : null}
    </section>
    {mode === "note" ? <NoteDialog target={target} onClose={() => setMode(null)} onSaved={() => { setMode(null); reload("Internal note added."); }} /> : null}
    {mode?.startsWith("task") ? <TaskDialog target={target} task={mode.includes(":") && current.tasks.status === "ready" ? current.tasks.value.find((task) => `task:${task.id}` === mode) : undefined} members={memberLabels} personal={workspace.type === "personal"} currentUserId={user!.id} onClose={() => setMode(null)} onSaved={() => { setMode(null); reload("Follow-up saved."); }} /> : null}
  </div>;
}

function TaskCard({ task, now, memberLabels, onEdit, onChanged }: {
  task: CrmTask; now: Date; memberLabels: Map<string, string>; onEdit: () => void; onChanged: (message?: string) => void;
}) {
  const due = taskDueLabel(task, now);
  return <li className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{task.title}</h3><p className="mt-1 break-words text-sm text-slate-600">{task.description || "No description"}</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ${due === "Overdue" ? "bg-red-100 text-red-800" : task.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{due}</span></div><p className="mt-2 text-xs text-slate-500">Assignee: {task.assignedTo ? memberLabels.get(task.assignedTo) || "Former team member" : "Unassigned"}{task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString()}` : ""}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void setCrmTaskStatus(task.id, task.updatedAt, task.status === "open" ? "completed" : "open").then(() => onChanged(task.status === "open" ? "Follow-up completed." : "Follow-up reopened.")).catch(() => onChanged("The follow-up changed elsewhere. Reloaded latest data."))} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">{task.status === "open" ? "Mark complete" : "Reopen"}</button><button type="button" onClick={onEdit} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Edit</button><button type="button" onClick={() => { if (window.confirm("Archive this follow-up?")) void archiveCrmTask(task.id, task.updatedAt).then(() => onChanged("Follow-up archived.")); }} className="min-h-11 px-3 text-sm font-semibold underline">Archive</button></div></li>;
}

function Dialog({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); useFocusTrap(ref, true);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; };
  }, [onClose]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><button type="button" tabIndex={-1} aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-slate-950/50" /><div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p>{children}</div></div>;
}

function NoteDialog({ target, onClose, onSaved }: { target: CrmTarget; onClose: () => void; onSaved: () => void }) {
  const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const close = () => { if (!body.trim() || window.confirm("Discard this unsaved note?")) onClose(); };
  return <Dialog title="Add internal note" description="Plain-text workspace-private context. This does not contact the customer." onClose={close}><form className="mt-4" onSubmit={(e) => { e.preventDefault(); setBusy(true); setError(""); void createCrmNote(target, body).then(onSaved).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "The note could not be saved.")).finally(() => setBusy(false)); }}><label className="block text-sm font-semibold">Note body<textarea autoFocus required maxLength={5000} rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base" /></label>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={close} className="min-h-11 rounded-xl border px-4">Cancel</button><button disabled={busy || !body.trim()} className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Add note"}</button></div></form></Dialog>;
}

function TaskDialog({ target, task, members, personal, currentUserId, onClose, onSaved }: { target: CrmTarget; task?: CrmTask; members: Map<string, string>; personal: boolean; currentUserId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? ""); const [description, setDescription] = useState(task?.description ?? ""); const [due, setDue] = useState(task?.dueAt ? task.dueAt.slice(0, 16) : ""); const [assignee, setAssignee] = useState(task?.assignedTo ?? (personal ? currentUserId : "")); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const initial = `${task?.title ?? ""}|${task?.description ?? ""}|${task?.dueAt?.slice(0, 16) ?? ""}|${task?.assignedTo ?? (personal ? currentUserId : "")}`;
  const close = () => { if (`${title}|${description}|${due}|${assignee}` === initial || window.confirm("Discard unsaved follow-up changes?")) onClose(); };
  return <Dialog title={task ? "Edit follow-up" : "Add follow-up"} description="Manual CRM task. No notification or message will be sent." onClose={close}><form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); setBusy(true); setError(""); const values = { title, description: description || null, dueAt: due ? new Date(due).toISOString() : null, assignedTo: assignee || null }; const request = task ? updateCrmTask(task.id, task.updatedAt, values) : createCrmTask(target, values); void request.then(onSaved).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "The follow-up could not be saved.")).finally(() => setBusy(false)); }}><label className="block text-sm font-semibold">Title<input autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base" /></label><label className="block text-sm font-semibold">Description (optional)<textarea maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-base" /></label><label className="block text-sm font-semibold">Due date and time (optional)<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base" /><span className="mt-1 block text-xs font-normal text-slate-500">Interpreted in your browser’s local timezone and stored as an exact time.</span></label>{personal ? <p className="text-sm text-slate-600">Assignee: You</p> : <label className="block text-sm font-semibold">Assignee<select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base"><option value="">Unassigned</option>{[...members].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={close} className="min-h-11 rounded-xl border px-4">Cancel</button><button disabled={busy || !title.trim()} className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save follow-up"}</button></div></form></Dialog>;
}

function Unavailable() { return <p role="status" className="mt-4 text-sm text-amber-800">This CRM section is temporarily unavailable.</p>; }
