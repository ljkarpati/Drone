import { describe, expect, it } from "vitest";
import { GAUGES, type Gauge } from "../data/gauges";
import { BRAYS_BAYOU } from "../data/brays-bayou";
import {
  classifyRisk,
  effectiveRisk,
  overallStatus,
  percentToFlood,
  riskZones,
  STALE_AFTER_MIN,
} from "./risk";
import { clipLineToLongitudes, distanceM, pointInRing, pointsAlongLine, type LonLat } from "./geo";

// The real S Main St numbers: normal 16.8, action 38, flood 41, moderate 42, major 43.
const mainSt = GAUGES.find((g) => g.id === "HBMT2")!;
const stages = mainSt.stages;

describe("classifyRisk", () => {
  it("is safe at normal levels and just below action stage", () => {
    expect(classifyRisk(16.8, stages)).toBe("safe");
    expect(classifyRisk(37.99, stages)).toBe("safe");
  });

  it("is atRisk exactly at action stage", () => {
    expect(classifyRisk(38, stages)).toBe("atRisk");
    expect(classifyRisk(40.99, stages)).toBe("atRisk");
  });

  it("is flooding exactly at flood stage, and through moderate", () => {
    expect(classifyRisk(41, stages)).toBe("flooding");
    expect(classifyRisk(42, stages)).toBe("flooding");
    expect(classifyRisk(42.99, stages)).toBe("flooding");
  });

  it("is major exactly at major flood stage and above", () => {
    expect(classifyRisk(43, stages)).toBe("major");
    expect(classifyRisk(45.67, stages)).toBe("major"); // Harvey's crest at S Main St
  });

  it("is unknown when there is no reading", () => {
    expect(classifyRisk(null, stages)).toBe("unknown");
    expect(classifyRisk(Number.NaN, stages)).toBe("unknown");
    expect(classifyRisk(-999, stages)).toBe("unknown"); // NOAA's "no data" value
  });

  it("is unknown when the reading is stale, even if it was high", () => {
    expect(classifyRisk(45, stages, STALE_AFTER_MIN + 1)).toBe("unknown");
    expect(classifyRisk(20, stages, 24 * 60)).toBe("unknown");
  });

  it("still trusts a reading exactly at the stale limit", () => {
    expect(classifyRisk(45, stages, STALE_AFTER_MIN)).toBe("major");
    expect(classifyRisk(45, stages, 0)).toBe("major");
    expect(classifyRisk(45, stages, null)).toBe("major");
  });

  it("works for the Gessner gauge, whose numbers are completely different", () => {
    const gessner = GAUGES.find((g) => g.id === "GSST2")!.stages; // action 54, flood 57, major 59
    expect(classifyRisk(38.7, gessner)).toBe("safe");
    expect(classifyRisk(54, gessner)).toBe("atRisk");
    expect(classifyRisk(57, gessner)).toBe("flooding");
    expect(classifyRisk(59, gessner)).toBe("major");
  });
});

describe("effectiveRisk", () => {
  it("matches classifyRisk for fresh readings", () => {
    expect(effectiveRisk({ stageFt: 41.5, ageMin: 30 }, stages)).toEqual({
      level: "flooding",
      lastKnown: false,
    });
  });

  it("keeps a dangerous level when the gauge goes silent, marked as last known", () => {
    expect(effectiveRisk({ stageFt: 44, ageMin: 600 }, stages)).toEqual({
      level: "major",
      lastKnown: true,
    });
  });

  it("says unknown when a silent gauge's last reading was safe", () => {
    expect(effectiveRisk({ stageFt: 17, ageMin: 600 }, stages)).toEqual({
      level: "unknown",
      lastKnown: false,
    });
    expect(effectiveRisk({ stageFt: null, ageMin: null }, stages)).toEqual({
      level: "unknown",
      lastKnown: false,
    });
  });
});

describe("overallStatus", () => {
  it("returns the worst level", () => {
    expect(overallStatus(["safe", "safe"])).toBe("safe");
    expect(overallStatus(["safe", "atRisk"])).toBe("atRisk");
    expect(overallStatus(["flooding", "major", "safe"])).toBe("major");
  });

  it("treats a silent gauge as worse than safe but better than a real warning", () => {
    expect(overallStatus(["safe", "unknown"])).toBe("unknown");
    expect(overallStatus(["unknown", "atRisk"])).toBe("atRisk");
  });

  it("is unknown with no gauges at all", () => {
    expect(overallStatus([])).toBe("unknown");
  });
});

