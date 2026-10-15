// Downloads the real Hurricane Harvey water levels for our gauges from USGS and saves them to
// src/data/harvey-2017.json, so the Harvey Replay never needs the internet during a demo.
//
// Run with:  npm run fetch-harvey
// You only need to run this once. The saved file is committed to the project.
//
// Parameter 00065 is "gage height" in feet: the same number NWS flood stages are measured in.

import { writeFileSync } from "node:fs";
import { GAUGES } from "../src/data/gauges";

const START = "2017-08-25";
const END = "2017-09-02";
const sites = GAUGES.filter((g) => g.usgsId).map((g) => g.usgsId).join(",");
const url =
  `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${sites}` +
  `&parameterCd=00065&startDT=${START}&endDT=${END}`;

type UsgsResponse = {
  value: {
    timeSeries: {
      sourceInfo: { siteCode: { value: string }[] };
      variable: { noDataValue: number };
      values: { value: { value: string; dateTime: string; qualifiers: string[] }[] }[];
    }[];
  };
};

async function main() {
  console.log("Downloading", url);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`USGS answered ${res.status}`);
  const data = (await res.json()) as UsgsResponse;

  const series: Record<string, [string, number][]> = {};
  for (const ts of data.value.timeSeries) {
    const usgsId = ts.sourceInfo.siteCode[0].value;
    const gauge = GAUGES.find((g) => g.usgsId === usgsId);
    if (!gauge) continue;
    const noData = ts.variable.noDataValue;
    series[gauge.id] = ts.values[0].value
      .map((v): [string, number] => [new Date(v.dateTime).toISOString(), Number(v.value)])
      .filter(([, ft]) => Number.isFinite(ft) && ft !== noData);
    console.log(`${gauge.id}: ${series[gauge.id].length} readings`);
  }

  const out = {
    about:
      "Hurricane Harvey water levels (gage height, feet) from USGS Water Services. " +
      "Times are UTC. Houston was UTC-5 (CDT) during Harvey.",
    source: url,
    downloaded: new Date().toISOString().slice(0, 10),
    gauges: series,
  };
  writeFileSync("src/data/harvey-2017.json", JSON.stringify(out) + "\n");
  console.log("Saved src/data/harvey-2017.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
