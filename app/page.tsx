"use client";

import { useEffect, useMemo, useState } from "react";

type Severity = "stop_driving" | "drive_to_shop" | "monitor";

function sevToScore(sev: Severity | null): number {
  if (sev === "stop_driving") return 92;
  if (sev === "drive_to_shop") return 60;
  if (sev === "monitor") return 28;
  return 0;
}

function sevLabel(sev: Severity | null) {
  if (sev === "stop_driving") return "STOP DRIVING";
  if (sev === "drive_to_shop") return "DRIVE TO SHOP CAREFULLY";
  if (sev === "monitor") return "SAFE TO DRIVE / MONITOR";
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Page() {
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState("2010 Honda Accord 2.4L");
  const [symptoms, setSymptoms] = useState("");
  const [codes, setCodes] = useState("");
  const [context, setContext] = useState("");

  const [dashboardPhoto, setDashboardPhoto] = useState<File | null>(null);
  const [partPhoto, setPartPhoto] = useState<File | null>(null);

  const [dashboardPreview, setDashboardPreview] = useState("");
  const [partPreview, setPartPreview] = useState("");

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

  function handleDashboardFile(file: File | null) {
    setDashboardPhoto(file);
    if (!file) {
      setDashboardPreview("");
      return;
    }
    setDashboardPreview(URL.createObjectURL(file));
  }

  function handlePartFile(file: File | null) {
    setPartPhoto(file);
    if (!file) {
      setPartPreview("");
      return;
    }
    setPartPreview(URL.createObjectURL(file));
  }

  async function runDiagnosis() {
    setLoading(true);
    setError("");
    setResult(null);
    setGaugeScore(0);

    try {
      const dashboardPhotoBase64 = dashboardPhoto ? await fileToBase64(dashboardPhoto) : null;
      const partPhotoBase64 = partPhoto ? await fileToBase64(partPhoto) : null;

      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin,
          vehicle,
          symptoms,
          codes,
          context,
          dashboardPhoto: dashboardPhotoBase64
            ? {
                name: dashboardPhoto?.name,
                type: dashboardPhoto?.type,
                data: dashboardPhotoBase64,
              }
            : null,
          partPhoto: partPhotoBase64
            ? {
                name: partPhoto?.name,
                type: partPhoto?.type,
                data: partPhotoBase64,
              }
            : null,
        }),
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
    "sms:+17865388691?body=Hi%20I%20used%20Smart%20Fix%20AI%20and%20need%20help%20with%20my%20car.%20VIN%3A%20" +
    encodeURIComponent(vin) +
    "%20Vehicle%3A%20" +
    encodeURIComponent(vehicle) +
    "%20Symptoms%3A%20" +
    encodeURIComponent(symptoms);

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-red-900 opacity-40" />
      <div className="absolute w-[860px] h-[860px] bg-blue-600 rounded-full blur-3xl opacity-20 -top-56 -left-56" />
      <div className="absolute w-[760px] h-[760px] bg-red-600 rounded-full blur-3xl opacity-20 -bottom-40 -right-40" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">
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
            Built by Smart Fix Mobile Auto Repair — smarter diagnostics, faster help.
          </p>
          <CheckEngineIcon pulse={loading} sev={severity} />
        </header>

        <section className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="VIN Number (optional for V2 lookup)"
              maxLength={17}
            />

            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="Vehicle (Year Make Model Engine)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="OBD Codes / Warning Lights"
            />

            <input
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Context (when it happens, after repairs, weather, speed...)"
            />
          </div>

          <textarea
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe the problem in detail. Example: Battery light on, voltage stays around 12V while driving, vehicle dies after 10 minutes."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/70 border border-gray-700 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-lg font-bold">Upload Dashboard Photo</h3>
                <p className="text-sm text-gray-300">
                  Upload a dashboard warning light photo and Smart Fix AI will try to explain what it means.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleDashboardFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />

              {dashboardPreview && (
                <img
                  src={dashboardPreview}
                  alt="Dashboard preview"
                  className="w-full h-48 object-cover rounded-xl border border-gray-700"
                />
              )}
            </div>

            <div className="bg-gray-800/70 border border-gray-700 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-lg font-bold">Upload Car Part Photo</h3>
                <p className="text-sm text-gray-300">
                  Upload any car-part photo and Smart Fix AI will try to explain what it is, where it is, and how it may be replaced.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePartFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white hover:file:bg-red-700"
              />

              {partPreview && (
                <img
                  src={partPreview}
                  alt="Part preview"
                  className="w-full h-48 object-cover rounded-xl border border-gray-700"
                />
              )}
            </div>
          </div>

          <div className="bg-yellow-500/15 border border-yellow-400/30 text-yellow-100 rounded-xl p-4 text-sm">
            <span className="font-bold">Important Notice:</span> Image-based analysis is an AI estimate and may not always be exact.
            Lighting, camera angle, image quality, and vehicle differences can affect identification.
            Always verify warning lights, part identification, and repair steps before replacing components
            or continuing to drive.
          </div>

          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:opacity-90 transition-all font-semibold py-3 rounded-xl shadow-lg disabled:opacity-60"
          >
            {loading ? "Running Full Smart Fix Scan..." : "Run Full Diagnostic"}
          </button>

          {error && (
            <div className="bg-red-700/70 border border-red-300/30 p-3 rounded-lg">
              {error}
            </div>
          )}
        </section>

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
              <div className={`p-6 rounded-2xl shadow-xl border ${sevBanner(severity)}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-white/80">
                      Can I Drive?
                    </p>
                    <h3 className="text-2xl font-extrabold uppercase tracking-wider mt-1">
                      {sevLabel(severity)}
                    </h3>
                  </div>
                  <div className="text-sm text-white/90">
                    Smart Fix safety recommendation
                  </div>
                </div>

                <p className="mt-4 text-white/95">{result.summary}</p>
              </div>

              {result?.vin_lookup && (
                <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4">🔎 VIN Lookup</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-200">
                    <div><span className="font-semibold">VIN:</span> {result.vin_lookup.vin || vin}</div>
                    <div><span className="font-semibold">Year:</span> {result.vin_lookup.year || "—"}</div>
                    <div><span className="font-semibold">Make:</span> {result.vin_lookup.make || "—"}</div>
                    <div><span className="font-semibold">Model:</span> {result.vin_lookup.model || "—"}</div>
                    <div><span className="font-semibold">Engine:</span> {result.vin_lookup.engine || "—"}</div>
                    <div><span className="font-semibold">Trim:</span> {result.vin_lookup.trim || "—"}</div>
                  </div>
                </div>
              )}

              {(result?.dashboard_analysis || result?.part_analysis) && (
                <div className="bg-yellow-500/15 border border-yellow-400/30 text-yellow-100 rounded-xl p-4 text-sm">
                  <span className="font-bold">Smart Fix AI Image Notice:</span> Photo analysis helps guide you but may not always be perfectly accurate.
                  For safety-critical issues, confirm the warning light or part before repair or continued driving.
                </div>
              )}

              {result?.dashboard_analysis && (
                <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4">📸 Dashboard Photo Analysis</h3>
                  <div className="space-y-3 text-gray-200">
                    <p><span className="font-semibold">Detected warning:</span> {result.dashboard_analysis.detected_warning || "Not identified"}</p>
                    <p><span className="font-semibold">Meaning:</span> {result.dashboard_analysis.meaning || "—"}</p>
                    <p><span className="font-semibold">Urgency:</span> {result.dashboard_analysis.urgency || "—"}</p>
                    <p><span className="font-semibold">What to do next:</span> {result.dashboard_analysis.next_steps || "—"}</p>
                    {result.dashboard_analysis.confidence_note && (
                      <p className="text-sm text-gray-400">
                        {result.dashboard_analysis.confidence_note}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result?.part_analysis && (
                <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4">🧩 Car Part Photo Analysis</h3>
                  <div className="space-y-3 text-gray-200">
                    <p><span className="font-semibold">Likely part:</span> {result.part_analysis.part_name || "Not identified"}</p>
                    <p><span className="font-semibold">What it does:</span> {result.part_analysis.function || "—"}</p>
                    <p><span className="font-semibold">Where it is located:</span> {result.part_analysis.location || "—"}</p>
                    <p><span className="font-semibold">Why it matters:</span> {result.part_analysis.importance || "—"}</p>
                    <p><span className="font-semibold">Remove / replace overview:</span> {result.part_analysis.replace_overview || "—"}</p>
                    {result.part_analysis.caution_notes && (
                      <p><span className="font-semibold">Caution:</span> {result.part_analysis.caution_notes}</p>
                    )}
                    {result.part_analysis.confidence_note && (
                      <p className="text-sm text-gray-400">
                        {result.part_analysis.confidence_note}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                      <p className="text-gray-300 text-sm mt-2">
                        {result.estimated_cost_range_usd.notes}
                      </p>
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
                  Your text will include VIN, vehicle, and symptoms automatically.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}