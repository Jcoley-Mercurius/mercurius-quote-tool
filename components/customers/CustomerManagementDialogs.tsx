"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/lib/organizations/types";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { archiveCustomer, CustomerMutationError, restoreCustomer, updateCustomer } from "@/lib/customers/mutations";
import { findCustomerDuplicates } from "@/lib/customers/repository";
import type { CustomerDetail, CustomerDuplicateCandidate } from "@/lib/customers/types";
import type { PreferredContactMethod } from "@/lib/supabase/types";

export function CustomerManagementActions({
  detail,
  user,
  workspace,
  onChanged,
}: {
  detail: CustomerDetail;
  user: User;
  workspace: Workspace;
  onChanged: (announcement?: string) => void;
}) {
  const [mode, setMode] = useState<"edit" | "archive" | null>(null);
  return <>
    <div className="flex flex-wrap gap-2">
      {!detail.archivedAt ? (
        <>
          <button type="button" onClick={() => setMode("edit")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500">
            Edit customer
          </button>
          <button type="button" onClick={() => setMode("archive")} className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500">
            Archive
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setMode("archive")} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500">
          Restore customer
        </button>
      )}
    </div>
    {mode === "edit" ? (
      <EditDialog detail={detail} user={user} workspace={workspace} onClose={() => setMode(null)} onChanged={onChanged} />
    ) : null}
    {mode === "archive" ? (
      <ArchiveDialog detail={detail} onClose={() => setMode(null)} onChanged={onChanged} />
    ) : null}
  </>;
}

function DialogFrame({ title, description, children, onClose, busy }: {
  title: string; description: string; children: React.ReactNode; onClose: () => void; busy: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
    };
  }, [busy, onClose]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button type="button" tabIndex={-1} aria-label="Close dialog" onClick={busy ? undefined : onClose} className="absolute inset-0 bg-slate-950/50" />
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="customer-dialog-title" aria-describedby="customer-dialog-description" className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
      <h2 id="customer-dialog-title" className="text-xl font-semibold text-slate-950">{title}</h2>
      <p id="customer-dialog-description" className="mt-1 text-sm text-slate-600">{description}</p>
      {children}
    </div>
  </div>;
}

function EditDialog({ detail, user, workspace, onClose, onChanged }: {
  detail: CustomerDetail; user: User; workspace: Workspace; onClose: () => void; onChanged: (announcement?: string) => void;
}) {
  const initial = {
    displayName: detail.displayName,
    companyName: detail.companyName ?? "",
    email: detail.email ?? "",
    phone: detail.phone ?? "",
    preferred: detail.preferredContactMethod ?? "",
    summary: detail.summary ?? "",
    tags: detail.tags.join(", "),
  };
  const [form, setForm] = useState(initial);
  const [duplicates, setDuplicates] = useState<CustomerDuplicateCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null);
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void findCustomerDuplicates(user.id, workspace, detail.id, {
        displayName: form.displayName,
        email: form.email || null,
        phone: form.phone || null,
      }).then(setDuplicates).catch(() => setDuplicates([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [detail.id, form.displayName, form.email, form.phone, user.id, workspace]);
  const close = () => dirty ? setDiscard(true) : onClose();
  const field = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  return <DialogFrame title="Edit customer" description="Update the customer profile. Related records and Marketplace identifiers stay unchanged." onClose={close} busy={busy}>
    <form className="mt-5 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      void updateCustomer({
        customerId: detail.id,
        expectedUpdatedAt: detail.updatedAt,
        displayName: form.displayName,
        companyName: form.companyName || null,
        email: form.email || null,
        phone: form.phone || null,
        preferredContactMethod: (form.preferred || null) as PreferredContactMethod | null,
        summary: form.summary || null,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      }).then(() => {
        onClose();
        onChanged("Customer changes saved.");
      }).catch((caught: unknown) => {
        const conflict = caught instanceof CustomerMutationError && caught.kind === "conflict";
        setError({ message: caught instanceof Error ? caught.message : "The customer could not be saved.", conflict });
      }).finally(() => setBusy(false));
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" required value={form.displayName} onChange={(value) => field("displayName", value)} />
        <Field label="Company" value={form.companyName} onChange={(value) => field("companyName", value)} />
        <Field label="Email" type="email" value={form.email} onChange={(value) => field("email", value)} />
        <Field label="Phone" type="tel" value={form.phone} onChange={(value) => field("phone", value)} />
      </div>
      <label className="block text-sm font-semibold text-slate-800">Preferred contact
        <select value={form.preferred} onChange={(event) => field("preferred", event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base">
          <option value="">Not specified</option><option value="email">Email</option><option value="phone">Phone</option><option value="text">Text</option><option value="none">None</option>
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-800">Customer summary
        <textarea value={form.summary} maxLength={2000} rows={4} onChange={(event) => field("summary", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base" />
      </label>
      <Field label="Tags (comma separated)" value={form.tags} onChange={(value) => field("tags", value)} />
      {duplicates.length ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Possible duplicate customers</p>
        <p className="mt-1">Review these advisory matches. Saving will not merge or block records.</p>
        <ul className="mt-2 space-y-1">{duplicates.map((candidate) => <li key={candidate.id}>
          <Link className="font-semibold underline" href={`/customers/${candidate.id}`}>{candidate.displayName}</Link>
          {candidate.archived ? " (archived)" : ""} · {candidate.reasons.join(", ")}
        </li>)}</ul>
      </div> : null}
      {error ? <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error.message}{error.conflict ? <button type="button" onClick={onChanged} className="ml-2 font-semibold underline">Reload latest customer</button> : null}</div> : null}
      {discard ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-semibold">Discard unsaved changes?</p>
        <div className="mt-2 flex gap-2"><button type="button" onClick={() => setDiscard(false)} className="min-h-11 rounded-lg border px-3">Keep editing</button><button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-slate-800 px-3 text-white">Discard changes</button></div>
      </div> : null}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">Cancel</button><button type="submit" disabled={busy || !dirty} className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></div>
    </form>
  </DialogFrame>;
}

function ArchiveDialog({ detail, onClose, onChanged }: {
  detail: CustomerDetail; onClose: () => void; onChanged: (announcement?: string) => void;
}) {
  const archived = Boolean(detail.archivedAt);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <DialogFrame title={archived ? "Restore customer?" : "Archive customer?"} description={archived ? "The customer will return to the active directory." : "The customer leaves the active directory, but properties, opportunities, quotes, and history are preserved."} onClose={onClose} busy={busy}>
    {!archived ? <label className="mt-5 block text-sm font-semibold text-slate-800">Reason (optional)
      <textarea maxLength={300} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base" />
    </label> : null}
    {error ? <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
    <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">Cancel</button><button type="button" disabled={busy} onClick={() => {
      setBusy(true); setError(null);
      const request = archived
        ? restoreCustomer(detail.id, detail.updatedAt)
        : archiveCustomer(detail.id, detail.updatedAt, reason || null);
      void request.then(() => {
        onClose();
        onChanged(archived ? "Customer restored." : "Customer archived.");
      }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "The customer could not be changed.")).finally(() => setBusy(false));
    }} className={`min-h-11 rounded-xl px-4 font-semibold text-white ${archived ? "bg-emerald-700" : "bg-amber-700"}`}>{busy ? "Working…" : archived ? "Restore customer" : "Archive customer"}</button></div>
  </DialogFrame>;
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
}) {
  return <label className="block text-sm font-semibold text-slate-800">{label}
    <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
  </label>;
}
