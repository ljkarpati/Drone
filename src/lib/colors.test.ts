import { describe, expect, it } from "vitest";
import { BRAND, contrastRatio, RISK_STYLE } from "./colors";

describe("colors", () => {
  it("pairs every risk color with text that passes WCAG AA (4.5 : 1)", () => {
    for (const [level, style] of Object.entries(RISK_STYLE)) {
      expect(contrastRatio(style.bg, style.text), level).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives every level a label and a meaning, so color is never the only signal", () => {
    for (const style of Object.values(RISK_STYLE)) {
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.meaning.length).toBeGreaterThan(0);
    }
  });

  it("keeps the navy brand color readable with white text", () => {
    expect(contrastRatio(BRAND.navy, BRAND.white)).toBeGreaterThanOrEqual(4.5);
  });

  it("computes known contrast ratios correctly", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});
