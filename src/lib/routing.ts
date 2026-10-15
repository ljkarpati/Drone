// Plans the drive out. The browser sends the start, the end and the danger zones to our
// server (/api/route), which asks OpenRouteService for a driving route that avoids them.
// Then we double-check the answer ourselves before showing it.

import type { RiskZones, ZoneProperties } from "./risk";
import {
  circlePolygon,
  clipLineToLongitudes,
  densify,
  distanceM,
  pointInRing,
  pointsAlongLine,
  type LonLat,
} from "./geo";
import { BRAYS_BAYOU } from "../data/brays-bayou";
import { gaugeById } from "../data/gauges";

export type Place = { label: string; lon: number; lat: number };

export type Destination = Place & { id: string; detail: string };

// Preset destinations: higher ground well away from Brays Bayou (more than 1.5 km from it).
// Coordinates are the intersections in OpenStreetMap (checked 2026-10-15).
export const PRESET_DESTINATIONS: Destination[] = [
  {
    id: "north",
    label: "North of I-610 via Stella Link",
    detail: "Stella Link Rd at Holcombe Blvd",
    lon: -95.44022,
    lat: 29.70598,
  },
  {
    id: "west",
    label: "West via Hillcroft",
    detail: "Hillcroft Ave at Westpark Dr",
    lon: -95.50113,
    lat: 29.72305,
  },
];

// A starting point for demos when you are not in Houston: a Meyerland street south of the
// bayou, about 500 m from it (intersection from OpenStreetMap, checked 2026-10-15).
export const DEMO_START: Place = {
  label: "Rutherglenn Dr at Manhattan Dr (demo start)",
  lon: -95.47294,
  lat: 29.67298,
};

// Roughly greater Houston. Routes outside this box are refused (see api/route.ts).
export const HOUSTON_BOX = { west: -95.9, east: -95.0, south: 29.45, north: 30.1 };

export function inHouston(p: { lon: number; lat: number }): boolean {
  return (
    p.lon >= HOUSTON_BOX.west &&
    p.lon <= HOUSTON_BOX.east &&
    p.lat >= HOUSTON_BOX.south &&
    p.lat <= HOUSTON_BOX.north
  );
}

export type RouteResult = {
  coords: LonLat[];
  distanceM: number;
  durationS: number;
  roads: string[]; // the main roads used, longest first
  avoidedAreas: number; // how many danger stretches of bayou the route was told to avoid
  startInZone: string[]; // names of gauges whose danger zone you are starting in or next to
  endInZone: string[];
  crossesZone: boolean; // our own safety check: true would mean the route touches a zone
};

export type RouteOutcome =
  | { kind: "ok"; route: RouteResult }
  | { kind: "noRoute"; message: string }
  | { kind: "error"; message: string };

const round5 = (n: number) => Math.round(n * 1e5) / 1e5; // 5 decimals is about 1 meter

/** Does any part of the line pass through any of these rings? Checks every 20 m. */
export function lineCrossesRings(line: LonLat[], rings: LonLat[][]): boolean {
  return densify(line, 20).some((p) => rings.some((ring) => pointInRing(p, ring)));
}

/** If you are this close to a danger circle (or inside it), we count you as "in" it. */
export const NEAR_ZONE_M = 150;
/** Half-width of the strip that always blocks the bayou channel and its bridges. */
export const CHANNEL_RADIUS_M = 40;

export type AvoidPlan = {
  rings: LonLat[][]; // every area the route must stay out of
  startNear: string[]; // gauge ids whose danger zone you start in or next to
  endNear: string[];
  avoidedGauges: string[]; // gauge ids whose zones the route is told to avoid
};

/**
 * Decides exactly which areas the route must avoid.
 *
 * The tricky case is when you START inside (or right next to) a danger zone, which is likely:
 * the people who need this app live near the bayou. If we blocked the circle you're standing
 * in, there would be no way out. If we simply dropped it, we'd open a gap in the danger
 * strip, and the route might send you across the nearest bayou bridge: straight toward the
 * water. So we do both halves of the right thing:
 *   1. open up the big circles around you, so the route can lead you out, and
 *   2. keep a thin strip over the bayou channel inside those circles blocked, so the route
 *      leads you AWAY from the water instead of across it.
 * The same goes for the destination.
 */
