// Gets live water levels from NOAA's National Water Prediction Service (NWPS).
//
// First we ask our own server (/api/gauges), which trims NOAA's 30 days of data down to
// the last 2 days and caches it for 5 minutes. That turns ~450 KB per gauge into a few KB,
// which matters on a phone in a storm. If our server can't be reached, we ask NOAA directly
// (NOAA allows that from a browser). Both return the same shape, so one parser handles both.

import type { Reading } from "./readings";

export const NWPS_BASE = "https://api.water.noaa.gov/nwps/v1";

type StageflowResponse = {
  data?: { validTime: string; primary: number }[];
};

/** Turns NOAA's JSON into a clean, sorted list of readings, dropping "no data" values. */
export function parseStageflow(json: StageflowResponse): Reading[] {
  return (json.data ?? [])
    .map((p) => ({ time: Date.parse(p.validTime), stageFt: p.primary }))
    .filter((r) => Number.isFinite(r.time) && Number.isFinite(r.stageFt) && r.stageFt > -900)
    .sort((a, b) => a.time - b.time);
}

async function getJson(url: string, timeoutMs: number): Promise<StageflowResponse> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return (await res.json()) as StageflowResponse;
}

/** The recent readings for one gauge, e.g. fetchGaugeSeries("HBMT2"). */
export async function fetchGaugeSeries(lid: string): Promise<Reading[]> {
  try {
    return parseStageflow(await getJson(`/api/gauges?lid=${encodeURIComponent(lid)}`, 10_000));
  } catch {
    const direct = `${NWPS_BASE}/gauges/${encodeURIComponent(lid)}/stageflow/observed`;
    return parseStageflow(await getJson(direct, 20_000));
  }
}
