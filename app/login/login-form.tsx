"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/actions";

type LoginFormProps = { configured: boolean };
type Notice = { tone: "success" | "error"; message: string } | null;

export function LoginForm({ configured }: LoginFormProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"sign-in" | "sign-up" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(pendingAction)return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === "sign-up" ? "sign-up" : "sign-in";
    setPendingAction(action);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      if (action === "sign-up") {
        const result = await signUpWithEmail(email, password);
        if (!result.ok) {
          setNotice({ tone: "error", message: result.message });
          setPendingAction(null);
          return;
        }

        if (result.data.requiresEmailConfirmation) {
          setNotice({
            tone: "success",
            message: "Account started. Check your email to confirm your address, then sign in to set up your shop.",
          });
          setPendingAction(null);
          return;
        }
      } else {
        const result = await signInWithEmail(email, password);
        if (!result.ok) {
          setNotice({ tone: "error", message: result.message });
          setPendingAction(null);
          return;
        }
      }

      router.replace("/");
      router.refresh();
    } catch {
      setNotice({tone:"error",message:"Account services could not be reached. Check your connection and try again."});
      setPendingAction(null);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="text-sm font-bold text-slate-700">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={!configured || pendingAction !== null}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="you@repairshop.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-bold text-slate-700">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          disabled={!configured || pendingAction !== null}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Enter your password"
        />
      </div>

      {!configured ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          MekaReports account services are being configured. The local development workspace remains available.
        </div>
      ) : null}

      {notice ? (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          name="intent"
          value="sign-in"
          disabled={!configured || pendingAction !== null}
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pendingAction === "sign-in" ? "Signing In…" : "Sign In"}
        </button>
        <button
          type="submit"
          name="intent"
          value="sign-up"
          disabled={!configured || pendingAction !== null}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {pendingAction === "sign-up" ? "Creating Account…" : "Create Shop Account"}
        </button>
      </div>
      <p className="text-center text-xs leading-5 text-slate-500">
        After signing in, open Customers or Vehicles to set up your shop workspace.
      </p>
    </form>
  );
}
