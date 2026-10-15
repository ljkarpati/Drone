// Helpers for a gauge's list of readings over time. The live app and the Harvey Replay both
// use these exact functions, so the replay behaves the way the live app would have.

export type Reading = {
  time: number; // when the water was measured, in milliseconds since 1970 (JavaScript time)
  stageFt: number; // water level in feet
};

export type Trend = "rising" | "falling" | "steady" | "unknown";

/** We ignore readings older than this. After two days a gauge is simply "unknown". */
export const MAX_LOOKBACK_MIN = 48 * 60;

/** A change smaller than this over an hour counts as "steady" (sensors wobble a little). */
export const STEADY_BAND_FT = 0.1;

/**
 * The most recent reading at or before time `at`. Readings must be sorted oldest first.
 * Returns null if there is nothing in the last two days.
 */
export function latestAt(series: Reading[], at: number): Reading | null {
  // Binary search: jump to the middle, then keep halving. Fast even for long series.
  let lo = 0;
  let hi = series.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].time <= at) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return null;
  const reading = series[found];
  if (at - reading.time > MAX_LOOKBACK_MIN * 60_000) return null;
  return reading;
}

/**
 * Is the water rising, falling or steady? We compare the latest reading with the one from
 * about an hour before it. If there is no reading 40–80 minutes earlier, we don't guess.
 */
export function trendAt(series: Reading[], at: number): Trend {
  const latest = latestAt(series, at);
  if (!latest) return "unknown";
  const earlier = latestAt(series, latest.time - 60 * 60_000);
  if (!earlier) return "unknown";
  const gapMin = (latest.time - earlier.time) / 60_000;
  if (gapMin < 40 || gapMin > 80) return "unknown";
  const change = latest.stageFt - earlier.stageFt;
  if (change > STEADY_BAND_FT) return "rising";
  if (change < -STEADY_BAND_FT) return "falling";
  return "steady";
}

/** The first time the water reached `stageFt` or higher, or null if it never did. */
export function firstCrossing(series: Reading[], stageFt: number): number | null {
  return series.find((r) => r.stageFt >= stageFt)?.time ?? null;
}
