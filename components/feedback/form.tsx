"use client";
import { useActionState, useState } from "react";
import { submitFeedback } from "@/lib/feedback/actions";
import { primaryLink } from "@/components/workshop/record-ui";

export function FeedbackForm({requestKey,path}:{requestKey:string;path:string}) {
  const [id] = useState(requestKey);
  const [state, action, pending] = useActionState(submitFeedback, {});
  return <form action={action} onReset={e=>e.preventDefault()} className="space-y-4"><input type="hidden" name="id" value={id}/><fieldset disabled={pending||state.saved} className="space-y-4">
    <label className="block font-semibold">Page<input name="path" defaultValue={path} maxLength={200} required className="mt-2 min-h-12 w-full rounded-xl border p-3"/></label>
    <label className="block font-semibold">Category<select name="category" className="mt-2 min-h-12 w-full rounded-xl border p-3"><option value="bug">Something is broken</option><option value="confusing">Something is confusing</option><option value="feature_request">An improvement idea</option><option value="other">Other feedback</option></select></label>
    <label className="block font-semibold">What happened?<textarea name="message" required minLength={5} maxLength={2000} rows={5} className="mt-2 w-full rounded-xl border p-3" aria-describedby="feedback-help"/></label>
    <p id="feedback-help" className="text-sm text-slate-600">Describe what you expected and what happened. Include steps to repeat it. Do not include passwords, payment credentials, customer personal details, or private links.</p>
    <button className={`${primaryLink} min-h-12`} disabled={pending||state.saved}>{pending?"Saving…":state.saved?"Feedback Saved":"Send Beta Feedback"}</button>
  </fieldset>{state.message?<p role="status" className="rounded-xl bg-slate-100 p-4">{state.message}</p>:null}</form>;
}
