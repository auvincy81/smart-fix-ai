import type { User } from "@supabase/supabase-js";
import type { Shop, ShopMember, ShopMemberRole } from "@/types/mekareports";

export type AuthFailureCode =
  | "SUPABASE_NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "SIGN_UP_FAILED"
  | "SIGN_OUT_FAILED"
  | "AUTHENTICATION_FAILED"
  | "NOT_AUTHENTICATED"
  | "NO_SHOP_MEMBERSHIP"
  | "SHOP_CONTEXT_UNAVAILABLE";

export type AuthResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: AuthFailureCode; message: string };

export type SignUpResult = { requiresEmailConfirmation: boolean };

export interface AuthenticatedShopContext {
  user: User;
  shop: Shop;
  membership: ShopMember;
  role: ShopMemberRole;
}
