// The map key. It sits on top of the map; on phones it starts folded up so it doesn't
// cover the streets, and one tap opens it.

import { useState } from "react";
import { BRAND, RISK_STYLE } from "../lib/colors";
import type { RiskLevel } from "../lib/risk";
import { RiskIcon } from "./RiskIcon";

const ORDER: RiskLevel[] = ["safe", "atRisk", "flooding", "major", "unknown"];

function startsOpen(): boolean {
  try {
    return window.matchMedia("(min-width: 700px)").matches;
  } catch {
    return true;
  }
}

export function Legend() {
  const [open, setOpen] = useState(startsOpen);
  return (
    <div className={`legend ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={open}
        aria-controls="map-legend"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide legend" : "Legend"}
      </button>
      {open && (
        <ul id="map-legend" className="legend-list">
          {ORDER.map((level) => {
            const style = RISK_STYLE[level];
            return (
              <li key={level}>
                <span className="legend-swatch" style={{ background: style.bg, color: style.text }}>
                  <RiskIcon level={level} size={18} />
                </span>
                <span>
                  <strong>{style.label}</strong>
                  <span className="legend-meaning">{style.meaning}</span>
                </span>
              </li>
            );
          })}
          <li>
            <span className="legend-line" style={{ background: BRAND.bayou }} aria-hidden="true" />
            <span>
              <strong>Brays Bayou</strong>
            </span>
          </li>
          <li>
            <span
              className="legend-line legend-route"
              style={{ background: BRAND.route }}
              aria-hidden="true"
            />
            <span>
              <strong>Your route</strong>
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
