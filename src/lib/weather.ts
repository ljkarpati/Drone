// Rain outlook from the National Weather Service (api.weather.gov).
//
// Step 1: ask /points/{lat},{lon} which forecast grid square covers Meyerland.
// Step 2: download that square's raw forecast data ("forecastGridData").
// Step 3: add up the expected rain (quantitativePrecipitation) for the next 24 hours and
//         the next 3 days, and find the highest chance of rain (probabilityOfPrecipitation).

export const MEYERLAND = { lat: 29.688, lon: -95.456 };

type GridValue = { validTime: string; value: number | null };
type GridData = {
  properties: {
    updateTime?: string;
    quantitativePrecipitation?: { uom: string; values: GridValue[] };
    probabilityOfPrecipitation?: { values: GridValue[] };
  };
};

export type RainOutlook = {
  next24hInches: number;
  next3dInches: number;
  chance24hPct: number; // highest chance of rain in any hour of the next 24 hours
  chance3dPct: number;
  updated: string | null; // when NWS last updated the forecast
};

/**
 * NWS writes each forecast value with the time window it covers, like
 * "2026-10-15T06:00:00+00:00/PT6H" (6 hours starting at 6:00 UTC) or ".../P1DT6H".
 * Returns [start, end] in milliseconds.
 */
export function parseValidTime(validTime: string): [number, number] {
  const [startText, durationText] = validTime.split("/");
  const start = Date.parse(startText);
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(durationText ?? "");
  if (!m) return [start, start];
  const [, days = "0", hours = "0", minutes = "0"] = m;
  const ms = ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60_000;
  return [start, start + ms];
}

/**
 * Total rain expected between `from` and `to`. If a forecast window only partly overlaps,
 * we count that part only (half the window = half the rain).
 */
export function rainBetween(values: GridValue[], from: number, to: number): number {
  let total = 0;
  for (const v of values) {
    if (v.value == null) continue;
    const [start, end] = parseValidTime(v.validTime);
    const overlap = Math.min(end, to) - Math.max(start, from);
    if (overlap > 0 && end > start) total += v.value * (overlap / (end - start));
  }
  return total;
}

/** The highest chance of rain in any window that overlaps `from`–`to`. */
export function maxChanceBetween(values: GridValue[], from: number, to: number): number {
  let max = 0;
  for (const v of values) {
    if (v.value == null) continue;
    const [start, end] = parseValidTime(v.validTime);
    if (end > from && start < to) max = Math.max(max, v.value);
  }
  return max;
}

const MM_PER_INCH = 25.4;

/** Turns NWS grid data into the two numbers we show. */
export function summarizeRain(grid: GridData, now: number): RainOutlook {
  const qpf = grid.properties.quantitativePrecipitation;
  const pop = grid.properties.probabilityOfPrecipitation?.values ?? [];
  // NWS reports rain in millimeters ("wmoUnit:mm"); we show inches.
  const toInches = qpf?.uom?.endsWith("mm") === false ? 1 : 1 / MM_PER_INCH;
  const day = 24 * 60 * 60_000;
  return {
    next24hInches: rainBetween(qpf?.values ?? [], now, now + day) * toInches,
    next3dInches: rainBetween(qpf?.values ?? [], now, now + 3 * day) * toInches,
    chance24hPct: maxChanceBetween(pop, now, now + day),
    chance3dPct: maxChanceBetween(pop, now, now + 3 * day),
    updated: grid.properties.updateTime ?? null,
  };
}

export async function fetchRainOutlook(now = Date.now()): Promise<RainOutlook> {
  const points = await fetch(`https://api.weather.gov/points/${MEYERLAND.lat},${MEYERLAND.lon}`, {
    headers: { Accept: "application/geo+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!points.ok) throw new Error(`NWS points answered ${points.status}`);
  const gridUrl = (await points.json()).properties.forecastGridData as string;

  const grid = await fetch(gridUrl, {
    headers: { Accept: "application/geo+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!grid.ok) throw new Error(`NWS grid answered ${grid.status}`);
  return summarizeRain((await grid.json()) as GridData, now);
}
