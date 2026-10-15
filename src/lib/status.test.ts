import { describe, expect, it } from "vitest";
import { GAUGES } from "../data/gauges";
import { bannerSentence, gaugeStatusesAt } from "./status";
import type { Reading } from "./readings";

const NOW = Date.parse("2026-10-15T12:00:00Z");
const at = (minutesAgo: number, stageFt: number): Reading => ({
  time: NOW - minutesAgo * 60_000,
  stageFt,
});
const sentence = (series: Record<string, Reading[]>) =>
  bannerSentence(gaugeStatusesAt(GAUGES, series, NOW));

describe("bannerSentence", () => {
  it("says all clear when every gauge is normal", () => {
    expect(sentence({ GSST2: [at(20, 38.7)], HBMT2: [at(20, 16.8)] })).toBe(
      "All clear. Brays Bayou is at normal levels.",
    );
  });

  it("names the gauge and the streets to avoid when the bayou is rising", () => {
    expect(sentence({ GSST2: [at(20, 55)], HBMT2: [at(20, 16.8)] })).toBe(
      "Brays Bayou is rising near Gessner Dr. Avoid low streets like Fondren Rd and N & S Braeswood Blvd.",
    );
  });

  it("names every gauge at the worst level", () => {
    expect(sentence({ GSST2: [at(20, 57.5)], HBMT2: [at(20, 41.5)] })).toMatch(
      /^Brays Bayou is flooding near Gessner Dr and S Main St\./,
    );
  });

  it("says which gauge went quiet when it uses an old reading", () => {
    const text = sentence({ GSST2: [at(600, 59.1)], HBMT2: [at(20, 44)] });
    expect(text).toMatch(/^Major flooding on Brays Bayou near Gessner Dr and S Main St\./);
    expect(text).toMatch(/The Gessner Dr gauge has stopped reporting/);
  });

  it("is honest when a gauge isn't reporting", () => {
    expect(sentence({ GSST2: [], HBMT2: [at(20, 16.8)] })).toBe(
      "The Gessner Dr gauge isn't reporting right now. S Main St is at normal levels.",
    );
    expect(sentence({})).toBe(
      "No recent gauge readings. Check the National Weather Service before you drive.",
    );
  });
});
