// How TurnAround decides whether the water is dangerous, and where.
//
// The big idea: NOAA publishes official "flood stages" for each gauge. A flood stage is
// a water height (in feet, as measured at the gauge) where the National Weather Service
// says something specific starts to happen. We compare the latest reading to those
// numbers. We never make up our own idea of "flooding".

import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { Gauge } from "../data/gauges";
import { BRAYS_BAYOU } from "../data/brays-bayou";
import { circlePolygon, clipLineToLongitudes, pointsAlongLine, type LonLat } from "./geo";

export type RiskLevel = "safe" | "atRisk" | "flooding" | "major" | "unknown";

/**
 * A reading older than this many minutes is "stale": we stop trusting it as current.
 * Gauges report every 15 minutes, but the numbers usually reach NOAA's website
 * 30–75 minutes later. Three hours means at least two reports in a row went missing.
 */
export const STALE_AFTER_MIN = 180;

/**
 * Turns one water-level reading into a risk level.
 *
 *   below action stage          -> "safe"
 *   action stage or higher      -> "atRisk"    (NWS: time to get ready)
 *   flood stage or higher       -> "flooding"  (NWS: water leaves the channel)
 *   major flood stage or higher -> "major"     (NWS: homes and many streets flood)
 *   no reading, or a stale one  -> "unknown"
 *
 * "Or higher" matters: a reading of exactly 41.0 ft at S Main St (flood stage 41 ft)
 * counts as flooding, the same way NWS counts it.
 *
 * @param stageFt        latest water level in feet, or null if we have none
 * @param stages         the gauge's official flood stages
 * @param readingAgeMin  how many minutes old the reading is (leave out if unknown)
 */
export function classifyRisk(
  stageFt: number | null,
  stages: Gauge["stages"],
  readingAgeMin?: number | null,
): RiskLevel {
  // NOAA uses -999 to mean "no data", so anything that low is not a real reading.
  if (stageFt === null || !Number.isFinite(stageFt) || stageFt <= -900) return "unknown";
  if (readingAgeMin != null && readingAgeMin > STALE_AFTER_MIN) return "unknown";
  if (stageFt >= stages.major) return "major";
  if (stageFt >= stages.flood) return "flooding";
  if (stageFt >= stages.action) return "atRisk";
  return "safe";
}

/** One gauge's latest reading, as the rest of the app passes it around. */
export type GaugeReading = {
  stageFt: number | null;
  ageMin: number | null; // minutes since the reading was measured
};

export type EffectiveRisk = {
  level: RiskLevel;
  lastKnown: boolean; // true when we are holding on to an old reading (see below)
};

/**
 * The level the app actually acts on.
 *
 * Usually this is just classifyRisk. The exception: gauges often stop reporting in the
 * middle of a flood (in Harvey, the Gessner gauge went silent for 24 hours right at the
 * peak). If a gauge goes quiet while its last reading was dangerous, we keep treating it
 * as dangerous and label it "last known". A silent gauge should never make a flooded
 * street look safe. If its last reading was safe, we honestly say "unknown".
 */
export function effectiveRisk(reading: GaugeReading, stages: Gauge["stages"]): EffectiveRisk {
  const level = classifyRisk(reading.stageFt, stages, reading.ageMin);
  if (level !== "unknown" || reading.stageFt === null) return { level, lastKnown: false };
  const lastSeen = classifyRisk(reading.stageFt, stages); // same reading, ignoring its age
  if (lastSeen === "safe" || lastSeen === "unknown") return { level: "unknown", lastKnown: false };
  return { level: lastSeen, lastKnown: true };
}

/**
 * How serious each level is, from least to most. "unknown" ranks above "safe": if one
 * gauge is silent we can't promise everything is fine, but a real warning outranks it.
 */
export const SEVERITY: Record<RiskLevel, number> = {
  safe: 0,
  unknown: 1,
  atRisk: 2,
  flooding: 3,
  major: 4,
};

/** The worst level across all gauges. This drives the banner at the top of the screen. */
export function overallStatus(levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) return "unknown";
  return levels.reduce((worst, level) => (SEVERITY[level] > SEVERITY[worst] ? level : worst));
}

/**
 * How full the bayou is, from 0 (normal dry-weather level) to 100 (flood stage),
 * for the bar on each gauge card. Above flood stage the bar just stays full.
 */
export function percentToFlood(stageFt: number | null, stages: Gauge["stages"]): number {
  if (stageFt === null || !Number.isFinite(stageFt)) return 0;
  const percent = ((stageFt - stages.normal) / (stages.flood - stages.normal)) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
}

export type DangerLevel = "atRisk" | "flooding" | "major";

export type ZoneProperties = {
  gaugeId: string;
  level: DangerLevel;
  lastKnown: boolean;
  radiusM: number;
  center: LonLat; // the point on the bayou this circle is stamped around
};

export type RiskZones = FeatureCollection<Polygon, ZoneProperties>;

/**
 * The areas the route must avoid, as GeoJSON polygons.
 *
 * A gauge is one point, but it tells us about a whole stretch of bayou (its `reach`).
 * Neither of our gauges is inside Meyerland itself: from the middle of the neighborhood, one is
 * about 5 km upstream at Gessner and one is about 6 km downstream at S Main St. A single circle around each gauge would miss
 * Meyerland completely. So for each gauge that isn't safe, we walk along its stretch of
 * the bayou and stamp a circle every `radius` meters. Overlapping circles make one
 * continuous danger strip that follows the water.
 *
 * Bigger danger means bigger circles (zoneRadiusM). Each circle is a 32-point polygon.
 */
export function riskZones(
  gauges: Gauge[],
  readings: Record<string, GaugeReading | undefined>,
  bayou: LonLat[] = BRAYS_BAYOU,
): RiskZones {
  const features: Feature<Polygon, ZoneProperties>[] = [];

  for (const gauge of gauges) {
    const reading = readings[gauge.id] ?? { stageFt: null, ageMin: null };
    const { level, lastKnown } = effectiveRisk(reading, gauge.stages);
    if (level === "safe" || level === "unknown") continue;

    const radiusM = gauge.zoneRadiusM[level];
    const stretch = clipLineToLongitudes(bayou, gauge.reach.west, gauge.reach.east);
    // Stamping every `radius` meters makes neighbors overlap a lot, so there are no gaps
    // a car could slip through along the bank.
    for (const center of pointsAlongLine(stretch, radiusM)) {
      features.push({
        type: "Feature",
        properties: { gaugeId: gauge.id, level, lastKnown, radiusM, center },
        geometry: { type: "Polygon", coordinates: [circlePolygon(center, radiusM, 32)] },
      });
    }
  }

  // Draw the most serious zones last so they sit on top on the map.
  features.sort((a, b) => SEVERITY[a.properties.level] - SEVERITY[b.properties.level]);
  return { type: "FeatureCollection", features };
}
