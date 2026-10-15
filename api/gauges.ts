// GET /api/gauges?lid=HBMT2
// A small helper in front of NOAA's gauge data. The browser could call NOAA directly
// (NOAA allows it), but NOAA sends 30 days of readings, about 450 KB per gauge, every time.
// On a phone in a storm that is slow. So this function:
//   1. downloads the readings from NOAA,
//   2. keeps only the last 48 hours (a few KB),
//   3. tells Vercel's CDN to reuse the answer for 5 minutes, so NOAA gets one request per
//      5 minutes no matter how many people have the app open.
// The answer has the same shape as NOAA's, so the app reads both the same way.

const NWPS_BASE = "https://api.water.noaa.gov/nwps/v1";
const KEEP_HOURS = 48;

function json(status: number, body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });
}

type Stageflow = { issuedTime?: string; data?: { validTime: string; primary: number }[] };

export async function GET(request: Request): Promise<Response> {
  const lid = new URL(request.url).searchParams.get("lid")?.toUpperCase() ?? "";
  // NWS gauge IDs are 4 letters and a digit, like HBMT2. Anything else is refused.
  if (!/^[A-Z]{4}\d$/.test(lid)) {
    return json(400, { error: "bad_request", message: "Unknown gauge id." });
  }

  let noaa: globalThis.Response;
  try {
    noaa = await fetch(`${NWPS_BASE}/gauges/${lid}/stageflow/observed`, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json(502, { error: "upstream", message: "NOAA didn't answer." });
  }
  if (!noaa.ok) {
    return json(502, { error: "upstream", message: `NOAA answered ${noaa.status}.` });
  }

  const full = (await noaa.json()) as Stageflow;
  const cutoff = Date.now() - KEEP_HOURS * 60 * 60 * 1000;
  const data = (full.data ?? [])
    .filter((p) => Date.parse(p.validTime) >= cutoff)
    .map((p) => ({ validTime: p.validTime, primary: p.primary }));

  return json(
    200,
    { lid, issuedTime: full.issuedTime, data },
    "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  );
}
