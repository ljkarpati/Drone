// POST /api/route
// Asks OpenRouteService (ORS) for a driving route that avoids the danger zones.
//
// This runs on Vercel's server, never in the browser, because it uses our secret
// ORS_API_KEY. If the key were in the browser, anyone could copy it and use up our quota.
//
// The browser sends:  { start: [lon, lat], end: [lon, lat], avoid: MultiPolygon coordinates }
// We answer:          { coordinates, distanceM, durationS, roads }
//                 or  404 { error: "no_route" } when no route avoids the zones.

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

// Only plan trips around Houston, and cap the zone count, so nobody can use our key
// as a free routing service for the rest of the world.
const BOX = { west: -95.9, east: -95.0, south: 29.45, north: 30.1 };
const MAX_POLYGONS = 400;
const MAX_RING_POINTS = 100;

type LonLat = [number, number];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isPoint(p: unknown): p is LonLat {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    p[0] >= BOX.west &&
    p[0] <= BOX.east &&
    p[1] >= BOX.south &&
    p[1] <= BOX.north
  );
}

function isPolygon(poly: unknown): poly is LonLat[][] {
  return (
    Array.isArray(poly) &&
    poly.length === 1 &&
    Array.isArray(poly[0]) &&
    poly[0].length >= 4 &&
    poly[0].length <= MAX_RING_POINTS &&
    poly[0].every(isPoint)
  );
}

type OrsStep = { name?: string; distance?: number };
type OrsResponse = {
  features?: {
    geometry: { coordinates: LonLat[] };
    properties: {
      summary?: { distance?: number; duration?: number };
      segments?: { steps?: OrsStep[] }[];
    };
  }[];
  error?: { code?: number; message?: string } | string;
};

/** The 3 roads the route spends the most distance on, e.g. ["Hillcroft Avenue", ...]. */
function mainRoads(segments: { steps?: OrsStep[] }[] = []): string[] {
  const meters = new Map<string, number>();
  for (const step of segments.flatMap((s) => s.steps ?? [])) {
    const name = step.name?.trim();
    if (!name || name === "-") continue;
    meters.set(name, (meters.get(name) ?? 0) + (step.distance ?? 0));
  }
  return [...meters.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    return json(500, {
      error: "no_key",
      message: "Routing isn't set up yet: the server has no ORS_API_KEY. See the README.",
    });
  }

  let input: { start?: unknown; end?: unknown; avoid?: unknown };
  try {
    input = await request.json();
  } catch {
    return json(400, { error: "bad_request", message: "Expected JSON." });
  }
  const { start, end } = input;
  const avoid = input.avoid ?? [];
  if (!isPoint(start) || !isPoint(end)) {
    return json(400, {
      error: "bad_request",
      message: "TurnAround only plans routes in the Houston area.",
    });
  }
  if (!Array.isArray(avoid) || avoid.length > MAX_POLYGONS || !avoid.every(isPolygon)) {
    return json(400, { error: "bad_request", message: "The danger zones were not valid." });
  }

  const orsBody: Record<string, unknown> = {
    coordinates: [start, end],
    instructions: true, // we only use the street names, to say which roads the route takes
    units: "m",
    language: "en",
  };
  if (avoid.length > 0) {
    orsBody.options = { avoid_polygons: { type: "MultiPolygon", coordinates: avoid } };
  }

  let ors: globalThis.Response;
  try {
    ors = await fetch(ORS_URL, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
        Accept: "application/geo+json, application/json",
      },
      body: JSON.stringify(orsBody),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return json(502, { error: "upstream", message: "The route planner didn't answer. Try again." });
  }
  const data = (await ors.json().catch(() => ({}))) as OrsResponse;

  if (!ors.ok) {
    const code = typeof data.error === "object" ? data.error?.code : undefined;
    // ORS error 2009 = "route could not be found", 2010 = "no road near that point".
    // With danger zones in play, both mean the same thing for a driver: no safe way out.
    if (code === 2009 || (code === 2010 && avoid.length > 0)) {
      return json(404, { error: "no_route" });
    }
    if (code === 2010) {
      return json(422, { error: "no_road", message: "Couldn't find a road near that point." });
    }
    if (ors.status === 429) {
      return json(429, {
        error: "rate_limited",
        message: "Too many route requests right now. Wait a minute and try again.",
      });
    }
    if (ors.status === 401 || ors.status === 403) {
      return json(502, { error: "bad_key", message: "The routing service rejected our API key." });
    }
    return json(502, { error: "upstream", message: `The route planner answered ${ors.status}.` });
  }

  const feature = data.features?.[0];
  if (!feature) return json(404, { error: "no_route" });
  return json(200, {
    coordinates: feature.geometry.coordinates,
    distanceM: feature.properties.summary?.distance ?? 0,
    durationS: feature.properties.summary?.duration ?? 0,
    roads: mainRoads(feature.properties.segments),
  });
}
