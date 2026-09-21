import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { documentSchema } from "@/lib/documents/validation";
import { previewDocument } from "@/lib/documents/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { DocumentView } from "@/components/documents/document-view";
import { DocumentAction,ShareDocument } from "@/components/documents/forms";
import { DocumentLinks,PaymentForm } from "@/components/documents/shop-documents";
import { moneyText } from "@/lib/repairs/validation";
import { panel } from "@/components/workshop/record-ui";
export default async function InvoicePage({params}:{params:Promise<{id:string}>}){
 const c=await requireShopContext();if(!canManageRecords(c.role))notFound();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const db=await workshopDb();const {data:i,error}=await db.from("work_order_invoices").select("*").eq("id",id).eq("shop_id",c.shop.id).maybeSingle();if(error)throw new Error("Invoice unavailable.");if(!i)notFound();
 const d=["draft","void"].includes(i.status)?documentSchema.parse(i.snapshot):await previewDocument("invoice",id);const [payments,receipts]=await Promise.all([db.from("work_order_payments").select("id,amount,payment_method,paid_at").eq("invoice_id",id).order("paid_at"),db.from("work_order_receipts").select("id,receipt_number,payment_id").eq("invoice_id",id)]);if(payments.error||receipts.error)throw new Error("Payment history unavailable.");
 return <div className="space-y-6"><Link className="no-print font-bold text-red-700" href={`/work-orders/${i.work_order_id}`}>← Work Order</Link><DocumentView document={{...d,status:i.status}}/><section className={`${panel} space-y-3`}><p className="text-2xl font-bold">Total {moneyText(i.total)} · pre-tax</p><p>Recorded payments {moneyText(i.amount_paid)} · Balance due {moneyText(i.balance_due)}</p></section>
 {i.status==="draft"?<DocumentAction kind="invoice" id={id} action="issue" label="Issue Invoice" confirmation="I reviewed the completed repair prices. This invoice is pre-tax; no tax rules have been applied."/>:i.status!=="void"?<ShareDocument kind="invoice" id={id}/>:null}
 {["issued","partially_paid"].includes(i.status)?<section className={panel}><h2 className="mb-4 text-xl font-bold">Record Payment</h2><PaymentForm id={id}/></section>:null}
 <section className={`${panel} space-y-4`}><h2 className="text-xl font-bold">Payments & Receipts</h2>{payments.data.map(p=><div key={p.id}><p>{moneyText(p.amount)} · {p.payment_method} · {new Date(p.paid_at).toLocaleDateString("en-US")}</p>{receipts.data.filter(r=>r.payment_id===p.id).map(r=><Link key={r.id} className="font-bold text-red-700" href={`/receipts/${r.id}`}>View Receipt {r.receipt_number}</Link>)}</div>)}{!payments.data.length?<p>No payments recorded. Receipts are created only after payment.</p>:null}</section>
 {i.amount_paid===0&&["draft","issued"].includes(i.status)?<details className="no-print"><summary className="cursor-pointer text-sm">Void incorrect invoice</summary><DocumentAction kind="invoice" id={id} action="void" label="Void Invoice" confirmation="Void this unpaid invoice and revoke its shared links. A replacement can be created from the work order."/></details>:null}<DocumentLinks kind="invoice" id={id} shopId={c.shop.id}/></div>;
}
