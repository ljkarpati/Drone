// The one place where TurnAround's colors are defined.
// The map, the legend, the status banner and the gauge cards all read from here,
// so a level always looks the same everywhere in the app.
//
// The palette is deliberately small: amber means "at risk", crimson means flooding (darker
// crimson for major), green means safe and marks the safe route. Everything else is gray, so
// danger is the only thing that stands out on the map.
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
    bg: "#10B981", // safety green: also the color of a safe route
    text: "#0B0F19",
    outline: "#047857",
  },
  atRisk: {
    label: "At risk",
    meaning: "Bayou rising. Avoid low streets.",
    bg: "#F59E0B", // warning amber
    text: "#0B0F19",
    outline: "#B45309",
  },
  flooding: {
    label: "Flooding",
    meaning: "Water out of banks nearby. Do not drive here.",
    bg: "#EF4444", // crimson: closed
    text: "#0B0F19", // white on this crimson is only 3.8 : 1, so we use near-black
    outline: "#991B1B",
  },
  major: {
    label: "Major",
    meaning: "Severe flooding. Leave now if told to.",
    bg: "#B91C1C", // darker crimson, so major and flooding never look the same
    text: "#FFFFFF",
    outline: "#7F1D1D",
  },
  unknown: {
    label: "Unknown",
    meaning: "No recent reading",
    bg: "#64748B",
    text: "#FFFFFF",
    outline: "#334155",
  },
};

// Interface colors: a deep charcoal background, white text, slate for secondary text.
export const BRAND = {
  navy: "#0B2545", // the app icon
  white: "#FFFFFF",
  background: "#0B0F19",
  muted: "#94A3B8",
  bayou: "#94A3B8", // Brays Bayou: a neutral line, so only danger and safety get color
  route: "#10B981", // the safe route: safety green...
  routeCasing: "#0B0F19", // ...with a dark edge so it stands out from the streets
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
