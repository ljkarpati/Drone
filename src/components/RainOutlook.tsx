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
      <h2 id="rain-title" className="section-title">
        Rain outlook
      </h2>
      {!outlook && loading && <p className="widget fine">Loading the forecast…</p>}
      {!outlook && !loading && error && (
        <p className="widget">
          Couldn't load the rain forecast. See{" "}
          <a href="https://www.weather.gov/hgx/">weather.gov/hgx</a>.
        </p>
      )}
      {outlook && (
        <>
          <div className="widget-grid">
            <div className="widget">
              <p className="widget-title">Next 24 hours</p>
              <p className="metric">
                {inches(outlook.next24hInches)}
                <span className="metric-unit">in</span>
              </p>
              <p className="widget-foot">{outlook.chance24hPct}% chance of rain</p>
            </div>
            <div className="widget">
              <p className="widget-title">Next 3 days</p>
              <p className="metric">
                {inches(outlook.next3dInches)}
                <span className="metric-unit">in</span>
              </p>
              <p className="widget-foot">{outlook.chance3dPct}% chance of rain</p>
            </div>
          </div>
          {outlook.next24hInches >= HEAVY_RAIN_IN && (
            <p className="callout">
              Heavy rain expected. Brays Bayou can rise fast: in Harvey it climbed more than 12 feet
              in one hour at S Main St. Check back often.
            </p>
          )}
          <p className="fine section-foot">
            National Weather Service forecast for Meyerland
            {savedAt ? `, checked ${formatClock(savedAt)}` : ""}
            {error ? " (couldn't refresh; showing the last forecast)" : ""}.
          </p>
        </>
      )}
    </section>
  );
}
