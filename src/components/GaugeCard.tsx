// One row per gauge in the "Gauges" panel: name, how close it is to flooding (the ring),
// the level now and which way it's heading.

import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import type { Trend } from "../lib/readings";
import type { GaugeStatus } from "../lib/status";
import { RiskBadge } from "./RiskIcon";

// Brighter versions of the risk colors, for thin rings drawn on the dark sky.
const RING_COLOR: Record<GaugeStatus["level"], string> = {
  safe: "#34c759",
  atRisk: "#f2b705",
  flooding: "#ff6a55",
  major: "#c18cff",
  unknown: "#a1a1a6",
};

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
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="5" />
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
      <Ring percent={percent} color={RING_COLOR[level]} />
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