export function buildAvoidAreas(zones: RiskZones, start: LonLat, end: LonLat): AvoidPlan {
  const rings: LonLat[][] = [];
  const startNear = new Set<string>();
  const endNear = new Set<string>();
  const avoidedGauges = new Set<string>();
  const opened: ZoneProperties[] = [];

  for (const f of zones.features) {
    const { center, radiusM, gaugeId } = f.properties;
    const nearStart = distanceM(start, center) <= radiusM + NEAR_ZONE_M;
    const nearEnd = distanceM(end, center) <= radiusM + NEAR_ZONE_M;
    if (nearStart) startNear.add(gaugeId);
    if (nearEnd) endNear.add(gaugeId);
    if (nearStart || nearEnd) {
      opened.push(f.properties);
    } else {
      rings.push(f.geometry.coordinates[0] as LonLat[]);
      avoidedGauges.add(gaugeId);
    }
  }

  // Inside each opened circle, stamp small circles along the bayou itself.
  const used = new Set<string>();
  for (const zone of opened) {
    const gauge = gaugeById(zone.gaugeId);
    if (!gauge) continue;
    const stretch = clipLineToLongitudes(BRAYS_BAYOU, gauge.reach.west, gauge.reach.east);
    for (const p of pointsAlongLine(stretch, CHANNEL_RADIUS_M)) {
      const key = `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
      if (used.has(key) || distanceM(p, zone.center) > zone.radiusM) continue;
      used.add(key);
      const ring = circlePolygon(p, CHANNEL_RADIUS_M, 12);
      // Only if you're literally on the bank do we leave the channel open where you are.
      if (pointInRing(start, ring) || pointInRing(end, ring)) continue;
      rings.push(ring);
    }
  }

  return {
    rings,
    startNear: [...startNear],
    endNear: [...endNear],
    avoidedGauges: [...avoidedGauges],
  };
}

export async function requestRoute(start: Place, end: Place, zones: RiskZones): Promise<RouteOutcome> {
  const startPt: LonLat = [start.lon, start.lat];
  const endPt: LonLat = [end.lon, end.lat];
  const plan = buildAvoidAreas(zones, startPt, endPt);

  let res: Response;
  try {
    res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: startPt.map(round5),
        end: endPt.map(round5),
        // GeoJSON MultiPolygon coordinates: a list of polygons, each a list of rings.
        avoid: plan.rings.map((ring) => [ring.map(([lon, lat]) => [round5(lon), round5(lat)])]),
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return {
      kind: "error",
      message: "Couldn't reach the route planner. Check your signal and try again.",
    };
  }

  const body = await res.json().catch(() => ({}));
  if (res.status === 404 && body.error === "no_route") {
    return {
      kind: "noRoute",
      message:
        "No route avoids all flooded areas. Stay where you are and call 911 if you are in danger.",
    };
  }
  if (!res.ok) {
    return { kind: "error", message: body.message ?? `The route planner answered ${res.status}.` };
  }

  const coords = body.coordinates as LonLat[];
  const names = (ids: string[]) => ids.map((id) => gaugeById(id)?.shortName ?? id);
  return {
    kind: "ok",
    route: {
      coords,
      distanceM: body.distanceM,
      durationS: body.durationS,
      roads: body.roads ?? [],
      avoidedAreas: plan.avoidedGauges.length,
      startInZone: names(plan.startNear),
      endInZone: names(plan.endNear),
      crossesZone: lineCrossesRings(coords, plan.rings),
    },
  };
}

/** Points spread evenly along the route, at the given fractions of its length (0 to 1). */
export function pointsAtFractions(coords: LonLat[], fractions: number[]): LonLat[] {
  const legs = coords.slice(1).map((p, i) => distanceM(coords[i], p));
  const total = legs.reduce((a, b) => a + b, 0);
  return fractions.map((f) => {
    let target = f * total;
    for (let i = 0; i < legs.length; i++) {
      if (target <= legs[i]) {
        const t = legs[i] === 0 ? 0 : target / legs[i];
        const a = coords[i];
        const b = coords[i + 1];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as LonLat;
      }
      target -= legs[i];
    }
    return coords[coords.length - 1];
  });
}

const latLon = ([lon, lat]: LonLat) => `${lat.toFixed(5)},${lon.toFixed(5)}`;

/**
 * Opens the route in Google Maps. We pass 3 points along our route as stops, so Google
 * follows our path instead of picking its own (phones allow at most 3 stops in a link).
 */
export function googleMapsUrl(coords: LonLat[]): string {
  const waypoints = pointsAtFractions(coords, [0.25, 0.5, 0.75]).map(latLon).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: latLon(coords[0]),
    destination: latLon(coords[coords.length - 1]),
    travelmode: "driving",
    waypoints,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Opens the route in Apple Maps. Apple Maps links can only take a start and an end, so
 * Apple may pick a different road. The app warns about this next to the button.
 */
export function appleMapsUrl(coords: LonLat[]): string {
  const params = new URLSearchParams({
    saddr: latLon(coords[0]),
    daddr: latLon(coords[coords.length - 1]),
    dirflg: "d",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Searches for an address through our server (/api/geocode). */
export async function geocode(query: string): Promise<Place[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `Address search answered ${res.status}.`);
  return body.results as Place[];
}
