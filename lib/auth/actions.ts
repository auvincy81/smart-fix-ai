"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthResult, SignUpResult } from "./types";

const unavailable = <T = undefined>(): AuthResult<T> => ({
  ok: false,
  code: "SUPABASE_NOT_CONFIGURED",
  message:
    "MekaReports account services are being configured. The local development workspace remains available.",
});

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return unavailable();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "We could not sign you in. Check your email and password and try again.",
    };
  }

  return { ok: true, data: undefined };
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult<SignUpResult>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return unavailable();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return {
      ok: false,
      code: "SIGN_UP_FAILED",
      message: "We could not create your account. Please review your details and try again.",
    };
  }

  return { ok: true, data: { requiresEmailConfirmation: data.session === null } };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return unavailable();

  const { error } = await supabase.auth.signOut({scope:"local"});
  if (error) {
    return {
      ok: false,
      code: "SIGN_OUT_FAILED",
      message: "We could not sign you out. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
