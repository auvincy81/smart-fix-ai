import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthenticatedUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const result = await getCurrentAuthenticatedUser();
  if (result.ok && result.data) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-xl font-black text-white shadow-lg shadow-red-950/20">M</div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-red-600">MekaReports</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Welcome to your shop workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Diagnose. Document. Manage.</p>
          <LoginForm configured={isSupabaseConfigured()} />
        </div>
        <p className="mt-5 text-center text-sm text-slate-400">
          Local workspace access remains open during setup.{" "}
          <Link href="/" className="font-bold text-white hover:text-red-300">Return to dashboard</Link>
        </p>
      </div>
    </main>
  );
}
