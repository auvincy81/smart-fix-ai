import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireShopContext } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/workshop/permissions";
import { documentKind } from "@/lib/documents/validation";
import { documentCustomer,previewDocument } from "@/lib/documents/data";
import { DocumentView } from "@/components/documents/document-view";
import { DocumentLinks } from "@/components/documents/shop-documents";
import { SendForm } from "@/components/documents/send-form";
import { panel } from "@/components/workshop/record-ui";
export default async function NewCommunication({searchParams}:{searchParams:Promise<{kind?:string;id?:string}>}){
 const c=await requireShopContext();if(!canManageRecords(c.role))notFound();const q=await searchParams;const kind=documentKind.safeParse(q.kind);if(!kind.success||!q.id)notFound();const [d,customer]=await Promise.all([previewDocument(kind.data,q.id),documentCustomer(kind.data,q.id,c.shop.id)]);
 return <div className="mx-auto max-w-4xl space-y-6"><Link className="font-bold text-red-700" href={`/customers/${customer.id}`}>← Customer History</Link><h1 className="text-3xl font-bold">Send Customer Document</h1><p>{d.title} {d.number} · {d.context.customer}</p><section className={panel}><SendForm key={`${kind.data}-${q.id}`} kind={kind.data} id={q.id} email={customer.email} phone={customer.phone} requestKey={randomUUID()}/></section><details className={panel}><summary className="cursor-pointer font-bold">Review Customer Document</summary><div className="mt-5"><DocumentView document={d}/></div></details>{kind.data!=="approval_request"?<DocumentLinks kind={kind.data} id={q.id} shopId={c.shop.id}/>:null}</div>;
}
