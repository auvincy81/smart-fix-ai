import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { documentSchema } from "@/lib/documents/validation";
import { DocumentView } from "@/components/documents/document-view";
import { DocumentAction,ShareDocument } from "@/components/documents/forms";
import { DocumentLinks } from "@/components/documents/shop-documents";
export default async function ReportPage({params}:{params:Promise<{id:string}>}){
 const c=await requireShopContext();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const {data:r,error}=await(await workshopDb()).from("repair_reports").select("*").eq("shop_id",c.shop.id).eq("id",id).maybeSingle();if(error)throw new Error("Report unavailable.");if(!r)notFound();const parsed=documentSchema.safeParse(r.report_snapshot);if(!parsed.success)throw new Error("Report snapshot unavailable.");const manage=canManageRecords(c.role);
 return <div className="space-y-6"><Link className="no-print font-bold text-red-700" href={`/work-orders/${r.work_order_id}`}>← Work Order</Link>{r.report_status==="void"?<p className="rounded-xl bg-red-50 p-4 font-bold">VOID — retained for history. Do not use this report.</p>:null}<DocumentView document={{...parsed.data,status:r.report_status}}/>{manage&&r.report_status==="draft"?<DocumentAction kind="repair_report" id={id} action="finalize" label="Finalize Repair Report" confirmation="I reviewed the entire customer-facing snapshot, including completion notes. Finalization preserves this document permanently."/>:null}{manage&&r.report_status==="final"?<><ShareDocument kind="repair_report" id={id}/><details className="no-print"><summary className="cursor-pointer text-sm">Void incorrect report</summary><div className="mt-4"><DocumentAction kind="repair_report" id={id} action="void" label="Void Report" confirmation="Mark this report void and revoke its shared links. The original snapshot remains in history."/></div></details></>:null}{manage?<DocumentLinks kind="repair_report" id={id} shopId={c.shop.id}/>:null}</div>;
}
