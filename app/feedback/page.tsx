import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { reviewFeedback } from "@/lib/feedback/actions";
import { FeedbackForm } from "@/components/feedback/form";
import { PageHeader } from "@/components/page-header";
import { panel, secondaryLink } from "@/components/workshop/record-ui";
import { formatTime } from "@/lib/jobs/time";

export default async function FeedbackPage({searchParams}:{searchParams:Promise<{path?:string}>}) {
  const context=await requireShopContext(); const query=await searchParams;
  const path=(query.path||"/").split(/[?#]/)[0].replace(/^\/(documents|approve)\/.*$/,"/$1/[private-link]").slice(0,200);
  const {data,error}=await(await workshopDb()).from("beta_feedback").select("id,path,category,message,status,created_at").eq("shop_id",context.shop.id).order("created_at",{ascending:false}).limit(50);
  if(error)throw new Error("Feedback is temporarily unavailable.");
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/" className={secondaryLink}>← Dashboard</Link><PageHeader eyebrow={context.shop.name} title="Beta Feedback" description="Help improve MekaReports. Feedback stays in your shop's local workspace; it is not sent to an external service."/><section className={panel}><FeedbackForm requestKey={randomUUID()} path={path.startsWith("/")&&!path.startsWith("//")?path:"/"}/></section><section className={`${panel} space-y-5`}><h2 className="text-xl font-bold">Recent feedback</h2><p className="text-sm text-slate-600">Up to 50 recent entries. Shop managers can review all shop feedback; technicians see their own.</p>{data.map(f=><article key={f.id} className="space-y-2 border-t pt-4"><p className="font-bold capitalize">{f.category.replaceAll("_"," ")} · {f.status}</p><p className="break-words text-sm">{f.path} · {formatTime(f.created_at)}</p><p className="whitespace-pre-wrap break-words">{f.message}</p>{canManageRecords(context.role)?<form action={reviewFeedback.bind(null,f.id)} className="flex flex-wrap gap-3"><label>Status<select name="status" defaultValue={f.status} className="ml-2 min-h-12 rounded-xl border p-3"><option value="new">New</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></select></label><button className={secondaryLink}>Update Status</button></form>:null}</article>)}{!data.length?<p>No feedback yet.</p>:null}</section></div>;
}
