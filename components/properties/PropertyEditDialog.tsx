"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { PropertyMutationError, updateProperty } from "@/lib/properties/mutations";
import type { PropertyDetail } from "@/lib/properties/types";

export function PropertyEditDialog({ detail, onClose, onChanged }: {
  detail: PropertyDetail;
  onClose: () => void;
  onChanged: (announcement?: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  const initial = {
    line1: detail.address.line1 ?? "", line2: detail.address.line2 ?? "",
    city: detail.address.city ?? "", region: detail.address.region ?? "",
    postal: detail.address.postalCode ?? "", country: detail.address.countryCode,
    summary: detail.summary ?? "", access: detail.accessInstructions ?? "",
    tags: detail.tags.join(", "),
    propertyType: detail.attributes["Property type"] ?? "",
    yearBuilt: detail.attributes["Year built"] ?? "",
    stories: detail.attributes.Stories ?? "",
    squareFootage: detail.attributes["Square footage"] ?? "",
    roofType: detail.attributes["Roof type"] ?? "",
    exteriorType: detail.attributes["Exterior type"] ?? "",
    usage: detail.attributes.Usage ?? "",
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => dirty ? setDiscard(true) : onClose();
  const field = (name: keyof typeof form, value: string) => setForm((old) => ({ ...old, [name]: value }));
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) close(); };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = overflow; };
  });
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button type="button" tabIndex={-1} aria-label="Close dialog" onClick={busy ? undefined : close} className="absolute inset-0 bg-slate-950/50" />
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="property-edit-title" aria-describedby="property-edit-description" className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
      <h2 id="property-edit-title" className="text-xl font-semibold text-slate-950">Edit property</h2>
      <p id="property-edit-description" className="mt-1 text-sm text-slate-600">Update operational property information. Marketplace source data remains preserved.</p>
      <form className="mt-5 space-y-5" onSubmit={(event) => {
        event.preventDefault(); setBusy(true); setError(null);
        const attributes = Object.fromEntries([
          ["propertyType", form.propertyType], ["yearBuilt", form.yearBuilt ? Number(form.yearBuilt) : ""],
          ["stories", form.stories], ["squareFootage", form.squareFootage ? Number(form.squareFootage) : ""],
          ["roofType", form.roofType], ["exteriorType", form.exteriorType], ["usage", form.usage],
        ].filter(([, value]) => value !== ""));
        void updateProperty({
          propertyId: detail.id, expectedUpdatedAt: detail.updatedAt,
          addressLine1: form.line1 || null, addressLine2: form.line2 || null,
          city: form.city || null, region: form.region || null, postalCode: form.postal || null,
          countryCode: form.country, summary: form.summary || null,
          accessInstructions: form.access || null,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          attributes,
        }).then(() => { onClose(); onChanged("Property changes saved."); })
          .catch((caught: unknown) => setError({
            message: caught instanceof Error ? caught.message : "The property could not be saved.",
            conflict: caught instanceof PropertyMutationError && caught.kind === "conflict",
          })).finally(() => setBusy(false));
      }}>
        <fieldset><legend className="font-semibold text-slate-900">Address</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" value={form.line1} onChange={(v) => field("line1", v)} maxLength={300} />
            <Field label="Address line 2 (optional)" value={form.line2} onChange={(v) => field("line2", v)} maxLength={300} />
            <Field label="City" value={form.city} onChange={(v) => field("city", v)} maxLength={120} />
            <Field label="State or region" value={form.region} onChange={(v) => field("region", v)} maxLength={120} />
            <Field label="Postal code" value={form.postal} onChange={(v) => field("postal", v)} maxLength={24} />
            <Field label="Country code" value={form.country} onChange={(v) => field("country", v.toUpperCase())} maxLength={2} />
          </div>
        </fieldset>
        <fieldset><legend className="font-semibold text-slate-900">Known property attributes</legend>
          <p className="mt-1 text-xs text-slate-500">Only these operational attributes are displayed. Unknown source data remains preserved.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Property type" value={form.propertyType} onChange={(v) => field("propertyType", v)} />
            <Field label="Year built" type="number" value={form.yearBuilt} onChange={(v) => field("yearBuilt", v)} />
            <Field label="Stories" value={form.stories} onChange={(v) => field("stories", v)} />
            <Field label="Square footage" type="number" value={form.squareFootage} onChange={(v) => field("squareFootage", v)} />
            <Field label="Roof type" value={form.roofType} onChange={(v) => field("roofType", v)} />
            <Field label="Exterior type" value={form.exteriorType} onChange={(v) => field("exteriorType", v)} />
            <Field label="Usage" value={form.usage} onChange={(v) => field("usage", v)} />
          </div>
        </fieldset>
        <label className="block text-sm font-semibold text-slate-800">Property summary (optional)
          <textarea rows={3} maxLength={2000} value={form.summary} onChange={(e) => field("summary", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-base" />
        </label>
        <label className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Private access instructions (optional)
          <span className="mt-1 block text-xs font-normal">Sensitive operational information. Shown only on Property Detail.</span>
          <textarea rows={3} maxLength={2000} value={form.access} onChange={(e) => field("access", e.target.value)} className="mt-2 w-full rounded-xl border border-amber-300 bg-white p-3 text-base text-slate-900" />
        </label>
        <Field label="Tags (comma separated)" value={form.tags} onChange={(v) => field("tags", v)} />
        {error ? <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error.message}{error.conflict ? <button type="button" onClick={() => onChanged()} className="ml-2 font-semibold underline">Reload latest property</button> : null}</div> : null}
        {discard ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold">Discard unsaved changes?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setDiscard(false)} className="min-h-11 rounded-lg border px-3">Keep editing</button><button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-slate-800 px-3 text-white">Discard changes</button></div></div> : null}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">Cancel</button><button type="submit" disabled={busy || !dirty} className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save property"}</button></div>
      </form>
    </div>
  </div>;
}

function Field({ label, value, onChange, type = "text", maxLength }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number;
}) {
  return <label className="block text-sm font-semibold text-slate-800">{label}
    <input type={type} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
  </label>;
}
