import { notFound } from "next/navigation";
import { publicDocument } from "@/lib/documents/data";
import { DocumentView } from "@/components/documents/document-view";
export const dynamic="force-dynamic";
export const metadata={title:"Customer Document | MekaReports",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function CustomerDocumentPage({params}:{params:Promise<{token:string}>}) { const d=await publicDocument((await params).token);if(!d)notFound();return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12"><DocumentView document={d}/></main>; }
