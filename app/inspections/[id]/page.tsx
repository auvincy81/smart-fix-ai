import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Details, panel, primaryLink, secondaryLink, vehicleTitle } from "@/components/workshop/record-ui";
import { StatusBadge } from "@/components/jobs/job-ui";
import { ReadinessSummary } from "@/components/inspections/readiness";
import { PhotoUpload, PrintInspection } from "@/components/inspections/photos";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer, getVehicle, workshopDb } from "@/lib/workshop/data";
import { getWorkOrder } from "@/lib/jobs/data";
import { getInspection, inspectionItems } from "@/lib/inspections/data";
import { typeLabel } from "@/lib/inspections/validation";
import { formatTime } from "@/lib/jobs/time";

export default async function InspectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; completed?: string }> }) {
  const context = await requireShopContext();
  const inspection = await getInspection(context.shop.id, (await params).id);
  const db = await workshopDb();
  const [items, job, vehicle, photos] = await Promise.all([inspectionItems(inspection.id), getWorkOrder(context.shop.id, inspection.work_order_id), getVehicle(context.shop.id, inspection.vehicle_id), db.from("inspection_photos").select("*").eq("shop_id", context.shop.id).eq("inspection_id", inspection.id).order("created_at")]);
  if (photos.error) throw new Error("Inspection photos are temporarily unavailable.");
  const customer = await getCustomer(context.shop.id, job.customerId);
  const signed = photos.data.length ? await db.storage.from("inspection-photos").createSignedUrls(photos.data.map((p) => p.storage_path), 900) : null;
  const feedback = await searchParams;
  const categories = [...new Set(items.map((i) => i.category))];
  return <article className="inspection-print space-y-6">
    <div className="no-print flex flex-wrap gap-4"><Link className="text-sm font-bold text-red-700" href="/inspections">← Inspections</Link><Link className="text-sm font-bold text-red-700" href={`/work-orders/${job.id}`}>← {job.workOrderNumber}</Link></div>
    <PageHeader eyebrow={context.shop.name} title={typeLabel(inspection.inspection_type)} description={`Inspection date: ${formatTime(inspection.created_at)}`} />
    {(feedback.saved || feedback.completed) ? <p role="status" className="no-print rounded-xl bg-emerald-50 p-4 text-emerald-800">{feedback.completed ? "Inspection completed. The work order status is unchanged." : "Inspection progress saved."}</p> : null}
    <div className="flex flex-wrap items-center gap-3"><StatusBadge status={inspection.status} /><PrintInspection />{inspection.status !== "completed" ? <Link className={`${primaryLink} no-print`} href={`/inspections/${inspection.id}/edit`}>Continue Inspection</Link> : <Link className={`${secondaryLink} no-print`} href={`/inspections/new?workOrderId=${job.id}&type=${inspection.inspection_type}`}>Start Another Inspection</Link>}</div>
    <section className={panel}><Details entries={[["Shop", context.shop.name], ["Shop contact", [context.shop.phone, context.shop.email].filter(Boolean).join(" · ")], ["Customer", `${customer.firstName} ${customer.lastName}`], ["Vehicle", vehicleTitle(vehicle)], ["VIN", vehicle.vin], ["Mileage in", job.mileageIn ?? vehicle.mileage], ["Work order", job.workOrderNumber], ["Technician", inspection.technician_id ? `Staff ${inspection.technician_id.slice(0, 8)}` : "Unassigned"], ["Completed", inspection.completed_at ? formatTime(inspection.completed_at) : null], ["Checklist", `${inspection.template_key || "Legacy checklist"} · ${inspection.criteria_version || "Unversioned"}`], ["Summary", inspection.summary]]} /></section>
    <ReadinessSummary inspection={inspection} items={items} />
    {categories.map((category) => <section key={category} className={panel}><h2 className="mb-4 text-xl font-bold">{category}</h2><div className="divide-y divide-slate-200">{items.filter((i) => i.category === category).map((i) => <div key={i.id} className="inspection-result-item space-y-2 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{i.item_name}</h3><span className={`rounded-full px-3 py-1 text-sm font-bold ${i.condition === "urgent" ? "bg-red-50 text-red-800" : i.condition === "attention" ? "bg-amber-50 text-amber-900" : i.condition === "good" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{i.condition === "not_checked" ? "Not Checked" : i.condition[0].toUpperCase() + i.condition.slice(1)}</span></div>{i.measurement ? <p className="whitespace-pre-wrap text-sm">Measurement: {i.measurement}</p> : null}{i.technician_note ? <p className="whitespace-pre-wrap text-sm">Observation: {i.technician_note}</p> : null}{i.recommendation ? <p className="whitespace-pre-wrap text-sm font-semibold">Recommendation: {i.recommendation}</p> : null}{i.critical ? <p className="text-xs text-slate-500">Critical item</p> : null}</div>)}</div></section>)}
    <section className={panel}><h2 className="text-xl font-bold">Inspection Photos</h2>{photos.data.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2">{photos.data.map((photo, index) => {
      const url = signed?.data?.[index]?.signedUrl;
      return <figure key={photo.id} className="inspection-result-item">{url ? <Image unoptimized src={url} alt={photo.caption || "Inspection observation"} width={800} height={600} className="h-auto max-h-96 w-full rounded-xl object-contain" /> : <p className="text-sm">Photo temporarily unavailable. Refresh this page to retry.</p>}<figcaption className="mt-2 text-sm">{photo.inspection_item_id ? `${items.find((i) => i.id === photo.inspection_item_id)?.item_name ?? "Checklist item"}: ` : ""}{photo.caption || "Inspection photo"}</figcaption></figure>;
    })}</div> : <p className="mt-3 text-sm text-slate-500">No photos have been added.</p>}<PhotoUpload inspectionId={inspection.id} items={items} /></section>
    {inspection.inspection_type !== "pre_inspection" ? <p className="text-sm text-slate-600">This report records shop observations and recommendations. It is not an official government vehicle inspection or certification.</p> : null}
  </article>;
}
