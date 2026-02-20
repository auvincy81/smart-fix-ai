"use client";

import { useEffect, useMemo, useState } from "react";

type Severity = "stop_driving" | "drive_to_shop" | "monitor";

function sevToScore(sev: Severity | null): number {
  // 0 = low urgency, 100 = high urgency
  if (sev === "stop_driving") return 92;
  if (sev === "drive_to_shop") return 60;
  if (sev === "monitor") return 28;
  return 0;
}

function sevLabel(sev: Severity | null) {
  if (sev === "stop_driving") return "STOP DRIVING";
  if (sev === "drive_to_shop") return "DRIVE TO SHOP";
  if (sev === "monitor") return "MONITOR";
  return "READY";
}

function sevColor(sev: Severity | null) {
  if (sev === "stop_driving") return "text-red-400";
  if (sev === "drive_to_shop") return "text-yellow-300";
  if (sev === "monitor") return "text-green-400";
  return "text-gray-300";
}

function sevBanner(sev: Severity | null) {
  if (sev === "stop_driving") return "bg-red-600/90 border-red-400/40";
  if (sev === "drive_to_shop") return "bg-yellow-500/90 border-yellow-300/40";
  if (sev === "monitor") return "bg-green-600/90 border-green-400/40";
  return "bg-gray-800/80 border-gray-600/40";
}

function CarMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" className="drop-shadow" aria-hidden="true">
      <defs>
        <linearGradient id="carG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <path
        d="M14 36c1-6 4-15 7-18 2-2 20-2 22 0 3 3 6 12 7 18"
        fill="none"
        stroke="url(#carG)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M10 38c1-2 3-3 5-3h34c2 0 4 1 5 3l2 5c1 2-1 4-3 4H11c-2 0-4-2-3-4l2-5Z"
        fill="none"
        stroke="url(#carG)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="46" r="5" fill="none" stroke="url(#carG)" strokeWidth="4" />
      <circle cx="46" cy="46" r="5" fill="none" stroke="url(#carG)" strokeWidth="4" />
      <path d="M24 28h16" stroke="url(#carG)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CheckEngineIcon({ pulse, sev }: { pulse: boolean; sev: Severity | null }) {
  const color =
    sev === "stop_driving"
      ? "text-red-400"
      : sev === "drive_to_shop"
      ? "text-yellow-300"
      : sev === "monitor"
      ? "text-green-400"
      : "text-blue-300";

  return (
    <div className={`inline-flex items-center gap-2 ${color}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 64 64"
        className={`${pulse ? "animate-pulse" : ""}`}
        aria-hidden="true"
      >
        <path
          d="M18 26h-2c-3 0-6 3-6 6v10c0 3 3 6 6 6h4l6 6h20l6-6h4c3 0 6-3 6-6V32c0-3-3-6-6-6h-2l-6-8H30l-6 8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M22 34h6M36 34h6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 42h4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-sm tracking-wide font-semibold">{pulse ? "SCANNING..." : "CHECK ENGINE"}</span>
    </div>
  );
}

function Speedometer({ value, label }: { value: number; label: string }) {
  const deg = -90 + (value / 100) * 180;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative h-44">
        <div className="absolute inset-x-0 bottom-0 mx-auto w-80 h-40 rounded-t-full border-2 border-gray-700 bg-gradient-to-b from-gray-900/60 to-gray-900/10 backdrop-blur" />

        <div className="absolute inset-x-0 bottom-0 mx-auto w-80 h-40">
          {[...Array(13)].map((_, i) => {
            const tDeg = -90 + i * 15;
            return (
              <div
                key={i}
                className="absolute left-1/2 bottom-1"
                style={{ transform: `translateX(-50%) rotate(${tDeg}deg)` }}
              >
                <div className="h-4 w-[2px] bg-gray-600 rounded" />
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto w-80 h-40 pointer-events-none">
          <div
            className="absolute left-1/2 bottom-2 origin-bottom transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
          >
            <div className="w-[3px] h-28 bg-white rounded shadow" />
          </div>
          <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow" />
        </div>

        <div className="absolute inset-x-0 bottom-8 text-center">
          <div className="text-3xl font-extrabold tracking-wide">{value}</div>
          <div className="text-xs text-gray-300 tracking-widest">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [vehicle, setVehicle] = useState("2010 Honda Accord 2.4L");
  const [symptoms, setSymptoms] = useState("");
  const [codes, setCodes] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const severity: Severity | null = useMemo(() => {
    const s = result?.severity;
    if (s === "stop_driving" || s === "drive_to_shop" || s === "monitor") return s;
    return null;
  }, [result]);

  const targetScore = useMemo(() => sevToScore(severity), [severity]);
  const [gaugeScore, setGaugeScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setGaugeScore(targetScore), 120);
    return () => clearTimeout(t);
  }, [targetScore]);

  async function runDiagnosis() {
    setLoading(true);
    setError("");
    setResult(null);
    setGaugeScore(0);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle, symptoms, codes, context }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data?.error || data?.details || "Request failed");

      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const smsHref =
    "sms:+17865388691?body=Hi%20I%20used%20Smart%20Fix%20AI%20and%20need%20help%20with%20my%20car.%20Vehicle%3A%20" +
    encodeURIComponent(vehicle) +
    "%20Symptoms%3A%20" +
    encodeURIComponent(symptoms);

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Dashboard glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-red-900 opacity-40" />
      <div className="absolute w-[860px] h-[860px] bg-blue-600 rounded-full blur-3xl opacity-20 -top-56 -left-56" />
      <div className="absolute w-[760px] h-[760px] bg-red-600 rounded-full blur-3xl opacity-20 -bottom-40 -right-40" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <CarMark />
            <h1 className="text-5xl font-extrabold tracking-wide">
              <span className="text-blue-500">SMART</span>{" "}
              <span className="text-white">FIX</span>{" "}
              <span className="text-red-500">AI</span>
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Free AI Diagnosis → Text Smart Fix to book mobile service.
          </p>
          <CheckEngineIcon pulse={loading} sev={severity} />
        </header>

        {/* Form */}
        <section className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="Vehicle (Year Make Model Engine)"
            />
            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="OBD Codes / Warning Lights (optional)"
            />
          </div>

          <textarea
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe the problem in detail (sounds, smells, lights, when it happens)..."
          />

          <input
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Context (weather, speed, after repairs, only when turning, etc.)"
          />

          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:opacity-90 transition-all font-semibold py-3 rounded-xl shadow-lg disabled:opacity-60"
          >
            {loading ? "Running Full System Scan..." : "Run Full Diagnostic"}
          </button>

          {error && (
            <div className="bg-red-700/70 border border-red-300/30 p-3 rounded-lg">
              {error}
            </div>
          )}
        </section>

        {/* Gauge + Results */}
        <section className="space-y-6">
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold tracking-wide">System Health Gauge</h2>
                <p className="text-gray-300 text-sm">
                  Higher score = higher urgency. {severity ? "Based on AI severity." : "Run a diagnostic to populate."}
                </p>
              </div>
              <div className={`text-sm font-bold ${sevColor(severity)} tracking-widest`}>
                {sevLabel(severity)}
              </div>
            </div>

            <div className="mt-6">
              <Speedometer value={gaugeScore} label="URGENCY SCORE" />
            </div>
          </div>

          {result && (
            <>
              <div className={`p-6 rounded-2xl shadow-xl text-center border ${sevBanner(severity)}`}>
                <h3 className="text-2xl font-extrabold uppercase tracking-wider">
                  {sevLabel(severity)}
                </h3>
                <p className="mt-2 text-white/95">{result.summary}</p>
              </div>

              {result?.likely_causes && (
                <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4">🔍 Likely Causes</h3>
                  <ul className="space-y-3">
                    {result.likely_causes.map((c: any, i: number) => (
                      <li key={i} className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                        <div className="font-semibold text-white">{c.cause}</div>
                        <div className="text-gray-300 text-sm mt-1">{c.why}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(result?.quick_checks || result?.recommended_tests) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result?.quick_checks && (
                    <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold mb-4">🛠 Quick Checks</h3>
                      <ul className="list-disc list-inside text-gray-200 space-y-1">
                        {result.quick_checks.map((x: string, i: number) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result?.recommended_tests && (
                    <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold mb-4">🧪 Recommended Tests</h3>
                      <ul className="list-disc list-inside text-gray-200 space-y-1">
                        {result.recommended_tests.map((x: string, i: number) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(result?.estimated_cost_range_usd || result?.safety_notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result?.estimated_cost_range_usd && (
                    <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg text-center">
                      <h3 className="text-xl font-bold mb-2">💲 Estimated Cost</h3>
                      <p className="text-3xl font-extrabold">
                        ${result.estimated_cost_range_usd.low} – ${result.estimated_cost_range_usd.high}
                      </p>
                      <p className="text-gray-300 text-sm mt-2">{result.estimated_cost_range_usd.notes}</p>
                    </div>
                  )}
                  {result?.safety_notes && (
                    <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold mb-4">⚠️ Safety Notes</h3>
                      <ul className="list-disc list-inside text-gray-200 space-y-1">
                        {result.safety_notes.map((x: string, i: number) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TEXT ONLY BOOKING CTA */}
              <div className="bg-gradient-to-r from-blue-600 to-red-600 p-8 rounded-2xl shadow-2xl text-center mt-10">
                <h3 className="text-2xl font-extrabold uppercase tracking-wide">
                  🚗 Need It Fixed?
                </h3>

                <p className="mt-3 text-lg font-semibold">Smart Fix Mobile Auto Repair</p>

                <p className="text-sm opacity-90">
                  Text us now — we come to you.
                </p>

                <a
                  href={smsHref}
                  className="inline-block mt-6 bg-black hover:bg-gray-900 transition-all px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg"
                >
                  📲 TEXT SMART FIX NOW
                </a>

                <p className="text-xs text-white/80 mt-4">
                  Your text will include your vehicle + symptoms automatically.
                </p>
              </div>

              <details className="bg-gray-900/50 border border-gray-700 rounded-2xl p-4">
                <summary className="cursor-pointer font-semibold text-gray-200">
                  Raw JSON (debug)
                </summary>
                <pre className="whitespace-pre-wrap mt-3 text-xs text-gray-200">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}