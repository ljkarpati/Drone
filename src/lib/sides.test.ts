import { describe, expect, it } from "vitest";
import { braysCrossings, braysSide, crossesWillowWaterhole } from "./sides";
import { destinationsFor, PRESET_DESTINATIONS } from "./routing";
import type { LonLat } from "./geo";

describe("braysSide", () => {
  it("knows which side of Brays Bayou places are on", () => {
    expect(braysSide([-95.5017, 29.6631])).toBe("south"); // Bankside Dr
    expect(braysSide([-95.47294, 29.67298])).toBe("south"); // Rutherglenn Dr
    expect(braysSide([-95.456, 29.688])).toBe("north"); // Meyerland Plaza
    expect(braysSide([-95.4614, 29.6817])).toBe("north"); // N Braeswood at S Rice
    expect(braysSide([-95.4595, 29.6795])).toBe("south"); // S Braeswood at S Rice
  });

  it("files every preset under the right side", () => {
    for (const d of PRESET_DESTINATIONS) expect(braysSide([d.lon, d.lat]), d.id).toBe(d.side);
  });
});

describe("destinationsFor", () => {
  it("recommends south-side destinations to someone south of the bayou, highest ground first", () => {
    const { side, recommended, across } = destinationsFor({ lon: -95.5017, lat: 29.6631 });
    expect(side).toBe("south");
    expect(recommended.map((d) => d.id)).toEqual(["southwest", "south"]);
    expect(across.every((d) => d.side === "north")).toBe(true);
  });

  it("recommends north-side destinations to someone north of the bayou", () => {
    const { recommended } = destinationsFor({ lon: -95.456, lat: 29.688 });
    expect(recommended.map((d) => d.id)).toEqual(["west", "north"]);
  });

  it("lists everything when there's no start yet", () => {
    expect(destinationsFor(null).recommended).toHaveLength(PRESET_DESTINATIONS.length);
  });
});

describe("crossings", () => {
  // A straight drive north up Fondren Rd across Brays Bayou.
  const upFondren: LonLat[] = [
    [-95.5088, 29.665],
    [-95.5088, 29.69],
  ];
  it("names the bridge where a route crosses Brays Bayou", () => {
    expect(braysCrossings(upFondren)).toEqual(["Fondren Rd"]);
  });
  it("finds no crossing for a route that stays on one side", () => {
    expect(braysCrossings([[-95.51, 29.66], [-95.53, 29.655]])).toEqual([]);
  });
  it("notices a route crossing Willow Waterhole Bayou", () => {
    expect(crossesWillowWaterhole([[-95.4934, 29.665], [-95.4934, 29.6445]])).toBe(true);
    expect(crossesWillowWaterhole(upFondren)).toBe(false);
  });
});
