"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";

type Severity = "stop_driving" | "drive_to_shop" | "monitor";

type Cause = {
  cause: string;
  probability: number;
  why: string;
};

type VinLookup = {
  vin: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  trim: string;
  note: string;
};

type DashboardAnalysis = {
  detected_warning: string;
  meaning: string;
  urgency: string;
  next_steps: string;
  confidence_note: string;
};

type PartAnalysis = {
  part_name: string;
  function: string;
  location: string;
  importance: string;
  replace_overview: string;
  caution_notes: string;
  confidence_note: string;
};

type DiagnosisResult = {
  summary: string;
  severity: Severity;
  likely_causes: Cause[];
  quick_checks: string[];
  recommended_tests: string[];
  estimated_cost_range_usd: { low: number; high: number; notes: string };
  follow_up_questions: string[];
  safety_notes: string[];
  vin_lookup: VinLookup;
  dashboard_analysis: DashboardAnalysis;
  part_analysis: PartAnalysis;
  error?: string;
};

function severityLabel(severity: Severity | null) {
  if (severity === "stop_driving") return "STOP DRIVING";
  if (severity === "drive_to_shop") return "DRIVE TO SHOP CAREFULLY";
  if (severity === "monitor") return "SAFE TO DRIVE / MONITOR";
  return "READY";
}

function severityClasses(severity: Severity | null) {
  if (severity === "stop_driving") return "border-red-400/30 bg-red-600 text-white";
  if (severity === "drive_to_shop") return "border-amber-300/30 bg-amber-500 text-slate-950";
  if (severity === "monitor") return "border-emerald-400/30 bg-emerald-600 text-white";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function severityScore(severity: Severity | null) {
  if (severity === "stop_driving") return 92;
  if (severity === "drive_to_shop") return 60;
  if (severity === "monitor") return 28;
  return 0;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 shadow-lg sm:p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-slate-300">{children}</div>
    </section>
  );
}

