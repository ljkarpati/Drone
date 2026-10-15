// Which side of the bayou are you on, and does a route cross the water?
//
// Brays Bayou flows west to east through Meyerland. If you stand on the bayou facing
// downstream (east), north is on your left and south is on your right. So to tell which side
// a point is on, we find the closest piece of the bayou and check whether the point is to
// its left or right. (The math trick is the "cross product": its sign says left or right.)

import { BRAYS_BAYOU } from "../data/brays-bayou";
import { BRAYS_BRIDGES, WILLOW_WATERHOLE } from "../data/other-bayous";
import { distanceM, type LonLat } from "./geo";

export type Side = "north" | "south";

// Squash longitude so a step east and a step north are the same distance (see geo.ts).
const X_SCALE = Math.cos((29.68 * Math.PI) / 180);

/** Is `p` to the left of the line's direction of flow (true) or to the right (false)? */
function isLeftOfLine(p: LonLat, line: LonLat[]): boolean {
  let best = Infinity;
  let left = false;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = [line[i][0] * X_SCALE, line[i][1]];
    const [bx, by] = [line[i + 1][0] * X_SCALE, line[i + 1][1]];
    const [px, py] = [p[0] * X_SCALE, p[1]];
    // Closest point on this piece of the line.
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (d < best) {
      best = d;
      left = dx * (py - ay) - dy * (px - ax) > 0; // cross product > 0 means "to the left"
    }
  }
  return left;
}

/** Which side of Brays Bayou a point is on. */
export function braysSide(p: LonLat): Side {
  return isLeftOfLine(p, BRAYS_BAYOU) ? "north" : "south";
}

/** Do two line pieces a-b and c-d cross each other? */
function segmentsCross(a: LonLat, b: LonLat, c: LonLat, d: LonLat): boolean {
  const turn = (p: LonLat, q: LonLat, r: LonLat) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return turn(a, b, c) !== turn(a, b, d) && turn(c, d, a) !== turn(c, d, b);
}

/** Every point where `route` crosses `river` (roughly: the middle of the crossing piece). */
export function crossingPoints(route: LonLat[], river: LonLat[]): LonLat[] {
  const out: LonLat[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    for (let j = 0; j < river.length - 1; j++) {
      if (segmentsCross(a, b, river[j], river[j + 1])) {
        out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      }
    }
  }
  return out;
}

/** Names of the places a route crosses Brays Bayou, like ["Fondren Rd"]. */
export function braysCrossings(route: LonLat[]): string[] {
  const names = crossingPoints(route, BRAYS_BAYOU).map(
    (p) => BRAYS_BRIDGES.find((b) => distanceM(p, [b.lon, b.lat]) < 400)?.name ?? "a smaller bridge",
  );
  // A road can wiggle over the same bridge more than once on the map; name each bridge once.
  const unique = [...new Set(names)];
  const named = unique.filter((n) => n !== "a smaller bridge");
  return named.length > 0 ? named : unique;
}

/** Does the route cross Willow Waterhole Bayou (which has no gauge)? */
export function crossesWillowWaterhole(route: LonLat[]): boolean {
  return crossingPoints(route, WILLOW_WATERHOLE).length > 0;
}
