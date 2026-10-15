// One card per gauge: the level now, how close it is to flooding, and which way it's heading.

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

export function GaugeCard({ status }: { status: GaugeStatus }) {
  const { gauge, reading, ageMin, level, lastKnown, trend, percent } = status;
  const { normal, action, flood, major } = gauge.stages;
  const style = RISK_STYLE[level];
  // Where the "action" mark sits on the bar, as a percent of the way from normal to flood.
  const actionMark = ((action - normal) / (flood - normal)) * 100;

  return (
    <article className="card gauge-card">
      <header className="gauge-card-head">
        <h3>{gauge.name}</h3>
        <RiskBadge level={level} lastKnown={lastKnown} />
      </header>

      <p className="gauge-reading">
        <span className="gauge-ft">{reading ? `${reading.stageFt.toFixed(1)}\u00a0ft` : "—"}</span>
        <span className={`trend trend-${trend}`}>{TREND_TEXT[trend]}</span>
      </p>

      <div
        className="bar"
        role="img"
        aria-label={`${percent}% of the way from normal level to flood stage`}
      >
        <div className="bar-fill" style={{ width: `${percent}%`, background: style.bg }} />
        <div className="bar-mark" style={{ left: `${actionMark}%` }} aria-hidden="true" />
      </div>
      <p className="bar-caption">
        <span>{percent}% to flood stage</span>
        <span className="bar-caption-mark">| action</span>
      </p>

      <p className="fine">
        {/* "\u00a0" is a space that never breaks, so "59 ft" always stays on one line. */}
        {`Action ${action}\u00a0ft · Flood ${flood}\u00a0ft · Major ${major}\u00a0ft`}
        <br />
        Updated {formatAgo(ageMin)}
      </p>
    </article>
  );
}
