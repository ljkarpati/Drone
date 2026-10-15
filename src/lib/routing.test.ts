import { describe, expect, it } from "vitest";
import { GAUGES } from "../data/gauges";
import { BRAYS_BAYOU } from "../data/brays-bayou";
import { clipLineToLongitudes, distanceM, pointInRing, pointsAlongLine, type LonLat } from "./geo";
import { riskZones } from "./risk";
import {
  appleMapsUrl,
  buildAvoidAreas,
  CHANNEL_RADIUS_M,
  googleMapsUrl,
  lineCrossesRings,
  pointsAtFractions,
  PRESET_DESTINATIONS,
} from "./routing";

const fresh = (stageFt: number) => ({ stageFt, ageMin: 10 });
const bothFlooding = riskZones(GAUGES, { HBMT2: fresh(41.5), GSST2: fresh(57.5) });
const north: LonLat = [PRESET_DESTINATIONS[0].lon, PRESET_DESTINATIONS[0].lat];
const inside = (p: LonLat, rings: LonLat[][]) => rings.some((r) => pointInRing(p, r));

describe("buildAvoidAreas", () => {
  it("avoids every zone when you start far from the bayou", () => {
    const farAway: LonLat = [-95.45, 29.72];
    const plan = buildAvoidAreas(bothFlooding, farAway, north);
    expect(plan.rings).toHaveLength(bothFlooding.features.length);
    expect(plan.startNear).toEqual([]);
    expect(plan.avoidedGauges.sort()).toEqual(["GSST2", "HBMT2"]);
  });

  it("never traps you inside a zone you start in", () => {
    const southBank: LonLat = [-95.4676, 29.6776]; // ~130 m south of the bayou at S Rice Ave
    const plan = buildAvoidAreas(bothFlooding, southBank, north);
    expect(plan.startNear).toContain("HBMT2");
    expect(inside(southBank, plan.rings)).toBe(false);
  });

  it("still blocks the bayou itself next to you, so the route can't send you across it", () => {
    const southBank: LonLat = [-95.4676, 29.6776];
    const plan = buildAvoidAreas(bothFlooding, southBank, north);
    // Every point of the danger stretch of bayou must still be blocked (except right where you are).
    for (const g of GAUGES) {
      const stretch = clipLineToLongitudes(BRAYS_BAYOU, g.reach.west, g.reach.east);
      for (const p of pointsAlongLine(stretch, 10)) {
        if (distanceM(p, southBank) < CHANNEL_RADIUS_M * 2) continue;
        expect(inside(p, plan.rings), `bayou point ${p} near ${g.shortName} is open`).toBe(true);
      }
    }
  });

  it("treats being just outside a zone the same as inside it", () => {
    // Pick a point 100 m outside the edge of a zone circle (within NEAR_ZONE_M).
    const f = bothFlooding.features[10];
    const [lon, lat] = f.properties.center;
    const justOutside: LonLat = [lon, lat - (f.properties.radiusM + 100) / 111_320];
    const plan = buildAvoidAreas(bothFlooding, justOutside, north);
    expect(plan.startNear).toContain(f.properties.gaugeId);
  });

  it("does nothing special when there are no zones", () => {
    const empty = riskZones(GAUGES, { HBMT2: fresh(17), GSST2: fresh(39) });
    const plan = buildAvoidAreas(empty, [-95.4676, 29.6776], north);
    expect(plan.rings).toEqual([]);
    expect(plan.avoidedGauges).toEqual([]);
  });
});

describe("lineCrossesRings", () => {
  const square: LonLat[] = [
    [-95.46, 29.68],
    [-95.45, 29.68],
    [-95.45, 29.69],
    [-95.46, 29.69],
    [-95.46, 29.68],
  ];
  it("catches a long straight road that cuts through a zone between its end points", () => {
    expect(lineCrossesRings([[-95.47, 29.685], [-95.44, 29.685]], [square])).toBe(true);
  });
  it("is false for a road that stays outside", () => {
    expect(lineCrossesRings([[-95.47, 29.70], [-95.44, 29.70]], [square])).toBe(false);
  });
});

describe("map app links", () => {
  const route: LonLat[] = [
    [-95.47, 29.67],
    [-95.47, 29.68],
    [-95.46, 29.68],
    [-95.46, 29.7],
  ];

  it("spreads points evenly along the route", () => {
    const straight: LonLat[] = [
      [-95.47, 29.67],
      [-95.47, 29.69],
    ];
    const [quarter, mid] = pointsAtFractions(straight, [0.25, 0.5]);
    expect(quarter[1]).toBeCloseTo(29.675, 6);
    expect(mid[1]).toBeCloseTo(29.68, 6);
  });

  it("gives Google Maps the start, the end and 3 stops in latitude,longitude order", () => {
    const url = new URL(googleMapsUrl(route));
    expect(url.searchParams.get("origin")).toBe("29.67000,-95.47000");
    expect(url.searchParams.get("destination")).toBe("29.70000,-95.46000");
    expect(url.searchParams.get("waypoints")?.split("|")).toHaveLength(3);
    expect(url.searchParams.get("travelmode")).toBe("driving");
  });

  it("gives Apple Maps the start and end", () => {
    const url = new URL(appleMapsUrl(route));
    expect(url.searchParams.get("saddr")).toBe("29.67000,-95.47000");
    expect(url.searchParams.get("daddr")).toBe("29.70000,-95.46000");
  });
});
