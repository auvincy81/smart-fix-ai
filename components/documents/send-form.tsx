"use client";

import { useState, useTransition } from "react";
import { prepareCommunication, sendCommunication } from "@/lib/documents/actions";
import type { DocumentKind, DocumentState } from "@/lib/documents/validation";
import { primaryLink, secondaryLink } from "@/components/workshop/record-ui";

export function SendForm({ kind,id,email,phone,requestKey }: { kind: DocumentKind; id: string; email: string | null; phone: string | null; requestKey: string }) {
  const [channel,setChannel]=useState<"email"|"sms">("email"); const [recipient,setRecipient]=useState(email || ""); const [message,setMessage]=useState("Please review your document from our shop. Contact us with any questions.");
  const [request,setRequest]=useState(requestKey); const [draft,setDraft]=useState<DocumentState>({}); const [result,setResult]=useState(""); const [pending,transition]=useTransition();
  const [sent,setSent]=useState(false); const [copied,setCopied]=useState(false);
  return <div className="space-y-5"><form aria-label="Prepare customer message" onSubmit={(event) => { event.preventDefault(); setResult(""); transition(async () => setDraft(await prepareCommunication({kind,id,channel,recipient,message,request}))); }}>
    <fieldset disabled={pending || !!draft.id} className="space-y-4"><label className="block font-semibold">Channel<select value={channel} onChange={(e) => { const next=e.target.value as "email"|"sms";setChannel(next);setRecipient((next==="email"?email:phone)||""); }} className="mt-2 min-h-12 w-full rounded-xl border p-3"><option value="email">Email — local Mailpit only</option><option value="sms">Text — provider not configured</option></select></label>
      <label className="block font-semibold">Recipient<input value={recipient} onChange={(e)=>setRecipient(e.target.value)} type={channel==="email"?"email":"tel"} required maxLength={254} placeholder={channel==="email"?"customer@example.com":"+15555550123"} className="mt-2 min-h-12 w-full rounded-xl border p-3" /></label>
      {channel === "sms" ? <p className="text-sm text-slate-600">Use an international phone number beginning with + and the country code, without spaces or punctuation. SMS provider not configured.</p> : null}
      <label className="block font-semibold">Message<textarea value={message} onChange={(e)=>setMessage(e.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border p-3" /></label>
      <p className="text-sm text-slate-600">Verify the recipient. A private document link will be appended. {kind==="approval_request"?"Preparing this message replaces previous unanswered approval links.":"This creates a fixed snapshot link expiring in 30 days."}</p>
      <button disabled={pending} className={`${primaryLink} min-h-12`}>Save Draft & Preview</button>
    </fieldset></form>
    {draft.message ? <p role="status" className="rounded-xl bg-slate-100 p-4">{draft.message}</p> : null}
    {draft.path ? <section className="space-y-4 rounded-xl border bg-white p-5"><h2 className="font-bold">Message Preview</h2><p className="break-words">To: {recipient}</p><p className="whitespace-pre-wrap">{message}</p><a href={draft.path} target="_blank" rel="noreferrer" className="block font-bold text-red-700">Open Private Document</a><p className="break-all text-xs text-slate-500">{draft.path}</p>
      <button className={`${primaryLink} min-h-12`} disabled={pending || sent} onClick={()=>transition(async()=>{ const answer=await sendCommunication(draft.id!,draft.token!);setResult(answer.message||"");setSent(!!answer.success); })}>{channel==="email"?"Send to Local Mailpit":"Attempt Text Send"}</button>
      <button className={`${secondaryLink} ml-2 min-h-12`} onClick={async()=>{try{await navigator.clipboard.writeText(`${message}\n\n${window.location.origin}${draft.path}`);setCopied(true);}catch{setCopied(false);setResult("Copy is unavailable. Select and copy the preview link manually.");}}}>{copied?"Message Copied":"Copy Message & Link"}</button>
    </section> : null}
    {result ? <p role="status" className="rounded-xl bg-amber-50 p-4">{result}</p> : null}
    {draft.id ? <button className={secondaryLink} disabled={pending} onClick={()=>{setDraft({});setRequest(crypto.randomUUID());setResult("");setSent(false);setCopied(false);}}>Prepare Another Message</button> : null}
  </div>;
}
