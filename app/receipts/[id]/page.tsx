import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShopContext } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/workshop/permissions";
import { previewDocument } from "@/lib/documents/data";
import { DocumentView } from "@/components/documents/document-view";
import { ShareDocument } from "@/components/documents/forms";
import { DocumentLinks } from "@/components/documents/shop-documents";
export default async function ReceiptPage({params}:{params:Promise<{id:string}>}){const c=await requireShopContext();if(!canManageRecords(c.role))notFound();const {id}=await params;const d=await previewDocument("receipt",id);return <div className="space-y-6"><Link className="no-print font-bold text-red-700" href="/work-orders">← Work Orders</Link><DocumentView document={d}/><ShareDocument kind="receipt" id={id}/><DocumentLinks kind="receipt" id={id} shopId={c.shop.id}/></div>;}
