import { revalidatePath } from "next/cache";
import { approvalClient } from "@/lib/repairs/public";
import { decisionsSchema } from "@/lib/repairs/validation";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) return Response.json({ error: "Approval link unavailable." }, { status: 404 });
  // Bound even chunked bodies before parsing. The capability token is still verified by Postgres.
  if (!request.body || Number(request.headers.get("content-length")) > 32768) return Response.json({ error: "Request too large." }, { status: 413 });
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  let input: unknown;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); return Response.json({ error: "Request too large." }, { status: 413 }); } chunks.push(value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({ error: "Invalid authorization request." }, { status: 400 }); }
  const parsed = decisionsSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "Choose approve or decline for every repair, enter your name, and acknowledge authorization." }, { status: 400 });
  const d = parsed.data;
  const { error } = await approvalClient().rpc("submit_customer_approval", { p_token: token, p_decisions: d.decisions, p_name: d.name, p_note: d.note, p_ack: d.acknowledge });
  if (error) return Response.json({ error: "This request is no longer available or the choices do not match the estimate. Refresh or contact the shop." }, { status: 409 });
  for (const path of ["/", "/work-orders", "/estimates", "/customers", "/vehicles"]) revalidatePath(path, "layout");
  return Response.json({ message: "Customer authorization recorded." });
}
