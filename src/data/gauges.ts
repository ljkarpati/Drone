// Every river gauge TurnAround watches, and the numbers that decide when it is dangerous.
//
// The flood stages below were copied from NOAA's National Water Prediction Service (NWPS),
// not from memory. To re-check them, run `npm run check-gauges`, which downloads the same
// URLs and tells you if NOAA has changed anything.
//
// Why only two gauges? On 2026-10-15 we searched NWPS for every gauge between
// 29.60–29.76 N and 95.60–95.35 W. Only these two are on Brays Bayou. Keegans Bayou
// (USGS 08074800, Roark Rd) has a USGS water-level sensor but NO official NWS flood
// stages, and Willow Waterhole Bayou has no real-time gauge in that area at all.
// We only use gauges that have official flood stages, so the app never invents its
// own idea of "flooding". See docs/DECISIONS.md.

export type Gauge = {
  id: string; // NWS location ID (LID), e.g. "HBMT2"
  usgsId?: string; // USGS site number for the same sensor, e.g. "08075000"
  name: string; // "Brays Bayou at S Main St"
  shortName: string; // used in sentences: "near S Main St"
  lat: number;
  lon: number;
  stages: {
    normal: number; // typical dry-weather level. 0% on the "percent to flood" bar.
    action: number; // NWS "action stage": the bayou is high enough that people should get ready
    flood: number; // NWS "minor flood stage": water starts leaving the channel
    moderate?: number;
    major: number; // NWS "major flood stage": homes and many streets flood
  }; // all in feet, measured by the gauge (not depth of water in the street)
  zoneRadiusM: { atRisk: number; flooding: number; major: number }; // how far danger spreads on the map
  reach: { west: number; east: number }; // the stretch of bayou (by longitude) this gauge speaks for
  avoid: string; // streets to warn about when this gauge is not safe
  source: string; // where the numbers came from, with the date checked
};

// How far danger spreads from the bayou's center line, in meters.
// These are our estimates, not official numbers (NOAA does not publish them):
// - atRisk 150 m: the channel itself plus North and South Braeswood Blvd, which run right
//   along both banks and are the first streets to go under.
// - flooding 350 m: water out of the banks reaches the first few blocks of houses.
// - major 600 m: in Harvey (2017) and Tax Day (2016) water spread well into Meyerland.
const RADII = { atRisk: 150, flooding: 350, major: 600 };

export const GAUGES: Gauge[] = [
  {
    // Source: https://api.water.noaa.gov/nwps/v1/gauges/GSST2  (pulled 2026-10-15)
    //   flood.categories: action 54, minor 57, moderate 58, major 59 (feet)
    //   NWS impact statement at 59 ft: "Many streets are flooded and impassable including
    //   Fondren Drive near the channel and North and South Braeswood Blvd."
    // Normal level: median of the 30 days of readings from
    //   https://api.water.noaa.gov/nwps/v1/gauges/GSST2/stageflow/observed  (2026-09-15 to 2026-10-15) = 38.72 ft
    id: "GSST2",
    usgsId: "08074810",
    name: "Brays Bayou at Gessner Dr",
    shortName: "Gessner Dr",
    lat: 29.6725,
    lon: -95.528056,
    stages: { normal: 38.7, action: 54, flood: 57, moderate: 58, major: 59 },
    zoneRadiusM: RADII,
    // Upstream gauge. It speaks for the bayou from just west of Gessner down to Chimney Rock,
    // which covers Braeburn and the west side of Meyerland. Chimney Rock is closer to this
    // gauge than to the S Main St gauge, so we split the bayou between Chimney Rock and S Rice.
    reach: { west: -95.545, east: -95.472 },
    avoid: "Fondren Rd and N & S Braeswood Blvd",
    source: "NWPS https://api.water.noaa.gov/nwps/v1/gauges/GSST2, checked 2026-10-15",
  },
  {
    // Source: https://api.water.noaa.gov/nwps/v1/gauges/HBMT2  (pulled 2026-10-15)
    //   flood.categories: action 38, minor 41, moderate 42, major 43 (feet)
    //   NWPS calls this gauge "Brays Bayou at Houston". It sits at the Main Street bridge.
    // Normal level: median of the 30 days of readings from
    //   https://api.water.noaa.gov/nwps/v1/gauges/HBMT2/stageflow/observed  (2026-09-15 to 2026-10-15) = 16.83 ft
    id: "HBMT2",
    usgsId: "08075000",
    name: "Brays Bayou at S Main St",
    shortName: "S Main St",
    lat: 29.696944,
    lon: -95.411944,
    stages: { normal: 16.8, action: 38, flood: 41, moderate: 42, major: 43 },
    zoneRadiusM: RADII,
    // Downstream gauge. It speaks for the bayou from S Rice Ave through the I-610 and
    // Stella Link crossings to Main St: the east side of Meyerland and Braeswood Place.
    reach: { west: -95.472, east: -95.405 },
    avoid: "N & S Braeswood Blvd and the Stella Link and Kirby bridges",
    source: "NWPS https://api.water.noaa.gov/nwps/v1/gauges/HBMT2, checked 2026-10-15",
  },
];

export function gaugeById(id: string): Gauge | undefined {
  return GAUGES.find((g) => g.id === id);
}
