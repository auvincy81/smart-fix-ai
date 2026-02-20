import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const vehicle = String(body?.vehicle ?? "");
    const symptoms = String(body?.symptoms ?? "");
    const codes = String(body?.codes ?? "");
    const context = String(body?.context ?? "");

    if (symptoms.trim().length < 5) {
      return Response.json({ error: "Please describe symptoms in more detail." }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a professional automotive diagnostic assistant. Be safety-first. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: [
            `Vehicle: ${vehicle || "Unknown"}`,
            `Symptoms: ${symptoms}`,
            `Codes/Lights: ${codes || "None"}`,
            `Context: ${context || "None"}`,
            "",
            "Return JSON with exactly these fields:",
            "summary",
            "severity (stop_driving | drive_to_shop | monitor)",
            "likely_causes (array of {cause, probability, why})",
            "quick_checks (array)",
            "recommended_tests (array)",
            "estimated_cost_range_usd (object: {low, high, notes})",
            "follow_up_questions (array)",
            "safety_notes (array)",
          ].join("\n"),
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content ?? "{}";
    const json = JSON.parse(text);
    return Response.json(json);
  } catch (err: any) {
    return Response.json(
      { error: "Server error", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
