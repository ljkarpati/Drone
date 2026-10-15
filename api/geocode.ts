// GET /api/geocode?q=4800 Braeswood Blvd
// Turns what you typed into map coordinates. Runs on the server so our ORS_API_KEY stays secret.
//
// We ask two free services and combine the answers:
//  1. The US Census Bureau geocoder, for anything that starts with a house number. It knows
//     the house-number ranges of every US street, so it finds "6300 Bankside Dr" exactly.
//     (OpenRouteService often only knows the street, and returns the street's middle.)
//  2. OpenRouteService, for everything else: places, schools, businesses, intersections.
// Then we drop duplicates and label any answer that is only a street, not the exact house.

const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const MEYERLAND = { lat: 29.688, lon: -95.456 };
const BOX = { west: -95.9, east: -95.0, south: 29.45, north: 30.1 };
const MAX_RESULTS = 5;

type Result = { label: string; lon: number; lat: number; note?: string };

function json(status: number, body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });
}

function inBox(r: Result): boolean {
  return r.lon >= BOX.west && r.lon <= BOX.east && r.lat >= BOX.south && r.lat <= BOX.north;
}

/** "6300 BANKSIDE DR, HOUSTON, TX, 77096" -> "6300 Bankside Dr, Houston, TX 77096" */
export function tidyCensusLabel(raw: string): string {
  const parts = raw.split(",").map((p) => p.trim());
  const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const [street = "", city = "", state = "", zip = ""] = parts;
  return `${title(street)}, ${title(city)}, ${state} ${zip}`.trim();
}

type CensusResponse = {
  result?: { addressMatches?: { matchedAddress: string; coordinates: { x: number; y: number } }[] };
};

async function censusSearch(q: string): Promise<Result[]> {
  // The Census geocoder needs a city. If you didn't type one, assume Houston.
  const full = /,|\btx\b|texas|\b\d{5}\b/i.test(q) ? q : `${q}, Houston, TX`;
  const url = new URL(CENSUS_URL);
  url.searchParams.set("address", full);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Census answered ${res.status}`);
  const data = (await res.json()) as CensusResponse;
  return (data.result?.addressMatches ?? []).map((m) => ({
    label: tidyCensusLabel(m.matchedAddress),
    lon: m.coordinates.x,
    lat: m.coordinates.y,
  }));
}

type OrsGeocodeResponse = {
  features?: {
    geometry: { coordinates: [number, number] };
    properties: { label?: string; layer?: string };
  }[];
};

async function orsSearch(q: string, key: string): Promise<Result[]> {
  const url = new URL(ORS_GEOCODE_URL);
  url.searchParams.set("api_key", key);
  url.searchParams.set("text", q);
  url.searchParams.set("size", "10");
  url.searchParams.set("focus.point.lat", String(MEYERLAND.lat));
  url.searchParams.set("focus.point.lon", String(MEYERLAND.lon));
  url.searchParams.set("boundary.country", "US");
  url.searchParams.set("boundary.rect.min_lon", String(BOX.west));
  url.searchParams.set("boundary.rect.max_lon", String(BOX.east));
  url.searchParams.set("boundary.rect.min_lat", String(BOX.south));
  url.searchParams.set("boundary.rect.max_lat", String(BOX.north));
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(res.status === 429 ? "rate_limited" : `ORS answered ${res.status}`);
  const data = (await res.json()) as OrsGeocodeResponse;
  return (data.features ?? []).map((f) => ({
    label: f.properties.label ?? q,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    // "street" means ORS only found the street, and the point is somewhere along it.
    note: f.properties.layer === "street" ? "Street only: exact house number not found" : undefined,
  }));
}

/** Removes repeats: same name, or two answers within about 30 m of each other. */
export function dedupe(results: Result[]): Result[] {
  const out: Result[] = [];
  for (const r of results) {
    const repeat = out.some(
      (o) =>
        o.label.toLowerCase() === r.label.toLowerCase() ||
        (Math.abs(o.lat - r.lat) < 0.0003 && Math.abs(o.lon - r.lon) < 0.0003),
    );
    if (!repeat) out.push(r);
  }
  return out;
}

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) {
    return json(400, { error: "bad_request", message: "Type at least 3 characters." });
  }

  const key = process.env.ORS_API_KEY;
  const startsWithNumber = /^\d+\s+\S/.test(q);
  const [census, ors] = await Promise.allSettled([
    startsWithNumber ? censusSearch(q) : Promise.resolve([]),
    key ? orsSearch(q, key) : Promise.reject(new Error("no_key")),
  ]);

  const exact = census.status === "fulfilled" ? census.value : [];
  const other = ors.status === "fulfilled" ? ors.value : [];
  if (exact.length === 0 && ors.status === "rejected") {
    const reason = String(ors.reason?.message ?? ors.reason);
    const message =
      reason === "no_key"
        ? "Address search isn't set up yet: the server has no ORS_API_KEY. See the README."
        : reason === "rate_limited"
          ? "Too many searches right now. Wait a minute and try again."
          : "Address search didn't answer. Try again.";
    return json(reason === "no_key" ? 500 : 502, { error: "upstream", message });
  }

  // Exact house matches first, then ORS answers that are real places, then street-only ones.
  const ranked = [
    ...exact,
    ...other.filter((r) => !r.note),
    ...other.filter((r) => r.note),
  ].filter(inBox);
  const results = dedupe(ranked).slice(0, MAX_RESULTS);
  // Addresses don't move, so the CDN may reuse an answer for a day.
  return json(200, { results }, "public, s-maxage=86400");
}
