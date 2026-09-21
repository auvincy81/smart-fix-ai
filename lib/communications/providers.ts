import "server-only";

export type OutgoingMessage = { recipient: string; subject: string; text: string; id: string };
export type DeliveryResult = { ok: true; providerId: string } | { ok: false };
export interface MessageProvider { send(message: OutgoingMessage): Promise<DeliveryResult> }

// This adapter captures messages in the local development mailbox. It never releases/relays them.
export function localMailpitUrl(): string | null {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54331") return null;
  const value = process.env.MEKAREPORTS_MAILPIT_URL || "http://127.0.0.1:54334";
  try { const url = new URL(value); return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && !url.username && !url.password ? url.origin : null; } catch { return null; }
}
export const emailProvider: MessageProvider = {
  async send(message) {
    const base = localMailpitUrl();
    if (!base) return { ok: false };
    try {
      const response = await fetch(`${base}/api/v1/send`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        From: { Email: "mekareports@local.test", Name: "MekaReports local development" }, To: [{ Email: message.recipient }], Subject: `[LOCAL TEST] ${message.subject}`, Text: message.text,
        Headers: { "X-MekaReports-Communication": message.id }, Tags: ["MekaReports-local"],
      }) });
      if (!response.ok) return { ok: false };
      const result: unknown = await response.json();
      if (result && typeof result === "object" && "ID" in result && typeof result.ID === "string" && result.ID.length <= 200) return { ok: true, providerId: result.ID };
    } catch { /* Provider errors are deliberately not exposed or persisted verbatim. */ }
    return { ok: false };
  },
};
export const smsProvider: MessageProvider = { async send() { return { ok: false }; } };
