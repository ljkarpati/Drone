// The big colored sentence at the top: is the water near me dangerous right now?

import { RISK_STYLE } from "../lib/colors";
import { overallStatus } from "../lib/risk";
import { bannerSentence, type GaugeStatus } from "../lib/status";
import { RiskIcon } from "./RiskIcon";

type Props = {
  statuses: GaugeStatus[];
  loading?: boolean; // first download still in progress and nothing saved to show
  note?: string; // small line under the sentence, e.g. the replay time
};

export function StatusBanner({ statuses, loading = false, note }: Props) {
  if (loading) {
    return (
      <section className="status-banner status-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <div>
          <p className="status-sentence">Checking Brays Bayou…</p>
        </div>
      </section>
    );
  }

  const level = overallStatus(statuses.map((s) => s.level));
  const style = RISK_STYLE[level];
  return (
    <section
      className="status-banner"
      style={{ background: style.bg, color: style.text }}
      role="status"
      aria-live="polite"
    >
      <RiskIcon level={level} size={40} />
      <div>
        <p className="status-label">{style.label}</p>
        <p className="status-sentence">{bannerSentence(statuses)}</p>
        {note && <p className="status-note">{note}</p>}
      </div>
    </section>
  );
}
