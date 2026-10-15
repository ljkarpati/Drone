// GET /api/geocode?q=5200 Braeswood Blvd
// Turns an address into map coordinates using OpenRouteService's geocoder.
// Runs on the server so our ORS_API_KEY stays secret.
//
// Results are pulled toward Meyerland (focus.point) and limited to the Houston area,
// so typing "Main St" finds Houston's Main St, not one in another state.

const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const MEYERLAND = { lat: 29.688, lon: -95.456 };
const BOX = { west: -95.9, east: -95.0, south: 29.45, north: 30.1 };

function json(status: number, body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });
}

type OrsGeocodeResponse = {
  features?: { geometry: { coordinates: [number, number] }; properties: { label?: string } }[];
};

export async function GET(request: Request): Promise<Response> {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    return json(500, {
      error: "no_key",
      message: "Address search isn't set up yet: the server has no ORS_API_KEY. See the README.",
    });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) {
    return json(400, { error: "bad_request", message: "Type at least 3 characters." });
  }

  const url = new URL(ORS_GEOCODE_URL);
  url.searchParams.set("api_key", key);
  url.searchParams.set("text", q);
  url.searchParams.set("size", "5");
  url.searchParams.set("focus.point.lat", String(MEYERLAND.lat));
  url.searchParams.set("focus.point.lon", String(MEYERLAND.lon));
  url.searchParams.set("boundary.country", "US");
  url.searchParams.set("boundary.rect.min_lon", String(BOX.west));
  url.searchParams.set("boundary.rect.max_lon", String(BOX.east));
  url.searchParams.set("boundary.rect.min_lat", String(BOX.south));
  url.searchParams.set("boundary.rect.max_lat", String(BOX.north));

  let ors: globalThis.Response;
  try {
    ors = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return json(502, { error: "upstream", message: "Address search didn't answer. Try again." });
  }
  if (!ors.ok) {
    const message =
      ors.status === 429
        ? "Too many searches right now. Wait a minute and try again."
        : `Address search answered ${ors.status}.`;
    return json(502, { error: "upstream", message });
  }

  const data = (await ors.json()) as OrsGeocodeResponse;
  const results = (data.features ?? []).map((f) => ({
    label: f.properties.label ?? q,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
  // Addresses don't move, so the CDN may reuse an answer for a day.
  return json(200, { results }, "public, s-maxage=86400");
}
