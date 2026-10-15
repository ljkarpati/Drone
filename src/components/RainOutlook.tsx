// How much rain the National Weather Service expects over Meyerland.
// Rain is the earliest warning sign: the bayou reacts to it within hours.

import type { RainState } from "../hooks";
import { formatClock } from "../lib/format";

const HEAVY_RAIN_IN = 2; // our own "heads up" line, not an official NWS threshold

function inches(n: number): string {
  if (n > 0 && n < 0.01) return "<0.01";
  return n.toFixed(2);
}

export function RainOutlook({ rain }: { rain: RainState }) {
  const { outlook, loading, error, savedAt } = rain;

  return (
    <section className="rain" aria-labelledby="rain-title">
      <h3 id="rain-title" className="eyebrow">
        Rain forecast
      </h3>
      {!outlook && loading && <p className="widget fine">Loading the forecast…</p>}
      {!outlook && !loading && error && (
        <p className="widget">
          Couldn't load the rain forecast. See{" "}
          <a href="https://www.weather.gov/hgx/">weather.gov/hgx</a>.
        </p>
      )}
      {outlook && (
        <div className="rain-row">
          <div>
            <p className="metric metric-sm">
              {inches(outlook.next24hInches)}
              <span className="metric-unit">in</span>
            </p>
            <p className="widget-foot">next 24 hours · {outlook.chance24hPct}% chance</p>
          </div>
          <div>
            <p className="metric metric-sm">
              {inches(outlook.next3dInches)}
              <span className="metric-unit">in</span>
            </p>
            <p className="widget-foot">next 3 days · {outlook.chance3dPct}% chance</p>
          </div>
        </div>
      )}
      {outlook && outlook.next24hInches >= HEAVY_RAIN_IN && (
        <p className="callout">
          Heavy rain expected. Brays Bayou can rise more than 12 feet in an hour. Check back often.
        </p>
      )}
      {outlook && (
        <p className="fine section-foot">
          National Weather Service{savedAt ? `, ${formatClock(savedAt)}` : ""}
          {error ? " (last saved forecast)" : ""}
        </p>
      )}
    </section>
  );
}
