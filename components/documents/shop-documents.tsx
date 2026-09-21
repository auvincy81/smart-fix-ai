import Link from "next/link";
import { randomUUID } from "node:crypto";
import { workshopDb } from "@/lib/workshop/data";
import { panel, secondaryLink } from "@/components/workshop/record-ui";
import { moneyText } from "@/lib/repairs/validation";
import { formatTime } from "@/lib/jobs/time";
import { DocumentAction, RevokeLink } from "./forms";

export function SendDocumentLink({ kind,id,label="Send by Email / Text" }: {kind:string;id:string;label?:string}) { return <Link className={`${secondaryLink} no-print min-h-12`} href={`/communications/new?kind=${kind}&id=${id}`}>{label}</Link>; }
export async function JobDocuments({ shopId,jobId,completed,manage }: {shopId:string;jobId:string;completed:boolean;manage:boolean}) {
 const db=await workshopDb();
 const [reports,invoices,receipts]=await Promise.all([
  db.from("repair_reports").select("id,report_number,report_status").eq("shop_id",shopId).eq("work_order_id",jobId).order("created_at",{ascending:false}),
  db.from("work_order_invoices").select("id,invoice_number,status,balance_due").eq("shop_id",shopId).eq("work_order_id",jobId).order("created_at",{ascending:false}),
  db.from("work_order_receipts").select("id,receipt_number").eq("shop_id",shopId).eq("work_order_id",jobId).order("created_at",{ascending:false}),
 ]);
 if(reports.error||invoices.error||receipts.error) throw new Error("Documents temporarily unavailable.");
 return <section className={`${panel} space-y-5`}><h2 className="text-xl font-bold">Reports, Invoices & Receipts</h2>
  {reports.data.map(r=><p key={r.id}><Link className="font-bold text-red-700" href={`/reports/${r.id}`}>{r.report_number}</Link> · {r.report_status}</p>)}
  {invoices.data.map(i=><p key={i.id}><Link className="font-bold text-red-700" href={`/invoices/${i.id}`}>{i.invoice_number} · View / Record Payment</Link> · {i.status.replaceAll("_"," ")} · Balance {moneyText(i.balance_due)}</p>)}
  {receipts.data.map(r=><p key={r.id}><Link className="font-bold text-red-700" href={`/receipts/${r.id}`}>View Receipt {r.receipt_number}</Link></p>)}
  {completed&&manage ? <div className="flex flex-wrap gap-6">{!reports.data.some(r=>r.report_status!=="void")?<DocumentAction kind="repair_report" id={jobId} action="create" label="Generate Final Repair Report" />:null}{!invoices.data.some(i=>i.status!=="void")?<DocumentAction kind="invoice" id={jobId} action="create" label="Create Invoice" />:null}</div>:!completed?<p className="text-sm text-slate-500">Complete the work order before preparing final documents.</p>:null}
 </section>;
}
export async function DocumentLinks({kind,id,shopId}:{kind:string;id:string;shopId:string}) {
 const {data,error}=await(await workshopDb()).from("customer_document_links").select("id,status,created_at,expires_at").eq("shop_id",shopId).eq("document_type",kind).eq("document_id",id).order("created_at",{ascending:false}).limit(20);
 if(error) throw new Error("Document links temporarily unavailable.");
 return data.length?<details className={`${panel} no-print`}><summary className="cursor-pointer font-bold">Shared Links</summary><ul className="mt-4 space-y-4">{data.map(l=><li key={l.id} className="space-y-2"><p className="text-sm">Created {formatTime(l.created_at)} · {l.status} · Expires {formatTime(l.expires_at)}</p>{l.status==="active"?<RevokeLink id={l.id}/>:null}</li>)}</ul></details>:null;
}
export async function DocumentHistory({shopId,customerId,vehicleId,manage}:{shopId:string;customerId:string;vehicleId?:string;manage:boolean}) {
 const db=await workshopDb(); let rq=db.from("repair_reports").select("id,report_number,report_status").eq("shop_id",shopId).eq("customer_id",customerId).order("created_at",{ascending:false}).limit(25);
 let iq=db.from("work_order_invoices").select("id,invoice_number,status,total,amount_paid,balance_due").eq("shop_id",shopId).eq("customer_id",customerId).order("created_at",{ascending:false}).limit(25);
 let cq=db.from("customer_communications").select("id,channel,type,recipient,status,provider,error_message,created_at").eq("shop_id",shopId).eq("customer_id",customerId).order("created_at",{ascending:false}).limit(25);
 if(vehicleId){rq=rq.eq("vehicle_id",vehicleId);iq=iq.eq("vehicle_id",vehicleId);cq=cq.eq("vehicle_id",vehicleId);}
 const [reports,invoices,communications]=await Promise.all([rq,iq,cq]); if(reports.error||invoices.error||communications.error) throw new Error("Document history temporarily unavailable.");
 const receipts=invoices.data.length?await db.from("work_order_receipts").select("id,invoice_id,receipt_number").eq("shop_id",shopId).in("invoice_id",invoices.data.map(i=>i.id)):{data:[],error:null};if(receipts.error)throw new Error("Receipt history unavailable.");
 return <section className={`${panel} space-y-5`}><h2 className="text-xl font-bold">Documents & Communication History</h2><details open><summary className="cursor-pointer font-bold">Final repair reports</summary><ul className="mt-3 space-y-3">{reports.data.map(r=><li key={r.id}><Link className="font-bold text-red-700" href={`/reports/${r.id}`}>{r.report_number}</Link> · {r.report_status}</li>)}</ul>{!reports.data.length?<p className="mt-3 text-sm">No reports recorded.</p>:null}</details>
 {manage?<><details><summary className="cursor-pointer font-bold">Invoices, Payments & Receipts</summary><ul className="mt-3 space-y-4">{invoices.data.map(i=><li key={i.id}><Link className="font-bold text-red-700" href={`/invoices/${i.id}`}>{i.invoice_number}</Link><p className="text-sm">{i.status.replaceAll("_"," ")} · Total {moneyText(i.total)} · Recorded {moneyText(i.amount_paid)} · Balance {moneyText(i.balance_due)}</p>{receipts.data.filter(r=>r.invoice_id===i.id).map(r=><Link className="mr-4 text-sm text-red-700" key={r.id} href={`/receipts/${r.id}`}>{r.receipt_number}</Link>)}</li>)}</ul></details><details open><summary className="cursor-pointer font-bold">Communication History</summary><ul className="mt-3 space-y-4">{communications.data.map(c=><li key={c.id} className="border-t pt-3"><p className="font-semibold capitalize">{c.type.replaceAll("_"," ")} · {c.channel} · {c.status}</p><p className="break-words text-sm">{formatTime(c.created_at)} · {c.recipient}</p><p className="text-sm">{c.error_message}</p>{c.provider==="local_mailpit"?<p className="text-xs text-slate-500">Development mailbox only</p>:null}</li>)}</ul>{!communications.data.length?<p className="mt-3 text-sm">No messages recorded.</p>:null}</details></>:null}<p className="text-xs text-slate-500">Showing up to 25 recent records per section.</p></section>;
}
export function PaymentForm({id}:{id:string}) { return <DocumentAction key={id} kind="invoice" id={id} action="payment" label="Record Payment" payment requestKey={randomUUID()} confirmation="I confirm the shop has received this payment. This records it manually and does not process a card charge."/>; }
