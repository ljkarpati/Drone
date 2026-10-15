// The main screen: status, Get Me Out, map, gauges, rain.

import { useEffect, useMemo, useState } from "react";
import { GAUGES } from "../data/gauges";
import { testModeAllowed, useLiveGauges, useNow, useRainOutlook } from "../hooks";
import { formatClock } from "../lib/format";
import { prefetchLocation } from "../lib/locate";
import { riskZones } from "../lib/risk";
import type { Place, RouteOutcome } from "../lib/routing";
import { gaugeStatusesAt, levelsKey, readingsById } from "../lib/status";
import { applyOverrides, type Override } from "../lib/testmode";
import { GaugeCard } from "./GaugeCard";
import { MapView } from "./Map";
import { RainOutlook } from "./RainOutlook";
import { RoutePanel } from "./RoutePanel";
import { StatusBanner } from "./StatusBanner";
import { TestModePanel } from "./TestModePanel";

type RouteState = { start: Place | null; end: Place | null; outcome: RouteOutcome | null };

export function Home() {
  const live = useLiveGauges();
  const rain = useRainOutlook();
  const now = useNow();
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [runId, setRunId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [routeState, setRouteState] = useState<RouteState>({ start: null, end: null, outcome: null });

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
    <>
      {testing && (
        <p className="test-banner" role="note">
          Test mode: these readings are pretend.
        </p>
      )}
      <StatusBanner statuses={statuses} loading={live.loading && !hasAnyReading} />
      <DataNotice live={live} />

      <RoutePanel zones={zones} runId={runId} onChange={setRouteState} onBusyChange={setBusy} />

      <MapView
        statuses={statuses}
        zones={zones}
        route={route}
        start={routeState.start}
        end={routeState.end}
      />

      <section aria-labelledby="gauges-title">
        <h2 id="gauges-title" className="section-title">
          Brays Bayou
        </h2>
        <div className="gauge-grid">
          {statuses.map((s) => (
            <GaugeCard key={s.gauge.id} status={s} />
          ))}
        </div>
      </section>

      <RainOutlook rain={rain} />

      {testMode && <TestModePanel gauges={GAUGES} overrides={overrides} onChange={setOverrides} />}

      {/* Always within thumb reach, however far down you've scrolled. */}
      <div className="action-bar">
        <button
          type="button"
          className="get-me-out"
          disabled={busy}
          onClick={() => setRunId((n) => n + 1)}
        >
          {busy ? "Working on it…" : "Get Me Out"}
        </button>
      </div>
    </>
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
    <p className="notice" role="status">
      {text}
    </p>
  );
}
