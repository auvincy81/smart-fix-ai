import { decodeVin } from "@/lib/vin";
import OpenAI from "openai";
import { getCurrentShopContext } from "@/lib/auth/session";
import { normalizeInspectionPhoto, photoLimit } from "@/lib/inspections/images";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;
type UploadedImage = { name?: string; type?: string; data?: string } | null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function uploadedImage(value: unknown): UploadedImage {
  if (!isRecord(value)) return null;
  return {
    name: text(value.name),
    type: text(value.type),
    data: text(value.data),
  };
}

function buildDataUrl(image: UploadedImage): string | null {
  if (!image?.data) return null;
  return `data:${image.type || "image/jpeg"};base64,${image.data}`;
}

export async function POST(request: Request) {
  try {
    const shop = await getCurrentShopContext();
    if (!shop.ok && shop.code === "SHOP_CONTEXT_UNAVAILABLE") return Response.json({error:"Account services are temporarily unavailable. Please try again."},{status:503});
    if (!shop.ok) return Response.json({ error: "Sign in and open your shop before running a diagnosis." }, { status: 401 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "AI diagnosis is temporarily unavailable. Please try again later." }, { status: 500 });
    }

    const maximum = 15 * 1024 * 1024;
    if (!request.body || Number(request.headers.get("content-length")) > maximum) {
      return Response.json({ error: "Use JPEG, PNG, or WebP photos up to 5 MB each." }, { status: 413 });
    }
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maximum) {
        await reader.cancel();
        return Response.json({ error: "Use photos up to 5 MB each." }, { status: 413 });
      }
      chunks.push(part.value);
    }
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return Response.json({ error: "Review the diagnostic form and try again." }, { status: 400 });
    }
    const body = record(rawBody);

    const vin = text(body.vin).trim().toUpperCase();
    const vehicle = text(body.vehicle).trim();
    const symptoms = text(body.symptoms).trim();
    const codes = text(body.codes).trim();
    const context = text(body.context).trim();
    let dashboardPhoto = uploadedImage(body.dashboardPhoto);
    let partPhoto = uploadedImage(body.partPhoto);
    try {
      const normalize = async (image: UploadedImage): Promise<UploadedImage> => {
        if (!image?.data) return null;
        if (image.data.length > Math.ceil(photoLimit / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) {
          throw new Error("Invalid image");
        }
        const bytes = Buffer.from(image.data, "base64");
        const normalized = await normalizeInspectionPhoto(new File([bytes], "diagnosis.jpg", { type: image.type || "image/jpeg" }));
        return { type: "image/jpeg", data: normalized.toString("base64") };
      };
      [dashboardPhoto, partPhoto] = await Promise.all([normalize(dashboardPhoto), normalize(partPhoto)]);
    } catch {
      return Response.json({ error: "Choose valid JPEG, PNG, or WebP photos up to 5 MB each. HEIC photos must be converted first." }, { status: 400 });
    }
    const dashboardDataUrl = buildDataUrl(dashboardPhoto);
    const partDataUrl = buildDataUrl(partPhoto);

    if (!vin && !vehicle && !symptoms && !codes && !context && !dashboardDataUrl && !partDataUrl) {
      return Response.json(
        { error: "Please provide symptoms, vehicle information, VIN, a dashboard photo, or a car-part photo." },
        { status: 400 }
      );
    }

    if ([vehicle,symptoms,codes,context].some(value=>value.length>10000) || vin.length>17) return Response.json({error:"Shorten the diagnostic details and check the VIN."},{status:400});
    const vinLookup = vin ? await decodeVin(vin) : null;
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: [
          "Analyze the following vehicle issue and return ONLY valid JSON.",
          "",
          `VIN: ${vin || "None provided"}`,
          `Vehicle: ${vehicle || "None provided"}`,
          `Symptoms: ${symptoms || "None provided"}`,
          `Codes/Lights: ${codes || "None provided"}`,
          `Context: ${context || "None provided"}`,
          "",
          "VIN lookup result (if available):",
          vinLookup ? JSON.stringify(vinLookup, null, 2) : "No VIN lookup available.",
          "",
          "If a dashboard photo is provided, identify the warning/indicator if possible.",
          "If a car-part photo is provided, identify the likely part if possible.",
          "If uncertain, say so clearly and do not overclaim.",
          "",
          "Return JSON with EXACTLY these top-level fields:",
          "summary",
          "severity",
          "likely_causes",
          "quick_checks",
          "recommended_tests",
          "estimated_cost_range_usd",
          "follow_up_questions",
          "safety_notes",
          "vin_lookup",
          "dashboard_analysis",
          "part_analysis",
          "",
          "Rules:",
          '- severity must be one of: "stop_driving", "drive_to_shop", "monitor"',
          "- likely_causes must be an array of objects: { cause, probability, why }",
          "- probability should be a number from 0 to 1",
          "- estimated_cost_range_usd must be: { low, high, notes }",
          "- vin_lookup must be an object with: { vin, year, make, model, engine, trim, note }",
          "- dashboard_analysis must be an object with: { detected_warning, meaning, urgency, next_steps, confidence_note }",
          "- part_analysis must be an object with: { part_name, function, location, importance, replace_overview, caution_notes, confidence_note }",
          "- Keep unavailable image-analysis fields present with empty strings and a confidence note.",
          "- Keep vin_lookup present even when VIN is unavailable.",
          "- Be practical, conservative on safety, and useful for a professional automotive workflow.",
        ].join("\n"),
      },
    ];

    if (dashboardDataUrl) {
      userContent.push({ type: "text", text: "Here is the dashboard photo to analyze:" });
      userContent.push({ type: "image_url", image_url: { url: dashboardDataUrl } });
    }

    if (partDataUrl) {
      userContent.push({ type: "text", text: "Here is the automotive part photo to analyze:" });
      userContent.push({ type: "image_url", image_url: { url: partDataUrl } });
    }

    const client = new OpenAI({ apiKey, timeout: 60000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are MekaReports AI Diagnosis, a professional automotive diagnostic assistant evolved from Smart Fix AI. Be conservative on safety-critical issues. Return ONLY valid JSON.",
        },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(raw);
    } catch {
      return Response.json({ error: "The diagnostic result could not be read. Please try again." }, { status: 502 });
    }

    const parsed = record(parsedUnknown);
    const cost = record(parsed.estimated_cost_range_usd);
    const vinResult = record(parsed.vin_lookup);
    const dashboard = record(parsed.dashboard_analysis);
    const part = record(parsed.part_analysis);

    const causes = Array.isArray(parsed.likely_causes)
      ? parsed.likely_causes.map((item) => {
          const cause = record(item);
          return {
            cause: text(cause.cause),
            probability: Math.max(0, Math.min(1, number(cause.probability))),
            why: text(cause.why),
          };
        })
      : [];

    const severity =
      parsed.severity === "stop_driving" || parsed.severity === "drive_to_shop" || parsed.severity === "monitor"
        ? parsed.severity
        : "monitor";

    return Response.json({
      summary: text(parsed.summary),
      severity,
      likely_causes: causes,
      quick_checks: stringArray(parsed.quick_checks),
      recommended_tests: stringArray(parsed.recommended_tests),
      estimated_cost_range_usd: {
        low: number(cost.low),
        high: number(cost.high),
        notes: text(cost.notes),
      },
      follow_up_questions: stringArray(parsed.follow_up_questions),
      safety_notes: stringArray(parsed.safety_notes),
      vin_lookup: {
        vin: text(vinResult.vin) || vinLookup?.vin || vin,
        year: text(vinResult.year) || vinLookup?.year || "",
        make: text(vinResult.make) || vinLookup?.make || "",
        model: text(vinResult.model) || vinLookup?.model || "",
        engine: text(vinResult.engine) || vinLookup?.engine || "",
        trim: text(vinResult.trim) || vinLookup?.trim || "",
        note: text(vinResult.note) || vinLookup?.note || (vin ? "" : "No VIN was provided."),
      },
      dashboard_analysis: {
        detected_warning: text(dashboard.detected_warning),
        meaning: text(dashboard.meaning),
        urgency: text(dashboard.urgency),
        next_steps: text(dashboard.next_steps),
        confidence_note: text(dashboard.confidence_note) || (dashboardDataUrl ? "" : "No dashboard photo was provided."),
      },
      part_analysis: {
        part_name: text(part.part_name),
        function: text(part.function),
        location: text(part.location),
        importance: text(part.importance),
        replace_overview: text(part.replace_overview),
        caution_notes: text(part.caution_notes),
        confidence_note: text(part.confidence_note) || (partDataUrl ? "" : "No part photo was provided."),
      },
    });
  } catch {
    return Response.json({ error: "Diagnosis could not be completed. Check your connection and try again; your inputs are still available." }, { status: 503 });
  }
}
