// The level badge: a small colored tag with the level written on it.
// (The written word is what makes it accessible; the color just makes it fast to scan.)

import { RISK_STYLE } from "../lib/colors";
import type { RiskLevel } from "../lib/risk";

export function RiskBadge({ level, lastKnown = false }: { level: RiskLevel; lastKnown?: boolean }) {
  const style = RISK_STYLE[level];
  return (
    <span className="badge" style={{ background: style.bg, color: style.text }}>
      {style.label}
      {lastKnown && <span className="badge-note"> (last known)</span>}
    </span>
  );
}
