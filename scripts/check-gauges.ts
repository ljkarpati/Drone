// Checks that the flood stages in src/data/gauges.ts still match NOAA.
// Run with:  npm run check-gauges
// Do this before a demo or competition: if NOAA changes a flood stage, the app should too.

import { GAUGES } from "../src/data/gauges";

type NwpsGauge = {
  name: string;
  latitude: number;
  longitude: number;
  flood: { categories: Record<"action" | "minor" | "moderate" | "major", { stage: number }> };
};

async function main() {
  let problems = 0;
  for (const g of GAUGES) {
    const url = `https://api.water.noaa.gov/nwps/v1/gauges/${g.id}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`${g.id}: NOAA answered ${res.status}`);
      problems++;
      continue;
    }
    const noaa = (await res.json()) as NwpsGauge;
    const c = noaa.flood.categories;
    const pairs: [string, number | undefined, number][] = [
      ["action", g.stages.action, c.action.stage],
      ["flood (minor)", g.stages.flood, c.minor.stage],
      ["moderate", g.stages.moderate, c.moderate.stage],
      ["major", g.stages.major, c.major.stage],
    ];
    const diffs = pairs.filter(([, ours, theirs]) => ours !== theirs);
    if (diffs.length === 0) {
      console.log(`${g.id} (${noaa.name}): OK, all flood stages match.`);
    } else {
      problems += diffs.length;
      for (const [label, ours, theirs] of diffs) {
        console.log(`${g.id}: ${label} is ${ours} ft in gauges.ts but ${theirs} ft at NOAA.`);
      }
    }
  }
  if (problems > 0) {
    console.log("\nUpdate src/data/gauges.ts (and the date in its comments), then run npm test.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
