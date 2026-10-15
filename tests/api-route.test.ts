// Tests for /api/route with a fake OpenRouteService, so they run without a key or internet.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../api/route";

const START = [-95.47, 29.672];
const END = [-95.44022, 29.70598];
const SQUARE = [
  [
    [-95.46, 29.68],
    [-95.45, 29.68],
    [-95.45, 29.69],
    [-95.46, 29.69],
    [-95.46, 29.68],
  ],
];

function call(body: unknown) {
  return POST(
    new Request("http://localhost/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function fakeOrs(status: number, json: unknown) {
  const spy = vi.fn(async () => new Response(JSON.stringify(json), { status }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ORS_OK = {
  features: [
    {
      geometry: { coordinates: [START, [-95.46, 29.7], END] },
      properties: {
        summary: { distance: 5200, duration: 540 },
        segments: [
          {
            steps: [
              { name: "Chimney Rock Road", distance: 1500 },
              { name: "-", distance: 50 },
              { name: "Bellaire Boulevard", distance: 2500 },
              { name: "Chimney Rock Road", distance: 300 },
            ],
          },
        ],
      },
    },
  ],
};

describe("POST /api/route", () => {
  beforeEach(() => {
    process.env.ORS_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ORS_API_KEY;
  });

  it("sends the danger zones to ORS as avoid_polygons (a GeoJSON MultiPolygon)", async () => {
    const spy = fakeOrs(200, ORS_OK);
    const res = await call({ start: START, end: END, avoid: [SQUARE] });
    expect(res.status).toBe(200);

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openrouteservice.org/v2/directions/driving-car/geojson");
    expect((init.headers as Record<string, string>).Authorization).toBe("test-key");
    const sent = JSON.parse(init.body as string);
    expect(sent.coordinates).toEqual([START, END]);
    expect(sent.options.avoid_polygons).toEqual({ type: "MultiPolygon", coordinates: [SQUARE] });
  });

  it("returns the route line, distance, time and main roads", async () => {
    fakeOrs(200, ORS_OK);
    const body = await (await call({ start: START, end: END, avoid: [] })).json();
    expect(body.coordinates).toHaveLength(3);
    expect(body.distanceM).toBe(5200);
    expect(body.durationS).toBe(540);
    expect(body.roads).toEqual(["Bellaire Boulevard", "Chimney Rock Road"]);
  });

  it("leaves out avoid_polygons when there are no zones", async () => {
    const spy = fakeOrs(200, ORS_OK);
    await call({ start: START, end: END, avoid: [] });
    const sent = JSON.parse((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.options).toBeUndefined();
  });

  it("answers no_route when ORS can't find a way around the zones", async () => {
    fakeOrs(404, { error: { code: 2009, message: "Route could not be found" } });
    const res = await call({ start: START, end: END, avoid: [SQUARE] });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("no_route");
  });

  it("refuses trips outside Houston, so the key can't be used for anything else", async () => {
    const spy = fakeOrs(200, ORS_OK);
    const res = await call({ start: [-74.0, 40.7], end: END, avoid: [] });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses malformed zones", async () => {
    const spy = fakeOrs(200, ORS_OK);
    const res = await call({ start: START, end: END, avoid: [[[[-95.46, 29.68]]]] });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("explains clearly when the key is missing", async () => {
    delete process.env.ORS_API_KEY;
    const res = await call({ start: START, end: END, avoid: [] });
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/ORS_API_KEY/);
  });
});
