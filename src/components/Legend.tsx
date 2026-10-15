// The map key, shown in the Details sheet so it never covers the map.

import { BRAND, RISK_STYLE } from "../lib/colors";
import type { RiskLevel } from "../lib/risk";

const ORDER: RiskLevel[] = ["atRisk", "flooding", "major", "safe", "unknown"];

export function Legend() {
  return (
    <ul className="legend-list">
      {ORDER.map((level) => {
        const style = RISK_STYLE[level];
        return (
          <li key={level}>
            <span className="legend-swatch" style={{ background: style.bg }} aria-hidden="true" />
            <span>
              <strong>{style.label}</strong>
              <span className="legend-meaning">{style.meaning}</span>
            </span>
          </li>
        );
      })}
      <li>
        <span className="legend-line" style={{ background: BRAND.route }} aria-hidden="true" />
        <span>
          <strong>Safe route</strong>
        </span>
      </li>
      <li>
        <span className="legend-line legend-thin" style={{ background: BRAND.bayou }} aria-hidden="true" />
        <span>
          <strong>Brays Bayou</strong>
        </span>
      </li>
    </ul>
  );
}
