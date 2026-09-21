import { z } from "zod";
import { getCurrentShopContext } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/workshop/permissions";
import { decodeVin } from "@/lib/vin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getCurrentShopContext();
  if (!context.ok) return Response.json({ error: "Sign in and set up your shop to decode a VIN." }, { status: 401 });
  if (!canManageRecords(context.data.role)) return Response.json({ error: "Your shop role allows viewing vehicle records only." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ vin: z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/) }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter a valid 17-character VIN, or enter vehicle details manually." }, { status: 400 });
  const data = await decodeVin(parsed.data.vin, AbortSignal.timeout(10000));
  if (!data.year && !data.make && !data.model) return Response.json({ error: "No vehicle details were available. Please enter them manually." }, { status: 422 });
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
