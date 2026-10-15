// Small map-math helpers. Everything uses [longitude, latitude] pairs, the same order GeoJSON uses.
//
// We treat the Earth as flat over a few miles, which is accurate to well under 1% across
// Meyerland. The two facts we need:
//   - 1 degree of latitude  is about 111,320 meters everywhere.
//   - 1 degree of longitude is about 111,320 meters times cos(latitude), because lines of
//     longitude squeeze together as you go north. In Houston that is about 96,700 meters.

export type LonLat = [number, number];

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLon(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Straight-line distance in meters between two points. */
export function distanceM(a: LonLat, b: LonLat): number {
  const midLat = (a[1] + b[1]) / 2;
  const dx = (b[0] - a[0]) * metersPerDegLon(midLat);
  const dy = (b[1] - a[1]) * METERS_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** Moves `t` of the way from a to b (t = 0 is a, t = 1 is b). */
function lerp(a: LonLat, b: LonLat, t: number): LonLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * A circle drawn as a polygon with `sides` corners (32 looks round on any phone).
 * The ring is closed (the last point repeats the first) and goes counter-clockwise,
 * which is what the GeoJSON standard asks for.
 */
export function circlePolygon(center: LonLat, radiusM: number, sides = 32): LonLat[] {
  const [lon, lat] = center;
  const ring: LonLat[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    ring.push([
      lon + (radiusM * Math.cos(angle)) / metersPerDegLon(lat),
      lat + (radiusM * Math.sin(angle)) / METERS_PER_DEG_LAT,
    ]);
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * Keeps only the part of a line between two longitudes (west and east).
 * We use it to cut out the stretch of bayou that one gauge is responsible for.
 */
export function clipLineToLongitudes(line: LonLat[], west: number, east: number): LonLat[] {
  const out: LonLat[] = [];
  const add = (p: LonLat) => {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  };
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (a[0] === b[0]) {
      if (a[0] >= west && a[0] <= east) {
        add(a);
        add(b);
      }
      continue;
    }
    // Longitude changes steadily along the segment, so we can solve for where it
    // crosses `west` and `east`, then keep the piece in between.
    const tWest = (west - a[0]) / (b[0] - a[0]);
    const tEast = (east - a[0]) / (b[0] - a[0]);
    const tStart = Math.max(0, Math.min(tWest, tEast));
    const tEnd = Math.min(1, Math.max(tWest, tEast));
    if (tStart <= tEnd) {
      add(lerp(a, b, tStart));
      add(lerp(a, b, tEnd));
    }
  }
  return out;
}

/**
 * Walks along a line and drops a point every `spacingM` meters, like stamping it
 * with a rubber stamp. Always includes the first and last point.
 */
export function pointsAlongLine(line: LonLat[], spacingM: number): LonLat[] {
  if (line.length === 0) return [];
  const points: LonLat[] = [line[0]];
  let sinceLast = 0; // meters walked since the last stamp
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const segment = distanceM(a, b);
    let walked = 0; // meters walked along this segment
    while (sinceLast + (segment - walked) >= spacingM) {
      walked += spacingM - sinceLast;
      points.push(lerp(a, b, walked / segment));
      sinceLast = 0;
    }
    sinceLast += segment - walked;
  }
  const end = line[line.length - 1];
  if (distanceM(points[points.length - 1], end) > 1) points.push(end);
  return points;
}

/**
 * Is the point inside the polygon ring? Classic "ray casting": draw an imaginary line
 * from the point going east and count how many polygon edges it crosses.
 * An odd number of crossings means the point is inside.
 */
export function pointInRing(point: LonLat, ring: LonLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Adds extra points along a line so no two points are more than `stepM` apart.
 * Used to check a route against danger zones: a long straight road might have its two
 * end points outside a zone but still cut through the middle of it.
 */
export function densify(line: LonLat[], stepM: number): LonLat[] {
  if (line.length < 2) return line.slice();
  const out: LonLat[] = [line[0]];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const pieces = Math.max(1, Math.ceil(distanceM(a, b) / stepM));
    for (let k = 1; k <= pieces; k++) out.push(lerp(a, b, k / pieces));
  }
  return out;
}
