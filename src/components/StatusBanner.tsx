// The top of the screen, styled like a weather app: one huge number (how close Brays Bayou is
// to flooding), a condition word with its icon, and one plain sentence.

import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import { overallStatus, type RiskLevel } from "../lib/risk";
import { bannerSentence, type GaugeStatus } from "../lib/status";
import { RiskIcon } from "./RiskIcon";

// The word shown next to the big number, like "Cloudy" in a weather app.
const CONDITION: Record<RiskLevel, string> = {
  safe: "All clear",
  atRisk: "Rising",
  flooding: "Flooding",
  major: "Major flooding",
  unknown: "No data",
};

type Props = {
  statuses: GaugeStatus[];
  loading?: boolean; // first download still in progress and nothing saved to show
};

export function StatusBanner({ statuses, loading = false }: Props) {
  if (loading) {
    return (
      <section className="hero" role="status" aria-live="polite">
        <p className="hero-place">Brays Bayou · Meyerland</p>
        <p className="hero-sentence">
          <span className="spinner" aria-hidden="true" /> Checking the bayou…
        </p>
      </section>
    );
  }

  const level = overallStatus(statuses.map((s) => s.level));
  const style = RISK_STYLE[level];
  const withReadings = statuses.filter((s) => s.reading);
  // The big number: the gauge that is closest to flooding.
  const percent = withReadings.length > 0 ? Math.max(...withReadings.map((s) => s.percent)) : null;
  const ages = statuses.map((s) => s.ageMin).filter((a): a is number => a !== null);
  const newest = ages.length > 0 ? Math.min(...ages) : null;

  return (
    <section className="hero" role="status" aria-live="polite">
      <p className="hero-place">Brays Bayou · Meyerland</p>
      <div className="hero-main">
        <p
          className="hero-number"
          aria-label={percent === null ? "No reading" : `${percent} percent of the way to flood stage`}
        >
          {percent ?? "—"}
          <span className="hero-unit">%</span>
        </p>
        <div className="hero-side">
          <span className="hero-icon" style={{ background: style.bg, color: style.text }}>
            <RiskIcon level={level} size={22} />
          </span>
          <p className="hero-condition">{CONDITION[level]}</p>
          <p className="hero-caption">of the way to flood stage</p>
        </div>
      </div>
      {/* "All clear" is already shown next to the number, so don't say it twice. */}
      <p className="hero-sentence">{bannerSentence(statuses).replace(/^All clear\. /, "")}</p>
      {newest !== null && <p className="hero-updated">Gauges updated {formatAgo(newest)}</p>}
    </section>
  );
}
