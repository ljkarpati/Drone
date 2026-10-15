// The status of Brays Bayou: a card that floats at the top of the map.
// The colored stripe on its left edge is the danger level; the word next to it says the same
// thing, so color is never the only signal.

import type { CSSProperties } from "react";
import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import { overallStatus, type RiskLevel } from "../lib/risk";
import { bannerSentence, type GaugeStatus } from "../lib/status";

const CONDITION: Record<RiskLevel, string> = {
  safe: "Normal",
  atRisk: "Rising",
  flooding: "Flooding",
  major: "Major flooding",
  unknown: "No data",
};

type Props = {
  statuses: GaugeStatus[];
  loading?: boolean; // first download still in progress and nothing saved to show
  testing?: boolean; // test mode is showing pretend readings
};

export function StatusBanner({ statuses, loading = false, testing = false }: Props) {
  if (loading) {
    return (
      <section className="panel status-card" role="status" aria-live="polite">
        <p className="eyebrow">Brays Bayou</p>
        <p className="status-level">Checking…</p>
      </section>
    );
  }

  const level = overallStatus(statuses.map((s) => s.level));
  const style = RISK_STYLE[level];
  const withReadings = statuses.filter((s) => s.reading);
  // How close the gauge nearest to flooding is to its flood stage.
  const percent = withReadings.length > 0 ? Math.max(...withReadings.map((s) => s.percent)) : null;
  const ages = statuses.map((s) => s.ageMin).filter((a): a is number => a !== null);
  const newest = ages.length > 0 ? Math.min(...ages) : null;
  const sentence = bannerSentence(statuses).replace(/^All clear\. /, "");

  return (
    <section
      className="panel status-card"
      style={{ "--accent": style.bg } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <div className="status-top">
        <p className="eyebrow">Brays Bayou{testing ? " · Test mode, simulated readings" : ""}</p>
        {newest !== null && <p className="eyebrow">Updated {formatAgo(newest)}</p>}
      </div>
      <div className="status-main">
        <p className="status-level">{CONDITION[level]}</p>
        {percent !== null && (
          <p className="status-pct">
            <span className="num">{percent}%</span> to flood stage
          </p>
        )}
      </div>
      <p className="status-sentence">{sentence}</p>
    </section>
  );
}
