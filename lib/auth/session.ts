import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Shop, ShopMember, ShopMemberRole } from "@/types/mekareports";
import type { AuthenticatedShopContext, AuthResult } from "./types";

const roles: readonly ShopMemberRole[] = ["owner", "manager", "service_advisor", "technician"];

function isShopMemberRole(value: string): value is ShopMemberRole {
  return roles.includes(value as ShopMemberRole);
}

export async function getCurrentAuthenticatedUser(): Promise<AuthResult<User | null>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, code: "SUPABASE_NOT_CONFIGURED", message: "MekaReports account services are not connected yet." };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { ok: false, code: "AUTHENTICATION_FAILED", message: "We could not verify the current account." };
  }

  return { ok: true, data: data.user };
}

export const getCurrentShopContext = cache(async (): Promise<AuthResult<AuthenticatedShopContext>> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, code: "SUPABASE_NOT_CONFIGURED", message: "MekaReports account services are not connected yet." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && (userError.status === undefined || userError.status === 0 || userError.status >= 500)) return {ok:false,code:"SHOP_CONTEXT_UNAVAILABLE",message:"Account services are temporarily unavailable. Please try again."};
  if (userError || !userData.user) {
    return { ok: false, code: "NOT_AUTHENTICATED", message: "Sign in to select a shop workspace." };
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("shop_members")
    .select("id, shop_id, user_id, role, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membershipError && !membershipData) {
    return { ok: false, code: "NO_SHOP_MEMBERSHIP", message: "Set up your repair shop to get started." };
  }
  if (membershipError || !membershipData || !isShopMemberRole(membershipData.role)) {
    return { ok: false, code: "SHOP_CONTEXT_UNAVAILABLE", message: "No available shop workspace was found for this account." };
  }

  const { data: shopData, error: shopError } = await supabase
    .from("shops")
    .select("id, name, phone, email, address, city, state, postal_code, created_at, updated_at")
    .eq("id", membershipData.shop_id)
    .maybeSingle();

  if (shopError || !shopData) {
    return { ok: false, code: "SHOP_CONTEXT_UNAVAILABLE", message: "No available shop workspace was found for this account." };
  }

  const membership: ShopMember = {
    id: membershipData.id,
    shopId: membershipData.shop_id,
    userId: membershipData.user_id,
    role: membershipData.role,
    createdAt: membershipData.created_at,
  };
  const shop: Shop = {
    id: shopData.id,
    name: shopData.name,
    phone: shopData.phone,
    email: shopData.email,
    address: shopData.address,
    city: shopData.city,
    state: shopData.state,
    postalCode: shopData.postal_code,
    createdAt: shopData.created_at,
    updatedAt: shopData.updated_at,
  };

  return { ok: true, data: { user: userData.user, shop, membership, role: membership.role } };
});

export async function requireShopContext(): Promise<AuthenticatedShopContext> {
  const result = await getCurrentShopContext();
  if (result.ok) return result.data;
  if (result.code === "NOT_AUTHENTICATED" || result.code === "SUPABASE_NOT_CONFIGURED") redirect("/login");
  if (result.code === "NO_SHOP_MEMBERSHIP") redirect("/onboarding");
  throw new Error("Your shop workspace is temporarily unavailable. Please try again.");
}
