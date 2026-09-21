import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/", "/login", "/onboarding", "/customers/:path*", "/vehicles/:path*", "/appointments/:path*", "/work-orders/:path*", "/diagnosis", "/diagnoses/:path*", "/inspections/:path*", "/api/vehicles/:path*", "/api/inspections/:path*", "/estimates/:path*", "/recommendations/:path*", "/reports/:path*", "/invoices/:path*", "/receipts/:path*", "/communications/:path*", "/service-reminders"],
};
