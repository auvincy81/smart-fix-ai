import OpenAI from "openai";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;
type UploadedImage = { name?: string; type?: string; data?: string } | null;

type VinLookup = {
  vin: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  trim: string;
  note: string;
};

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

async function decodeVin(vin: string): Promise<VinLookup> {
  const cleanVin = vin.trim().toUpperCase();

  if (cleanVin.length !== 17) {
    return { vin: cleanVin, year: "", make: "", model: "", engine: "", trim: "", note: "VIN must be 17 characters for full lookup." };
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(cleanVin)}?format=json`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      return { vin: cleanVin, year: "", make: "", model: "", engine: "", trim: "", note: "VIN lookup service did not respond successfully." };
    }

    const payload = (await response.json()) as { Results?: JsonRecord[] };
    const row = payload.Results?.[0] ?? {};

    return {
      vin: cleanVin,
      year: text(row.ModelYear),
      make: text(row.Make),
      model: text(row.Model),
      engine: text(row.DisplacementL) || text(row.EngineConfiguration) || text(row.EngineModel),
      trim: text(row.Trim),
      note: "",
    };
  } catch {
    return { vin: cleanVin, year: "", make: "", model: "", engine: "", trim: "", note: "VIN lookup could not be completed." };
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Server misconfigured: OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const rawBody: unknown = await request.json();
    const body = record(rawBody);

    const vin = text(body.vin).trim().toUpperCase();
    const vehicle = text(body.vehicle).trim();
    const symptoms = text(body.symptoms).trim();
    const codes = text(body.codes).trim();
    const context = text(body.context).trim();
    const dashboardPhoto = uploadedImage(body.dashboardPhoto);
    const partPhoto = uploadedImage(body.partPhoto);
    const dashboardDataUrl = buildDataUrl(dashboardPhoto);
    const partDataUrl = buildDataUrl(partPhoto);

    if (!vin && !vehicle && !symptoms && !codes && !context && !dashboardDataUrl && !partDataUrl) {
      return Response.json(
        { error: "Please provide symptoms, vehicle information, VIN, a dashboard photo, or a car-part photo." },
        { status: 400 }
      );
    }

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

    const client = new OpenAI({ apiKey });
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
      return Response.json({ error: "Model returned invalid JSON.", raw }, { status: 500 });
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
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : "Unexpected diagnostic error.";
    return Response.json({ error: "Diagnosis could not be completed.", details: message }, { status: 500 });
  }
}
