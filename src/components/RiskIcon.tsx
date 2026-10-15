// One small icon per risk level, so the app never relies on color alone.
// The same shapes are used in React (RiskIcon) and on the Leaflet map (riskIconSvg),
// which needs plain HTML text instead of a React component.

import type { RiskLevel } from "../lib/risk";
import { RISK_STYLE } from "../lib/colors";

// Each icon is a few SVG path outlines on a 24 x 24 grid.
const ICON_PATHS: Record<RiskLevel, string[]> = {
  // check mark
  safe: ["M5 12.5l4.5 4.5L19 7.5"],
  // warning triangle with "!"
  atRisk: ["M12 3.5L2.5 20h19L12 3.5z", "M12 10v4.5", "M12 17.3v.2"],
  // three waves
  flooding: [
    "M2 7.5q2.5-2.5 5 0t5 0 5 0 5 0",
    "M2 12.5q2.5-2.5 5 0t5 0 5 0 5 0",
    "M2 17.5q2.5-2.5 5 0t5 0 5 0 5 0",
  ],
  // stop sign with "!"
  major: ["M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8z", "M12 7.5v6", "M12 16.5v.2"],
  // question mark
  unknown: ["M8.8 9a3.3 3.3 0 1 1 4.6 3c-1 .5-1.4 1.1-1.4 2.2v.6", "M12 18v.2"],
};

export function riskIconSvg(level: RiskLevel, size = 20, color = "currentColor"): string {
  const paths = ICON_PATHS[level].map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
}

export function RiskIcon({ level, size = 20 }: { level: RiskLevel; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[level].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** A colored pill with icon and label, e.g. [!] At risk. */
export function RiskBadge({ level, lastKnown = false }: { level: RiskLevel; lastKnown?: boolean }) {
  const style = RISK_STYLE[level];
  return (
    <span className="badge" style={{ background: style.bg, color: style.text }}>
      <RiskIcon level={level} size={18} />
      {style.label}
      {lastKnown && <span className="badge-note"> (last known)</span>}
    </span>
  );
}
