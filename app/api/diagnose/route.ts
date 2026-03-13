import OpenAI from "openai";

export const runtime = "nodejs";

type UploadedImage =
  | {
      name?: string;
      type?: string;
      data?: string;
    }
  | null
  | undefined;

function buildDataUrl(image: UploadedImage): string | null {
  if (!image?.data) return null;
  const mime = image.type || "image/jpeg";
  return `data:${mime};base64,${image.data}`;
}

async function decodeVin(vin: string) {
  const cleanVin = vin.trim().toUpperCase();

  if (cleanVin.length !== 17) {
    return {
      vin: cleanVin,
      year: "",
      make: "",
      model: "",
      engine: "",
      trim: "",
      note: "VIN must be 17 characters for full lookup.",
    };
  }

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(
      cleanVin
    )}?format=json`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        vin: cleanVin,
        year: "",
        make: "",
        model: "",
        engine: "",
        trim: "",
        note: "VIN lookup service did not respond successfully.",
      };
    }

    const data = await res.json();
    const row = data?.Results?.[0] ?? {};

    return {
      vin: cleanVin,
      year: row.ModelYear || "",
      make: row.Make || "",
      model: row.Model || "",
      engine:
        row.DisplacementL ||
        row.EngineConfiguration ||
        row.EngineModel ||
        "",
      trim: row.Trim || "",
      note: "",
    };
  } catch {
    return {
      vin: cleanVin,
      year: "",
      make: "",
      model: "",
      engine: "",
      trim: "",
      note: "VIN lookup could not be completed.",
    };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Server misconfigured: OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await req.json();

    const vin = String(body?.vin ?? "").trim().toUpperCase();
    const vehicle = String(body?.vehicle ?? "").trim();
    const symptoms = String(body?.symptoms ?? "").trim();
    const codes = String(body?.codes ?? "").trim();
    const context = String(body?.context ?? "").trim();

    const dashboardPhoto = body?.dashboardPhoto as UploadedImage;
    const partPhoto = body?.partPhoto as UploadedImage;

    const dashboardDataUrl = buildDataUrl(dashboardPhoto);
    const partDataUrl = buildDataUrl(partPhoto);

    if (!vin && !vehicle && !symptoms && !codes && !context && !dashboardDataUrl && !partDataUrl) {
      return Response.json(
        {
          error:
            "Please provide at least one of the following: symptoms, vehicle, VIN, dashboard photo, or car-part photo.",
        },
        { status: 400 }
      );
    }

    const vinLookup = vin ? await decodeVin(vin) : null;

    const userContent: Array<
      | { type: "text"; text: string }
      | {
          type: "image_url";
          image_url: { url: string };
        }
    > = [];

    userContent.push({
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
        vinLookup
          ? JSON.stringify(vinLookup, null, 2)
          : "No VIN lookup available.",
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
        "- If no dashboard photo was provided, dashboard_analysis should still be present with empty strings and a note.",
        "- If no part photo was provided, part_analysis should still be present with empty strings and a note.",
        "- If no VIN was provided, vin_lookup should still be present with empty strings and a note.",
        "- Be practical, safety-first, and useful for a mobile mechanic workflow.",
      ].join("\n"),
    });

    if (dashboardDataUrl) {
      userContent.push({
        type: "text",
        text: "Here is the dashboard photo to analyze:",
      });
      userContent.push({
        type: "image_url",
        image_url: { url: dashboardDataUrl },
      });
    }

    if (partDataUrl) {
      userContent.push({
        type: "text",
        text: "Here is the car-part photo to analyze:",
      });
      userContent.push({
        type: "image_url",
        image_url: { url: partDataUrl },
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Smart Fix AI, a professional automotive diagnostic assistant. You help drivers and a real mobile mechanic. Be conservative on safety-critical issues. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        {
          error: "Model returned invalid JSON.",
          raw: text,
        },
        { status: 500 }
      );
    }

    const normalized = {
      summary: String(parsed?.summary ?? ""),
      severity:
        parsed?.severity === "stop_driving" ||
        parsed?.severity === "drive_to_shop" ||
        parsed?.severity === "monitor"
          ? parsed.severity
          : "monitor",
      likely_causes: Array.isArray(parsed?.likely_causes)
        ? parsed.likely_causes.map((item: any) => ({
            cause: String(item?.cause ?? ""),
            probability:
              typeof item?.probability === "number"
                ? item.probability
                : 0,
            why: String(item?.why ?? ""),
          }))
        : [],
      quick_checks: Array.isArray(parsed?.quick_checks)
        ? parsed.quick_checks.map((x: any) => String(x))
        : [],
      recommended_tests: Array.isArray(parsed?.recommended_tests)
        ? parsed.recommended_tests.map((x: any) => String(x))
        : [],
      estimated_cost_range_usd: {
        low: Number(parsed?.estimated_cost_range_usd?.low ?? 0),
        high: Number(parsed?.estimated_cost_range_usd?.high ?? 0),
        notes: String(parsed?.estimated_cost_range_usd?.notes ?? ""),
      },
      follow_up_questions: Array.isArray(parsed?.follow_up_questions)
        ? parsed.follow_up_questions.map((x: any) => String(x))
        : [],
      safety_notes: Array.isArray(parsed?.safety_notes)
        ? parsed.safety_notes.map((x: any) => String(x))
        : [],
      vin_lookup: {
        vin: String(parsed?.vin_lookup?.vin ?? vinLookup?.vin ?? vin ?? ""),
        year: String(parsed?.vin_lookup?.year ?? vinLookup?.year ?? ""),
        make: String(parsed?.vin_lookup?.make ?? vinLookup?.make ?? ""),
        model: String(parsed?.vin_lookup?.model ?? vinLookup?.model ?? ""),
        engine: String(parsed?.vin_lookup?.engine ?? vinLookup?.engine ?? ""),
        trim: String(parsed?.vin_lookup?.trim ?? vinLookup?.trim ?? ""),
        note: String(parsed?.vin_lookup?.note ?? vinLookup?.note ?? (vin ? "" : "No VIN provided.")),
      },
      dashboard_analysis: {
        detected_warning: String(parsed?.dashboard_analysis?.detected_warning ?? ""),
        meaning: String(parsed?.dashboard_analysis?.meaning ?? ""),
        urgency: String(parsed?.dashboard_analysis?.urgency ?? ""),
        next_steps: String(parsed?.dashboard_analysis?.next_steps ?? ""),
        confidence_note: String(
          parsed?.dashboard_analysis?.confidence_note ??
            (dashboardDataUrl ? "" : "No dashboard photo provided.")
        ),
      },
      part_analysis: {
        part_name: String(parsed?.part_analysis?.part_name ?? ""),
        function: String(parsed?.part_analysis?.function ?? ""),
        location: String(parsed?.part_analysis?.location ?? ""),
        importance: String(parsed?.part_analysis?.importance ?? ""),
        replace_overview: String(parsed?.part_analysis?.replace_overview ?? ""),
        caution_notes: String(parsed?.part_analysis?.caution_notes ?? ""),
        confidence_note: String(
          parsed?.part_analysis?.confidence_note ??
            (partDataUrl ? "" : "No car-part photo provided.")
        ),
      },
    };

    return Response.json(normalized);
  } catch (err: any) {
    return Response.json(
      {
        error: "Server error",
        details: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}