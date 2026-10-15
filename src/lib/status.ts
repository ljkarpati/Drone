// Puts the pieces together: for each gauge, at a moment in time, what is its reading,
// its risk level and its trend? Then: what one sentence should the banner say?

import type { Gauge } from "../data/gauges";
import { latestAt, trendAt, type Reading, type Trend } from "./readings";
import {
  effectiveRisk,
  overallStatus,
  percentToFlood,
  STALE_AFTER_MIN,
  type GaugeReading,
  type RiskLevel,
} from "./risk";

export type GaugeStatus = {
  gauge: Gauge;
  reading: Reading | null;
  ageMin: number | null;
  level: RiskLevel;
  lastKnown: boolean; // holding on to an old dangerous reading
  trend: Trend;
  percent: number; // 0–100 toward flood stage
};

/** Builds the status of every gauge at time `at` from their reading histories. */
export function gaugeStatusesAt(
  gauges: Gauge[],
  seriesById: Record<string, Reading[] | undefined>,
  at: number,
): GaugeStatus[] {
  return gauges.map((gauge) => {
    const series = seriesById[gauge.id] ?? [];
    const reading = latestAt(series, at);
    const ageMin = reading ? Math.max(0, Math.round((at - reading.time) / 60_000)) : null;
    const { level, lastKnown } = effectiveRisk(
      { stageFt: reading?.stageFt ?? null, ageMin },
      gauge.stages,
    );
    return {
      gauge,
      reading,
      ageMin,
      level,
      lastKnown,
      // An old reading's trend says nothing about now, so we don't show one.
      trend: ageMin !== null && ageMin > STALE_AFTER_MIN ? "unknown" : trendAt(series, at),
      percent: percentToFlood(reading?.stageFt ?? null, gauge.stages),
    };
  });
}

/** The shape riskZones wants: gauge id -> latest reading and its age. */
export function readingsById(statuses: GaugeStatus[]): Record<string, GaugeReading> {
  return Object.fromEntries(
    statuses.map((s) => [s.gauge.id, { stageFt: s.reading?.stageFt ?? null, ageMin: s.ageMin }]),
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** One plain-English sentence for the top banner. */
export function bannerSentence(statuses: GaugeStatus[]): string {
  const overall = overallStatus(statuses.map((s) => s.level));
  const worst = statuses.filter((s) => s.level === overall);
  const where = joinNames(worst.map((s) => s.gauge.shortName));
  const avoid = worst[0]?.gauge.avoid ?? "low streets";
  // If a gauge went quiet and we're using its last dangerous reading, say so.
  const quiet = worst.filter((s) => s.lastKnown).map((s) => s.gauge.shortName);
  const quietNote =
    quiet.length === 0
      ? ""
      : ` The ${joinNames(quiet)} ${quiet.length === 1 ? "gauge has" : "gauges have"} stopped reporting, so this uses the last reading.`;

  switch (overall) {
    case "safe":
      return "All clear. Brays Bayou is at normal levels.";
    case "atRisk":
      return `Brays Bayou is rising near ${where}. Avoid low streets like ${avoid}.${quietNote}`;
    case "flooding":
      return `Brays Bayou is flooding near ${where}. Avoid ${avoid}.${quietNote}`;
    case "major":
      return `Major flooding on Brays Bayou near ${where}. Do not drive on ${avoid}. Leave now if officials tell you to.${quietNote}`;
    case "unknown": {
      const fine = statuses.filter((s) => s.level === "safe");
      if (fine.length > 0) {
        const verb = fine.length === 1 ? "is" : "are";
        const silent = worst.length === 1 ? "gauge isn't" : "gauges aren't";
        return `The ${where} ${silent} reporting right now. ${joinNames(fine.map((s) => s.gauge.shortName))} ${verb} at normal levels.`;
      }
      return "No recent gauge readings. Check the National Weather Service before you drive.";
    }
  }
}

/**
 * A short text that changes only when a gauge's level changes. Pages use it to avoid
 * redrawing the zones (and throwing away a planned route) every minute for no reason.
 */
export function levelsKey(statuses: GaugeStatus[]): string {
  return statuses.map((s) => `${s.gauge.id}:${s.level}:${s.lastKnown}`).join("|");
}
