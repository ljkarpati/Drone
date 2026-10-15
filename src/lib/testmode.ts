// Test mode: pretend a gauge is at a certain level, to check the map and routing on a dry day.
// Never used unless you turn it on (it's on automatically in `npm run dev`, or add ?test=1).

import type { Gauge } from "../data/gauges";
import type { Reading } from "./readings";

export type Override = "live" | "safe" | "atRisk" | "flooding" | "major" | "noData";

export const OVERRIDE_LABELS: Record<Override, string> = {
  live: "Live",
  safe: "Safe",
  atRisk: "At risk",
  flooding: "Flooding",
  major: "Major",
  noData: "No data",
};

/** A pretend water level that lands in the middle of the chosen level. */
export function pretendStage(gauge: Gauge, override: Exclude<Override, "live" | "noData">): number {
  const s = gauge.stages;
  switch (override) {
    case "safe":
      return s.normal;
    case "atRisk":
      return (s.action + s.flood) / 2;
    case "flooding":
      return (s.flood + s.major) / 2;
    case "major":
      return s.major + 1;
  }
}

/** Replaces real readings with pretend ones for any gauge that has an override. */
export function applyOverrides(
  gauges: Gauge[],
  seriesById: Record<string, Reading[]>,
  overrides: Record<string, Override>,
  now: number,
): Record<string, Reading[]> {
  const out = { ...seriesById };
  for (const gauge of gauges) {
    const o = overrides[gauge.id] ?? "live";
    if (o === "live") continue;
    if (o === "noData") {
      out[gauge.id] = [];
      continue;
    }
    const stageFt = pretendStage(gauge, o);
    out[gauge.id] = [
      { time: now - 60 * 60_000, stageFt },
      { time: now, stageFt },
    ];
  }
  return out;
}
