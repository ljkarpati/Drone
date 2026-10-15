// One widget per gauge: the level now, how close it is to flooding, and which way it's heading.

import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import type { Trend } from "../lib/readings";
import type { GaugeStatus } from "../lib/status";
import { RiskBadge } from "./RiskIcon";

const TREND_TEXT: Record<Trend, string> = {
  rising: "↑ Rising",
  falling: "↓ Falling",
  steady: "→ Steady",
  unknown: "Trend unknown",
};

/** A ring that fills up as the water gets closer to flood stage (like an Activity ring). */
function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className="ring" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" className="ring-text">
        {percent}%
      </text>
    </svg>
  );
}

export function GaugeCard({ status }: { status: GaugeStatus }) {
  const { gauge, reading, ageMin, level, lastKnown, trend, percent } = status;
  const style = RISK_STYLE[level];

  return (
    <article
      className="widget gauge-widget"
      aria-label={`${gauge.name}: ${style.label}, ${percent}% of the way to flood stage`}
    >
      <header className="widget-head">
        <h3 className="widget-title">{gauge.shortName}</h3>
        <Ring percent={percent} color={style.bg} />
      </header>
      <p className="metric">
        {reading ? reading.stageFt.toFixed(1) : "—"}
        <span className="metric-unit">ft</span>
      </p>
      <p className={`trend trend-${trend}`}>{TREND_TEXT[trend]}</p>
      <RiskBadge level={level} lastKnown={lastKnown} />
      <p className="widget-foot">
        Floods at {gauge.stages.flood}&nbsp;ft · {formatAgo(ageMin)}
      </p>
    </article>
  );
}
