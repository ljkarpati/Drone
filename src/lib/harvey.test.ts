import { describe, expect, it } from "vitest";
import { GAUGES } from "../data/gauges";
import { HARVEY_END, HARVEY_SERIES, HARVEY_START, milestones, warningTimes } from "./harvey";
import { gaugeStatusesAt } from "./status";

// Houston time during Harvey was UTC-5, so 9:00 PM on Aug 26 is 02:00 UTC on Aug 27.
const cdt = (iso: string) => Date.parse(`${iso}-05:00`);

describe("Harvey replay data", () => {
  it("has readings for both gauges across the whole replay window", () => {
    for (const g of GAUGES) {
      const series = HARVEY_SERIES[g.id];
      expect(series.length).toBeGreaterThan(700);
      expect(series[0].time).toBeLessThanOrEqual(HARVEY_START);
      expect(series[series.length - 1].time).toBeGreaterThanOrEqual(HARVEY_END);
    }
  });

  it("matches the official Harvey crests NOAA lists (45.67 ft at S Main, 60.0 ft at Gessner)", () => {
    const peak = (id: string) => Math.max(...HARVEY_SERIES[id].map((r) => r.stageFt));
    expect(peak("HBMT2")).toBeCloseTo(45.67, 2);
    expect(peak("GSST2")).toBeCloseTo(60.0, 2);
  });
});

describe("milestones", () => {
  it("finds when each gauge crossed action, flood and major stage", () => {
    const ms = milestones(GAUGES, HARVEY_SERIES);
    const at = (id: string, level: string) => ms.find((m) => m.gaugeId === id && m.level === level)?.time;
    expect(at("GSST2", "atRisk")).toBe(cdt("2017-08-26T21:00:00"));
    expect(at("GSST2", "flooding")).toBe(cdt("2017-08-26T21:30:00"));
    expect(at("GSST2", "major")).toBe(cdt("2017-08-26T23:30:00"));
    expect(at("HBMT2", "atRisk")).toBe(cdt("2017-08-26T22:00:00"));
    expect(at("HBMT2", "flooding")).toBe(cdt("2017-08-27T00:30:00"));
    expect(at("HBMT2", "major")).toBe(cdt("2017-08-27T04:45:00"));
  });
});

describe("warningTimes", () => {
  it("reports each gauge's own warning and the app's earliest warning", () => {
    const w = Object.fromEntries(warningTimes(GAUGES, HARVEY_SERIES).map((x) => [x.gaugeId, x]));
    // Gessner: action at 9:00 PM, flood at 9:30 PM. Only 30 minutes.
    expect(w.GSST2.ownLeadMin).toBe(30);
    expect(w.GSST2.appLeadMin).toBe(30);
    // S Main St: its own action-to-flood was 2.5 hours, but Gessner (upstream) raised the
    // first alert an hour earlier, so the app warned S Main St drivers 3.5 hours ahead.
    expect(w.HBMT2.ownLeadMin).toBe(150);
    expect(w.HBMT2.appLeadMin).toBe(210);
  });
});

describe("replaying through the live logic", () => {
  it("keeps Gessner dangerous while its gauge was silent at the peak", () => {
    // The Gessner gauge sent nothing between 11:30 PM Aug 26 and midnight Aug 28.
    const statuses = gaugeStatusesAt(GAUGES, HARVEY_SERIES, cdt("2017-08-27T12:00:00"));
    const gessner = statuses.find((s) => s.gauge.id === "GSST2")!;
    expect(gessner.level).toBe("major");
    expect(gessner.lastKnown).toBe(true);
    expect(gessner.trend).toBe("unknown"); // a 12-hour-old reading can't say rising or falling
  });

  it("is all clear before the storm", () => {
    const statuses = gaugeStatusesAt(GAUGES, HARVEY_SERIES, cdt("2017-08-25T12:00:00"));
    expect(statuses.every((s) => s.level === "safe")).toBe(true);
  });
});

describe("facts the app quotes", () => {
  it("S Main St rose more than 12 feet in one hour during Harvey", () => {
    const series = HARVEY_SERIES.HBMT2;
    const byTime = new Map(series.map((r) => [r.time, r.stageFt]));
    const fastest = Math.max(
      ...series.map((r) => (byTime.get(r.time + 60 * 60_000) ?? r.stageFt) - r.stageFt),
    );
    expect(fastest).toBeGreaterThan(12);
  });
});
