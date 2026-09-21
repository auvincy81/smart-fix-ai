import "server-only";

type JsonRecord = Record<string, unknown>;
export type VinLookup = {
  vin: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  trim: string;
  note: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export async function decodeVin(vin: string, signal?: AbortSignal): Promise<VinLookup> {
  const cleanVin = vin.trim().toUpperCase();

  if (cleanVin.length !== 17) {
    return { vin: cleanVin, year: "", make: "", model: "", engine: "", trim: "", note: "VIN must be 17 characters for full lookup." };
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(cleanVin)}?format=json`,
      { method: "GET", cache: "no-store", signal }
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
