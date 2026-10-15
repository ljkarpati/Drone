// The one place where TurnAround's colors are defined.
// The map, the legend, the status banner and the gauge cards all read from here,
// so a level always looks the same everywhere in the app.
//
// The risk colors follow the National Weather Service's own flood map convention:
// yellow for "action", red for flooding, purple for major flooding.
//
// Every background color is paired with a text color that passes WCAG AA contrast
// (at least 4.5 : 1). src/lib/colors.test.ts checks this automatically.
// Color is never used alone: every level also has an icon and a written label.

import type { RiskLevel } from "./risk";

export type RiskStyle = {
  label: string; // short name shown on badges and in the legend
  meaning: string; // one plain-English line for the legend
  bg: string; // background / map color
  text: string; // text color to use on top of bg
  outline: string; // darker edge used on the map so shapes stand out from the streets
};

export const RISK_STYLE: Record<RiskLevel, RiskStyle> = {
  safe: {
    label: "Safe",
    meaning: "Normal levels",
    bg: "#1B7A3D",
    text: "#FFFFFF",
    outline: "#0E4A24",
  },
  atRisk: {
    label: "At risk",
    meaning: "Bayou rising. Avoid low streets.",
    bg: "#F2B705",
    text: "#0B2545",
    outline: "#7A5A00",
  },
  flooding: {
    label: "Flooding",
    meaning: "Water out of banks nearby. Do not drive here.",
    bg: "#C42B1C",
    text: "#FFFFFF",
    outline: "#7A140B",
  },
  major: {
    label: "Major",
    meaning: "Severe flooding. Leave now if told to.",
    bg: "#6B21A8",
    text: "#FFFFFF",
    outline: "#3B0F5E",
  },
  unknown: {
    label: "Unknown",
    meaning: "No recent reading",
    bg: "#596273",
    text: "#FFFFFF",
    outline: "#2E343D",
  },
};

// Brand colors: deep navy and clean white. Calm, not alarming.
export const BRAND = {
  navy: "#0B2545",
  white: "#FFFFFF",
  bayou: "#2F7FC1", // the blue line of Brays Bayou on the map
  route: "#0B2545", // the safe route: thick navy line...
  routeCasing: "#FFFFFF", // ...with a white edge so it shows on any street color
};

// WCAG contrast ratio between two hex colors (1 = no contrast, 21 = black on white).
// Formula from https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
export function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
