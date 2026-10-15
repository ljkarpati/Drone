// Developer switch: force a gauge to any level to test the map and routing on a dry day.

import type { Gauge } from "../data/gauges";
import { OVERRIDE_LABELS, type Override } from "../lib/testmode";

type Props = {
  gauges: Gauge[];
  overrides: Record<string, Override>;
  onChange: (overrides: Record<string, Override>) => void;
};

const OPTIONS = Object.keys(OVERRIDE_LABELS) as Override[];

export function TestModePanel({ gauges, overrides, onChange }: Props) {
  const active = Object.values(overrides).some((o) => o !== "live");
  return (
    <details className="card test-panel" open={active}>
      <summary>Test mode {active ? "(ON: pretend readings)" : ""}</summary>
      <p className="fine">
        Pretend a gauge is at a level to check zones and routing. Only you see this.
      </p>
      {gauges.map((g) => (
        <label key={g.id} className="test-row">
          <span>{g.name}</span>
          <select
            value={overrides[g.id] ?? "live"}
            onChange={(e) => onChange({ ...overrides, [g.id]: e.target.value as Override })}
          >
            {OPTIONS.map((o) => (
              <option key={o} value={o}>
                {OVERRIDE_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
      ))}
    </details>
  );
}
