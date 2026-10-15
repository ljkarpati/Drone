// Hurricane Harvey (August 2017), replayed through the same logic the live app uses.

import harveyJson from "../data/harvey-2017.json";
import type { Gauge } from "../data/gauges";
import { firstCrossing, type Reading } from "./readings";
import type { DangerLevel } from "./risk";

type HarveyFile = { gauges: Record<string, [string, number][]> };

/** Harvey readings for each gauge, as the same Reading lists the live app uses. */
export const HARVEY_SERIES: Record<string, Reading[]> = Object.fromEntries(
  Object.entries((harveyJson as unknown as HarveyFile).gauges).map(([id, points]) => [
    id,
    points.map(([time, stageFt]) => ({ time: Date.parse(time), stageFt })),
  ]),
);

// The replay runs from midnight Aug 25 to 11:45 PM Sep 2, 2017, Houston time (UTC-5).
export const HARVEY_START = Date.parse("2017-08-25T05:00:00Z");
export const HARVEY_END = Date.parse("2017-09-03T04:45:00Z");
export const STEP_MS = 15 * 60_000; // gauges report every 15 minutes

export type Milestone = {
  gaugeId: string;
  level: DangerLevel;
  time: number;
};

const STAGE_FOR: Record<DangerLevel, (g: Gauge) => number> = {
  atRisk: (g) => g.stages.action,
  flooding: (g) => g.stages.flood,
  major: (g) => g.stages.major,
};

/** The first moment each gauge reached action, flood and major stage, in time order. */
export function milestones(gauges: Gauge[], seriesById: Record<string, Reading[]>): Milestone[] {
  const out: Milestone[] = [];
  for (const g of gauges) {
    for (const level of ["atRisk", "flooding", "major"] as DangerLevel[]) {
      const time = firstCrossing(seriesById[g.id] ?? [], STAGE_FOR[level](g));
      if (time !== null) out.push({ gaugeId: g.id, level, time });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

export type WarningTime = {
  gaugeId: string;
  firstAlert: number; // when ANY gauge first turned "at risk": the app's first warning
  ownAlert: number | null; // when this gauge itself reached action stage
  flood: number | null; // when this gauge reached flood stage
  ownLeadMin: number | null; // this gauge's own action -> flood warning, in minutes
  appLeadMin: number | null; // the app's first warning -> this gauge's flood stage, in minutes
};

/**
 * How much warning would TurnAround have given before each gauge hit flood stage?
 * Two answers, because both matter:
 *  - ownLeadMin: from this gauge reaching "action" to this gauge flooding.
 *  - appLeadMin: from the FIRST alert anywhere on the bayou to this gauge flooding.
 *    The upstream gauge (Gessner) warns people downstream (S Main St) earlier.
 */
export function warningTimes(gauges: Gauge[], seriesById: Record<string, Reading[]>): WarningTime[] {
  const ms = milestones(gauges, seriesById);
  const firstAlert = ms.find((m) => m.level === "atRisk")?.time;
  if (firstAlert === undefined) return [];
  return gauges.map((g) => {
    const ownAlert = ms.find((m) => m.gaugeId === g.id && m.level === "atRisk")?.time ?? null;
    const flood = ms.find((m) => m.gaugeId === g.id && m.level === "flooding")?.time ?? null;
    return {
      gaugeId: g.id,
      firstAlert,
      ownAlert,
      flood,
      ownLeadMin: ownAlert !== null && flood !== null ? (flood - ownAlert) / 60_000 : null,
      appLeadMin: flood !== null ? (flood - firstAlert) / 60_000 : null,
    };
  });
}