export default function DiagnosisPage() {
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState("2010 Honda Accord 2.4L");
  const [symptoms, setSymptoms] = useState("");
  const [codes, setCodes] = useState("");
  const [context, setContext] = useState("");
  const [dashboardPhoto, setDashboardPhoto] = useState<File | null>(null);
  const [partPhoto, setPartPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState("");

  const severity = result?.severity ?? null;
  const score = useMemo(() => severityScore(severity), [severity]);

  async function runDiagnosis() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const dashboardData = dashboardPhoto ? await fileToBase64(dashboardPhoto) : null;
      const partData = partPhoto ? await fileToBase64(partPhoto) : null;

      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin,
          vehicle,
          symptoms,
          codes,
          context,
          dashboardPhoto: dashboardData
            ? { name: dashboardPhoto?.name, type: dashboardPhoto?.type, data: dashboardData }
            : null,
          partPhoto: partData
            ? { name: partPhoto?.name, type: partPhoto?.type, data: partData }
            : null,
        }),
      });

      const data = (await response.json()) as DiagnosisResult;
      if (!response.ok) throw new Error(data.error || "Diagnosis request failed.");
      setResult(data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to run diagnosis.");
    } finally {
      setLoading(false);
    }
  }

  const smsHref =
    "sms:+17865388691?body=Hi%20I%20used%20MekaReports%20AI%20Diagnosis%20and%20need%20help%20with%20my%20car.%20VIN%3A%20" +
    encodeURIComponent(vin) +
    "%20Vehicle%3A%20" +
    encodeURIComponent(vehicle) +
    "%20Symptoms%3A%20" +
    encodeURIComponent(symptoms);

  return (
    <>
      <PageHeader
        eyebrow="MekaReports AI Diagnosis"
        title="AI-assisted vehicle diagnosis"
        description="The original Smart Fix AI workflow is preserved here with VIN lookup, warning codes, symptoms, dashboard photos, part photos, safety severity, likely causes, testing guidance, and cost estimates."
      />

      <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl ring-1 ring-slate-900/10">
        <div className="border-b border-white/10 bg-gradient-to-r from-blue-950 via-slate-950 to-red-950 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">MekaReports AI Diagnosis</p>
              <h2 className="mt-2 text-2xl font-extrabold">Vehicle Diagnostic Workspace</h2>
            </div>
            <div className={`rounded-full border px-3 py-1.5 text-xs font-extrabold tracking-wide ${severityClasses(severity)}`}>
              {loading ? "SCANNING..." : severityLabel(severity)}
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={vin}
                maxLength={17}
                onChange={(event) => setVin(event.target.value.toUpperCase())}
                placeholder="VIN Number (optional)"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
              <input
                value={vehicle}
                onChange={(event) => setVehicle(event.target.value)}
                placeholder="Vehicle (Year Make Model Engine)"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
              <input
                value={codes}
                onChange={(event) => setCodes(event.target.value)}
                placeholder="OBD Codes / Warning Lights"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
              <input
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Context (when it happens, repairs, speed, weather...)"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <textarea
              rows={5}
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Describe the vehicle problem in detail."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <span className="block font-bold">Dashboard Photo</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">Upload a warning-light or instrument-cluster photo for AI analysis.</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setDashboardPhoto(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white"
                />
                {dashboardPhoto ? <span className="mt-2 block text-xs text-slate-400">Selected: {dashboardPhoto.name}</span> : null}
              </label>

              <label className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <span className="block font-bold">Automotive Part Photo</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">Upload a part photo for identification, location, and replacement guidance.</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPartPhoto(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-2 file:font-semibold file:text-white"
                />
                {partPhoto ? <span className="mt-2 block text-xs text-slate-400">Selected: {partPhoto.name}</span> : null}
              </label>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">
              AI diagnosis and image identification are decision-support tools. Confirm safety-critical findings with proper testing before replacing components or continuing to drive.
            </div>

            <button
              type="button"
              onClick={runDiagnosis}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-red-600 px-5 py-3.5 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running MekaReports Scan..." : "Run Full Diagnostic"}
            </button>

            {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/15 p-4 text-sm text-red-200">{error}</div> : null}
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">System Health Gauge</h2>
                <p className="mt-1 text-sm text-slate-400">Higher score means higher urgency.</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black">{score}</div>
                <div className="text-xs font-bold tracking-[0.15em] text-slate-400">URGENCY / 100</div>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  score >= 80 ? "bg-red-500" : score >= 50 ? "bg-amber-400" : score > 0 ? "bg-emerald-500" : "bg-slate-700"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </section>

          {result ? (
            <div className="space-y-5">
              <section className={`rounded-2xl border p-5 sm:p-6 ${severityClasses(severity)}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Can I Drive?</p>
                <h2 className="mt-1 text-2xl font-black">{severityLabel(severity)}</h2>
                <p className="mt-3 text-sm leading-6 opacity-95">{result.summary}</p>
              </section>

              {result.vin_lookup ? (
                <ResultCard title="VIN Lookup">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><strong className="text-white">VIN:</strong> {result.vin_lookup.vin || vin || "—"}</p>
                    <p><strong className="text-white">Year:</strong> {result.vin_lookup.year || "—"}</p>
                    <p><strong className="text-white">Make:</strong> {result.vin_lookup.make || "—"}</p>
                    <p><strong className="text-white">Model:</strong> {result.vin_lookup.model || "—"}</p>
                    <p><strong className="text-white">Engine:</strong> {result.vin_lookup.engine || "—"}</p>
                    <p><strong className="text-white">Trim:</strong> {result.vin_lookup.trim || "—"}</p>
                  </div>
                  {result.vin_lookup.note ? <p className="mt-3 text-slate-400">{result.vin_lookup.note}</p> : null}
                </ResultCard>
              ) : null}

              {result.dashboard_analysis ? (
                <ResultCard title="Dashboard Photo Analysis">
                  <div className="space-y-2">
                    <p><strong className="text-white">Detected warning:</strong> {result.dashboard_analysis.detected_warning || "Not identified"}</p>
                    <p><strong className="text-white">Meaning:</strong> {result.dashboard_analysis.meaning || "—"}</p>
                    <p><strong className="text-white">Urgency:</strong> {result.dashboard_analysis.urgency || "—"}</p>
                    <p><strong className="text-white">Next steps:</strong> {result.dashboard_analysis.next_steps || "—"}</p>
                    {result.dashboard_analysis.confidence_note ? <p className="text-slate-400">{result.dashboard_analysis.confidence_note}</p> : null}
                  </div>
                </ResultCard>
              ) : null}

              {result.part_analysis ? (
                <ResultCard title="Automotive Part Photo Analysis">
                  <div className="space-y-2">
                    <p><strong className="text-white">Likely part:</strong> {result.part_analysis.part_name || "Not identified"}</p>
                    <p><strong className="text-white">Function:</strong> {result.part_analysis.function || "—"}</p>
                    <p><strong className="text-white">Location:</strong> {result.part_analysis.location || "—"}</p>
                    <p><strong className="text-white">Importance:</strong> {result.part_analysis.importance || "—"}</p>
                    <p><strong className="text-white">Replace overview:</strong> {result.part_analysis.replace_overview || "—"}</p>
                    {result.part_analysis.caution_notes ? <p><strong className="text-white">Caution:</strong> {result.part_analysis.caution_notes}</p> : null}
                    {result.part_analysis.confidence_note ? <p className="text-slate-400">{result.part_analysis.confidence_note}</p> : null}
                  </div>
                </ResultCard>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <ResultCard title="Likely Causes">
                  {result.likely_causes.length ? (
                    <div className="space-y-3">
                      {result.likely_causes.map((cause, index) => (
                        <div key={`${cause.cause}-${index}`} className="rounded-xl bg-slate-800 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold text-white">{cause.cause}</p>
                            <span className="text-xs font-bold text-slate-400">{Math.round(cause.probability * 100)}%</span>
                          </div>
                          <p className="mt-1 text-slate-400">{cause.why}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p>No likely causes returned.</p>}
                </ResultCard>

                <ResultCard title="Estimated Cost Range">
                  <p className="text-3xl font-black text-white">${result.estimated_cost_range_usd.low} – ${result.estimated_cost_range_usd.high}</p>
                  <p className="mt-2 text-slate-400">{result.estimated_cost_range_usd.notes}</p>
                </ResultCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <ResultCard title="Quick Checks">
                  <ul className="list-disc space-y-1 pl-5">{result.quick_checks.map((item) => <li key={item}>{item}</li>)}</ul>
                </ResultCard>
                <ResultCard title="Recommended Tests">
                  <ul className="list-disc space-y-1 pl-5">{result.recommended_tests.map((item) => <li key={item}>{item}</li>)}</ul>
                </ResultCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <ResultCard title="Safety Notes">
                  <ul className="list-disc space-y-1 pl-5">{result.safety_notes.map((item) => <li key={item}>{item}</li>)}</ul>
                </ResultCard>
                <ResultCard title="Follow-up Questions">
                  <ul className="list-disc space-y-1 pl-5">{result.follow_up_questions.map((item) => <li key={item}>{item}</li>)}</ul>
                </ResultCard>
              </div>

              <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-red-600 p-6 text-center shadow-xl">
                <h2 className="text-xl font-black">Need mechanic help?</h2>
                <p className="mt-2 text-sm text-white/90">The existing Smart Fix Mobile Auto Repair contact option is preserved during the MekaReports transition.</p>
                <a href={smsHref} className="mt-4 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg">
                  Text Smart Fix
                </a>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
