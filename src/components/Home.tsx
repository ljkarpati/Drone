// The main screen: a full-screen map with floating panels.
//   top:    the status of Brays Bayou
//   bottom: your route (once you ask for one), the two gauges, and Get Me Out
// Everything else (gauge details, rain, the map key) lives in the Details sheet, so the map
// stays as large and uncovered as possible.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GAUGES } from "../data/gauges";
import { testModeAllowed, useLiveGauges, useNow, useRainOutlook } from "../hooks";
import { formatClock } from "../lib/format";
import { prefetchLocation } from "../lib/locate";
import { riskZones } from "../lib/risk";
import type { Place, RouteOutcome } from "../lib/routing";
import { gaugeStatusesAt, levelsKey, readingsById } from "../lib/status";
import { applyOverrides, type Override } from "../lib/testmode";
import { Link } from "../router";
import { GaugeCard, GaugeCell } from "./GaugeCard";
import { Legend } from "./Legend";
import { MapView } from "./Map";
import { RainOutlook } from "./RainOutlook";
import { RoutePanel } from "./RoutePanel";
import { StatusBanner } from "./StatusBanner";
import { TestModePanel } from "./TestModePanel";

type RouteState = { start: Place | null; end: Place | null; outcome: RouteOutcome | null };

/** The live height of an element in pixels (so the map knows what the panels cover). */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

export function Home() {
  const live = useLiveGauges();
  const rain = useRainOutlook();
  const now = useNow();
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [runId, setRunId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [routeState, setRouteState] = useState<RouteState>({ start: null, end: null, outcome: null });
  const [topRef, topHeight] = useHeight<HTMLDivElement>();
  const [bottomRef, bottomHeight] = useHeight<HTMLDivElement>();

  // If this phone already allowed location, start finding it now so Get Me Out is instant.
  useEffect(() => {
    prefetchLocation();
  }, []);

  const testMode = testModeAllowed();
  const testing = testMode && Object.values(overrides).some((o) => o !== "live");
  const series = testing ? applyOverrides(GAUGES, live.seriesById, overrides, now) : live.seriesById;
  const statuses = gaugeStatusesAt(GAUGES, series, now);

  // Rebuild the zones only when some gauge's level actually changes (the zones depend only on
  // the levels), so a planned route isn't thrown away every minute.
  const key = levelsKey(statuses);
  const zones = useMemo(() => riskZones(GAUGES, readingsById(statuses)), [key]);

  const hasAnyReading = statuses.some((s) => s.reading);
  const route = routeState.outcome?.kind === "ok" ? routeState.outcome.route.coords : null;

  return (
    <div
      className="screen"
      style={{ "--overlay-bottom": `${bottomHeight + 12}px` } as CSSProperties}
    >
      <MapView
        statuses={statuses}
        zones={zones}
        route={route}
        start={routeState.start}
        end={routeState.end}
        padTop={topHeight}
        padBottom={bottomHeight}
      />

      <div ref={topRef} className="overlay overlay-top">
        <StatusBanner statuses={statuses} loading={live.loading && !hasAnyReading} testing={testing} />
        <DataNotice live={live} />
      </div>

      <div ref={bottomRef} className="overlay overlay-bottom">
        <RoutePanel zones={zones} runId={runId} onChange={setRouteState} onBusyChange={setBusy} />
        <div className="panel dock">
          {/* While a route is showing, the map matters more than the gauge cells (the status card
              above still shows the bayou), so they step aside. */}
          <div className="dock-gauges" hidden={Boolean(route)}>
            {statuses.map((s) => (
              <GaugeCell key={s.gauge.id} status={s} onOpen={() => setDetails(true)} />
            ))}
            <button type="button" className="gauge-cell gauge-cell-more" onClick={() => setDetails(true)}>
              Details
            </button>
          </div>
          <button
            type="button"
            className="get-me-out"
            disabled={busy}
            onClick={() => setRunId((n) => n + 1)}
          >
            {busy ? "Finding a route…" : "Get Me Out"}
          </button>
        </div>
      </div>

      {details && (
        <div className="sheet-backdrop" onClick={() => setDetails(false)}>
          <section
            className="panel sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 id="details-title">Details</h2>
              <button type="button" className="btn btn-quiet" onClick={() => setDetails(false)}>
                Done
              </button>
            </div>

            <h3 className="eyebrow">Gauges</h3>
            <ul className="rows">
              {statuses.map((s) => (
                <GaugeCard key={s.gauge.id} status={s} />
              ))}
            </ul>

            <RainOutlook rain={rain} />

            <h3 className="eyebrow">Map key</h3>
            <Legend />

            {testMode && <TestModePanel gauges={GAUGES} overrides={overrides} onChange={setOverrides} />}

            <p className="fine sheet-foot">
              Not an official warning service. Follow the{" "}
              <a href="https://www.weather.gov/hgx/">National Weather Service</a>. In an emergency,
              call <a href="tel:911">911</a>. <Link href="/about">How TurnAround works</Link>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

/** Explains where the readings came from when something went wrong. */
function DataNotice({ live }: { live: ReturnType<typeof useLiveGauges> }) {
  if (live.loading) return null;
  const failedNames = GAUGES.filter((g) => live.failedIds.includes(g.id)).map((g) => g.shortName);
  if (failedNames.length === 0) return null;

  const allFailed = failedNames.length === GAUGES.length;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  let text: string;
  if (allFailed && live.fromCache && live.savedAt) {
    text = `${offline ? "Offline." : "Can't reach NOAA right now."} Showing last known readings from ${formatClock(live.savedAt)}.`;
  } else if (allFailed) {
    text = `${offline ? "You're offline" : "Can't reach NOAA right now"}, and there are no saved readings yet. Check weather.gov/hgx for official information.`;
  } else {
    text = `Couldn't update the ${failedNames.join(" and ")} gauge. Showing its last known reading if we have one.`;
  }
  return (
    <p className="panel notice" role="status">
      {text}
    </p>
  );
}
