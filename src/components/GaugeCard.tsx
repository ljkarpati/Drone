// Gauges, two ways: GaugeCard is a full row in the Details sheet (name, a ring showing how close
// it is to flood stage, the level now and its trend); GaugeCell is the compact version in the
// bar at the bottom of the map.

import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import type { Trend } from "../lib/readings";
import type { GaugeStatus } from "../lib/status";
import { RiskBadge } from "./RiskIcon";

const TREND_TEXT: Record<Trend, string> = {
  rising: "↑ rising",
  falling: "↓ falling",
  steady: "steady",
  unknown: "",
};

/** A ring that fills up as the water gets closer to flood stage (like an Activity ring). */
function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 17;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className="ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(148 163 184 / 0.25)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(Math.max(percent, 1) / 100) * circumference} ${circumference}`}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" className="ring-text">
        {percent}
      </text>
    </svg>
  );
}

export function GaugeCard({ status }: { status: GaugeStatus }) {
  const { gauge, reading, ageMin, level, lastKnown, trend, percent } = status;
  const style = RISK_STYLE[level];

  return (
    <li className="row" aria-label={`${gauge.name}: ${style.label}, ${percent}% of the way to flood stage`}>
      <Ring percent={percent} color={style.bg} />
      <div className="row-main">
        <p className="row-title">{gauge.shortName}</p>
        <p className="row-sub">
          Floods at {gauge.stages.flood}&nbsp;ft · {formatAgo(ageMin)}
        </p>
      </div>
      <div className="row-end">
        <p className="row-value">
          {reading ? reading.stageFt.toFixed(1) : "—"}
          <span className="row-unit">ft</span>
        </p>
        {level === "safe" && !lastKnown ? (
          <p className="row-sub">{TREND_TEXT[trend]}</p>
        ) : (
          <RiskBadge level={level} lastKnown={lastKnown} />
        )}
      </div>
    </li>
  );
}

/** The compact version for the bottom bar. The thin top edge is the level color. */
export function GaugeCell({ status, onOpen }: { status: GaugeStatus; onOpen: () => void }) {
  const { gauge, reading, level } = status;
  const style = RISK_STYLE[level];
  return (
    <button
      type="button"
      className="gauge-cell"
      style={{ borderTopColor: style.bg }}
      onClick={onOpen}
      aria-label={`${gauge.name}: ${reading ? `${reading.stageFt.toFixed(1)} feet, ` : ""}${style.label}. Open details.`}
    >
      <span className="gauge-cell-name">{gauge.shortName}</span>
      <span className="gauge-cell-value num">{reading ? `${reading.stageFt.toFixed(1)} ft` : "—"}</span>
      <span className="gauge-cell-level">{style.label}</span>
    </button>
  );
}
