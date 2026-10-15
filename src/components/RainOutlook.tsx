// How much rain the National Weather Service expects over Meyerland.
// Rain is the earliest warning sign: the bayou reacts to it within hours.

import type { RainState } from "../hooks";
import { formatClock } from "../lib/format";

const HEAVY_RAIN_IN = 2; // our own "heads up" line, not an official NWS threshold

function inches(n: number): string {
  if (n > 0 && n < 0.01) return "< 0.01 in";
  return `${n.toFixed(2)} in`;
}

export function RainOutlook({ rain }: { rain: RainState }) {
  const { outlook, loading, error, savedAt } = rain;

  return (
    <section className="card rain" aria-labelledby="rain-title">
      <h2 id="rain-title">Rain outlook</h2>
      {!outlook && loading && <p>Loading the forecast…</p>}
      {!outlook && !loading && error && (
        <p>
          Couldn't load the rain forecast. See{" "}
          <a href="https://www.weather.gov/hgx/">weather.gov/hgx</a>.
        </p>
      )}
      {outlook && (
        <>
          <div className="rain-grid">
            <div className="rain-tile">
              <span className="rain-amount">{inches(outlook.next24hInches)}</span>
              <span className="rain-when">Next 24 hours</span>
              <span className="fine">Chance of rain up to {outlook.chance24hPct}%</span>
            </div>
            <div className="rain-tile">
              <span className="rain-amount">{inches(outlook.next3dInches)}</span>
              <span className="rain-when">Next 3 days</span>
              <span className="fine">Chance of rain up to {outlook.chance3dPct}%</span>
            </div>
          </div>
          {outlook.next24hInches >= HEAVY_RAIN_IN && (
            <p className="callout">
              Heavy rain expected. Brays Bayou can rise fast: in Harvey it climbed more than 12 feet
              in one hour at S Main St. Check back often.
            </p>
          )}
          <p className="fine">
            National Weather Service forecast for Meyerland
            {savedAt ? `, checked ${formatClock(savedAt)}` : ""}
            {error ? " (couldn't refresh; showing the last forecast)" : ""}.
          </p>
        </>
      )}
    </section>
  );
}