describe("percentToFlood", () => {
  it("is 0 at the normal level and 100 at flood stage", () => {
    expect(percentToFlood(16.8, stages)).toBe(0);
    expect(percentToFlood(41, stages)).toBe(100);
  });

  it("is proportional in between", () => {
    const halfway = (16.8 + 41) / 2;
    expect(percentToFlood(halfway, stages)).toBe(50);
  });

  it("stays between 0 and 100", () => {
    expect(percentToFlood(10, stages)).toBe(0);
    expect(percentToFlood(50, stages)).toBe(100);
    expect(percentToFlood(null, stages)).toBe(0);
  });
});

describe("riskZones", () => {
  const fresh = (stageFt: number) => ({ stageFt, ageMin: 15 });

  it("draws nothing when every gauge is safe or unknown", () => {
    const zones = riskZones(GAUGES, { HBMT2: fresh(17), GSST2: { stageFt: null, ageMin: null } });
    expect(zones.features).toHaveLength(0);
  });

  it("only draws zones for the gauge that isn't safe", () => {
    const zones = riskZones(GAUGES, { HBMT2: fresh(41.5), GSST2: fresh(39) });
    expect(zones.features.length).toBeGreaterThan(0);
    for (const f of zones.features) {
      expect(f.properties.gaugeId).toBe("HBMT2");
      expect(f.properties.level).toBe("flooding");
      expect(f.properties.radiusM).toBe(mainSt.zoneRadiusM.flooding);
    }
  });

  it("makes every zone a closed 32-point circle of the right size", () => {
    const zones = riskZones(GAUGES, { HBMT2: fresh(44), GSST2: fresh(39) });
    for (const f of zones.features) {
      const ring = f.geometry.coordinates[0] as LonLat[];
      expect(ring).toHaveLength(33); // 32 corners + the first one repeated to close it
      expect(ring[0]).toEqual(ring[32]);
      const center: LonLat = [
        ring.slice(0, 32).reduce((s, p) => s + p[0], 0) / 32,
        ring.slice(0, 32).reduce((s, p) => s + p[1], 0) / 32,
      ];
      for (const p of ring) {
        expect(distanceM(center, p)).toBeCloseTo(mainSt.zoneRadiusM.major, -1); // within ~5 m
      }
    }
  });

  it("covers the gauge's whole stretch of bayou with no gaps", () => {
    for (const gauge of GAUGES) {
      const readings = Object.fromEntries(GAUGES.map((g) => [g.id, fresh(g.stages.normal)]));
      readings[gauge.id] = fresh(gauge.stages.action); // the smallest zones = hardest to cover
      const zones = riskZones(GAUGES, readings);
      const stretch = clipLineToLongitudes(BRAYS_BAYOU, gauge.reach.west, gauge.reach.east);
      // Check a point every 20 m along the bayou: each one must be inside some circle.
      for (const p of pointsAlongLine(stretch, 20)) {
        const covered = zones.features.some((f) =>
          pointInRing(p, f.geometry.coordinates[0] as LonLat[]),
        );
        expect(covered, `bayou point ${p} near ${gauge.name} is not covered`).toBe(true);
      }
    }
  });

  it("covers Meyerland's stretch of the bayou (Hillcroft to Stella Link)", () => {
    const zones = riskZones(GAUGES, { HBMT2: fresh(41.5), GSST2: fresh(57.5) });
    const meyerland = clipLineToLongitudes(BRAYS_BAYOU, -95.4935, -95.4395);
    for (const p of pointsAlongLine(meyerland, 50)) {
      const covered = zones.features.some((f) =>
        pointInRing(p, f.geometry.coordinates[0] as LonLat[]),
      );
      expect(covered, `Meyerland bayou point ${p} is not covered`).toBe(true);
    }
  });

  it("keeps zones for a silent gauge whose last reading was dangerous", () => {
    const zones = riskZones(GAUGES, { GSST2: { stageFt: 59.1, ageMin: 600 } });
    expect(zones.features.length).toBeGreaterThan(0);
    expect(zones.features.every((f) => f.properties.lastKnown && f.properties.level === "major")).toBe(
      true,
    );
  });

  it("puts the most serious zones last so they draw on top", () => {
    const zones = riskZones(GAUGES, { HBMT2: fresh(44), GSST2: fresh(55) });
    const levels = zones.features.map((f) => f.properties.level);
    expect(levels.indexOf("major")).toBeGreaterThan(levels.lastIndexOf("atRisk"));
  });

  it("uses each gauge's own radius", () => {
    const custom: Gauge = { ...mainSt, zoneRadiusM: { atRisk: 100, flooding: 200, major: 300 } };
    const zones = riskZones([custom], { HBMT2: fresh(42) });
    expect(zones.features.every((f) => f.properties.radiusM === 200)).toBe(true);
  });
});
