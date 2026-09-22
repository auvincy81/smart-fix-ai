"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <div><button type="button" disabled={pending} className="min-h-12 rounded-xl border border-slate-500 px-4 py-3 text-sm font-bold disabled:opacity-50" onClick={() => startTransition(async () => {
    try {
      const result = await signOut();
      if (!result.ok) { setMessage(result.message); return; }
      router.replace("/login"); router.refresh();
    } catch { setMessage("Sign out could not finish. Check your connection and try again."); }
  })}>{pending ? "Signing Out…" : "Sign Out"}</button>{message ? <p role="alert" className="mt-2 text-sm">{message}</p> : null}</div>;
}
