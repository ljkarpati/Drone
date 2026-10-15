// The colored band at the top: is the water near me dangerous right now?

import { RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import { overallStatus } from "../lib/risk";
import { bannerSentence, type GaugeStatus } from "../lib/status";
import { RiskIcon } from "./RiskIcon";

type Props = {
  statuses: GaugeStatus[];
  loading?: boolean; // first download still in progress and nothing saved to show
};

export function StatusBanner({ statuses, loading = false }: Props) {
  if (loading) {
    return (
      <section className="status-banner status-loading" role="status" aria-live="polite">
        <p className="status-sentence">
          <span className="spinner" aria-hidden="true" /> Checking Brays Bayou…
        </p>
      </section>
    );
  }

  const level = overallStatus(statuses.map((s) => s.level));
  const style = RISK_STYLE[level];
  const ages = statuses.map((s) => s.ageMin).filter((a): a is number => a !== null);
  const newest = ages.length > 0 ? Math.min(...ages) : null;
  return (
    <section
      className="status-banner"
      style={{ background: style.bg, color: style.text }}
      role="status"
      aria-live="polite"
    >
      <p className="status-label">
        <RiskIcon level={level} size={24} />
        {style.label}
      </p>
      <p className="status-sentence">{bannerSentence(statuses)}</p>
      {newest !== null && <p className="status-updated">Gauges updated {formatAgo(newest)}</p>}
    </section>
  );
}
