// Tests for /api/geocode with fake Census and OpenRouteService answers.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dedupe, GET, tidyCensusLabel } from "../api/geocode";

const CENSUS = {
  result: {
    addressMatches: [
      { matchedAddress: "6300 BANKSIDE DR, HOUSTON, TX, 77096", coordinates: { x: -95.5017, y: 29.6631 } },
    ],
  },
};
// What ORS really returned for a house number it didn't know: the street, four times.
const street = (lon: number) => ({
  geometry: { coordinates: [lon, 29.663] },
  properties: { label: "Bankside Drive, Houston, TX, USA", layer: "street" },
});
const ORS = { features: [street(-95.501), street(-95.503), street(-95.505), street(-95.507)] };

function fakeServices(census: unknown, ors: unknown) {
  const spy = vi.fn(async (url: URL | string) => {
    const body = String(url).includes("census.gov") ? census : ors;
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const search = async (q: string) =>
  (await GET(new Request(`http://localhost/api/geocode?q=${encodeURIComponent(q)}`))).json();

describe("GET /api/geocode", () => {
  beforeEach(() => {
    process.env.ORS_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ORS_API_KEY;
  });

  it("puts the exact house first and shows the street only once", async () => {
    fakeServices(CENSUS, ORS);
    const { results } = await search("6300 Bankside Dr");
    expect(results[0].label).toBe("6300 Bankside Dr, Houston, TX 77096");
    expect(results[0].note).toBeUndefined();
    const streets = results.filter((r: { label: string }) => r.label.startsWith("Bankside Drive"));
    expect(streets).toHaveLength(1);
    expect(streets[0].note).toMatch(/Street only/);
  });

  it("adds Houston, TX when you only type the street", async () => {
    const spy = fakeServices(CENSUS, ORS);
    await search("6300 Bankside Dr");
    const censusUrl = new URL(String(spy.mock.calls.find((c) => String(c[0]).includes("census"))![0]));
    expect(censusUrl.searchParams.get("address")).toBe("6300 Bankside Dr, Houston, TX");
  });

  it("skips the Census for place names", async () => {
    const spy = fakeServices(CENSUS, { features: [] });
    await search("Meyerland Plaza");
    expect(spy.mock.calls.some((c) => String(c[0]).includes("census"))).toBe(false);
  });

  it("still finds exact addresses with no ORS key", async () => {
    delete process.env.ORS_API_KEY;
    fakeServices(CENSUS, ORS);
    const { results } = await search("6300 Bankside Dr");
    expect(results[0].label).toBe("6300 Bankside Dr, Houston, TX 77096");
  });
});

describe("helpers", () => {
  it("tidies Census labels", () => {
    expect(tidyCensusLabel("4800 N BRAESWOOD BLVD, HOUSTON, TX, 77096")).toBe(
      "4800 N Braeswood Blvd, Houston, TX 77096",
    );
  });

  it("drops repeats by name or by location", () => {
    const a = { label: "A", lon: -95.5, lat: 29.66 };
    expect(dedupe([a, { ...a }, { label: "B", lon: -95.50001, lat: 29.66001 }])).toHaveLength(1);
  });
});
