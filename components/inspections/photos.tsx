"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { primaryLink } from "@/components/workshop/record-ui";

export function PhotoUpload({ inspectionId, items }: { inspectionId: string; items: { id: string; item_name: string }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="no-print mt-6 space-y-4 rounded-xl border border-slate-200 p-4" onSubmit={async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/photos`, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Photo could not be saved.");
      form.reset(); setMessage("Photo saved privately to this inspection."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Photo could not be saved. Try again."); }
    finally { setPending(false); }
  }}>
    <h3 className="font-bold">Add Inspection Photo</h3><p className="text-sm text-slate-500">JPEG, PNG, or WebP up to 5 MB. Photos are private to your shop.</p>
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Photo<input required name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full min-w-0 text-sm" /></label><label className="text-sm font-semibold">Checklist item (optional)<select name="itemId" className="mt-2 w-full rounded-xl border border-slate-300 p-3"><option value="">Whole inspection</option>{items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}</select></label><label className="text-sm font-semibold sm:col-span-2">Caption<input name="caption" maxLength={500} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><button disabled={pending} className={`${primaryLink} disabled:opacity-50`}>{pending ? "Uploading…" : "Upload Photo"}</button></fieldset>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </form>;
}
export function PrintInspection() {
  return <button className="no-print rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold" onClick={() => window.print()}>Print / Save Preview</button>;
}
