// "Get Me Out": pick where you are and where you want to go, and get a route that stays
// out of the danger zones.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDriveTime, formatMiles } from "../lib/format";
import type { RiskZones } from "../lib/risk";
import {
  appleMapsUrl,
  DEMO_START,
  geocode,
  googleMapsUrl,
  destinationsFor,
  inHouston,
  requestRoute,
  type Destination,
  type Place,
  type RouteOutcome,
} from "../lib/routing";

type Props = {
  zones: RiskZones;
  onChange: (state: { start: Place | null; end: Place | null; outcome: RouteOutcome | null }) => void;
  note?: string; // e.g. "Using the flood zones from Sun, Aug 27, 4:45 AM"
};

export function RoutePanel({ zones, onChange, note }: Props) {
  const [start, setStart] = useState<Place | null>(null);
  const [end, setEnd] = useState<Place | null>(null);
  const [endChoice, setEndChoice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [startMessage, setStartMessage] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const dests = destinationsFor(start);

  // Tell the page (and the map) whenever something changes.
  useEffect(() => onChange({ start, end, outcome }), [start, end, outcome, onChange]);

  // A route belongs to the zones it was planned with. If the zones change, it's out of date.
  useEffect(() => setOutcome(null), [zones]);

  function pickStart(place: Place) {
    setStart(place);
    setOutcome(null);
    // A destination picked for the other side of the bayou may no longer be a good idea.
    if (endChoice && endChoice !== "other") {
      setEnd(null);
      setEndChoice(null);
    }
  }

  function pickEnd(place: Place, choice: string) {
    setEnd(place);
    setEndChoice(choice);
    setOutcome(null);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStartMessage("This browser can't share your location. Type your address instead.");
      return;
    }
    setLocating(true);
    setStartMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { label: "My location", lon: pos.coords.longitude, lat: pos.coords.latitude };
        if (!inHouston(here)) {
          setStartMessage(
            "You seem to be outside Houston. TurnAround only plans routes around Meyerland. Type a Houston address, or use the demo start.",
          );
          return;
        }
        pickStart(here);
      },
      (err) => {
        setLocating(false);
        setStartMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this site. Type your address instead."
            : "Couldn't find your location. Type your address instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  async function findRoute() {
    if (!start || !end) return;
    setRouting(true);
    setOutcome(null);
    const result = await requestRoute(start, end, zones);
    setRouting(false);
    setOutcome(result);
    // Bring the result (and the map just below it) into view.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <section className="card route-panel" aria-labelledby="route-title">
      <h2 id="route-title">Get Me Out</h2>
      {note && <p className="fine">{note}</p>}

      <fieldset>
        <legend>From</legend>
        <button type="button" className="btn btn-secondary" onClick={useMyLocation} disabled={locating}>
          {locating ? "Finding you…" : "Use my location"}
        </button>
        <AddressSearch label="Or type a starting address" onPick={pickStart} />
        <button type="button" className="btn-link" onClick={() => pickStart(DEMO_START)}>
          Use demo start: Rutherglenn Dr, Meyerland
        </button>
        {startMessage && <p className="form-message">{startMessage}</p>}
        {start && (
          <p className="chosen">
            <span className="chosen-tag">Start</span> {start.label}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>To</legend>
        {!dests.side && (
          <p className="fine">Pick a start first and we'll show which way leads away from the bayou.</p>
        )}
        {dests.side && (
          <p className="side-note">
            You're on the <strong>{dests.side} side</strong> of Brays Bayou. These keep you on your
            side, away from the water:
          </p>
        )}
        <div className="choices">
          {dests.recommended.map((d, i) => (
            <DestinationButton
              key={d.id}
              d={d}
              best={Boolean(dests.side) && i === 0}
              pressed={endChoice === d.id}
              onPick={() => pickEnd(d, d.id)}
            />
          ))}
        </div>
        {dests.across.length > 0 && (
          <>
            <p className="side-note">
              <strong>Across Brays Bayou</strong>: only if you must. The crossings are the first
              places to flood.
            </p>
            <div className="choices">
              {dests.across.map((d) => (
                <DestinationButton
                  key={d.id}
                  d={d}
                  best={false}
                  pressed={endChoice === d.id}
                  onPick={() => pickEnd(d, d.id)}
                />
              ))}
            </div>
          </>
        )}
        <div className="choices">
          <button
            type="button"
            className="choice"
            aria-pressed={endChoice === "other"}
            onClick={() => {
              setEndChoice("other");
              setEnd(null);
              setOutcome(null);
            }}
          >
            <span>Somewhere else</span>
            <small>Type an address</small>
          </button>
        </div>
        {endChoice === "other" && (
          <AddressSearch label="Destination address" onPick={(p) => pickEnd(p, "other")} autoFocus />
        )}
        {end && (
          <p className="chosen">
            <span className="chosen-tag">End</span> {end.label}
          </p>
        )}
      </fieldset>

      <button
        type="button"
        className="btn btn-primary btn-big"
        disabled={!start || !end || routing}
        onClick={findRoute}
      >
        {routing ? "Finding a safe route…" : "Find a safe route"}
      </button>
      {(!start || !end) && <p className="fine">Choose a start and a destination first.</p>}

      <div ref={resultRef} aria-live="polite">
        {outcome && <RouteResultView outcome={outcome} />}
      </div>
    </section>
  );
}

function RouteResultView({ outcome }: { outcome: RouteOutcome }) {
  if (outcome.kind === "noRoute") {
    return (
      <div className="route-result route-none">
        <p className="route-headline">{outcome.message}</p>
        <a className="btn btn-danger" href="tel:911">
          Call 911
        </a>
      </div>
    );
  }
  if (outcome.kind === "error") {
    return (
      <div className="route-result route-error">
        <p>{outcome.message}</p>
      </div>
    );
  }

  const r = outcome.route;
  const areas = r.avoidedAreas;
  return (
    <div className="route-result route-ok">
      <div className="widget-grid widget-grid-3">
        <div className="widget widget-compact">
          <p className="widget-title">Drive</p>
          <p className="metric metric-sm">{formatDriveTime(r.durationS)}</p>
        </div>
        <div className="widget widget-compact">
          <p className="widget-title">Distance</p>
          <p className="metric metric-sm">{formatMiles(r.distanceM)}</p>
        </div>
        <div className="widget widget-compact">
          <p className="widget-title">Avoided</p>
          <p className="metric metric-sm">
            {areas}
            <span className="metric-unit">{areas === 1 ? "area" : "areas"}</span>
          </p>
        </div>
      </div>
      <p>
        {areas === 0
          ? "No flood-risk areas on the map right now. This is the normal fastest route."
          : `This route avoids ${areas} flood-risk ${areas === 1 ? "area" : "areas"}.`}
        {r.roads.length > 0 && ` Main roads: ${r.roads.join(", ")}.`}
      </p>
      {r.startInZone.length > 0 && (
        <p className="callout">
          You are starting in or right next to the {r.startInZone.join(" and ")} risk{" "}
          {r.startInZone.length === 1 ? "area" : "areas"}. Drive slowly, away from the bayou, and
          turn around if you see water on the road.
        </p>
      )}
      {r.endInZone.length > 0 && (
        <p className="callout">
          Your destination is in or next to the {r.endInZone.join(" and ")} risk{" "}
          {r.endInZone.length === 1 ? "area" : "areas"}. Pick a place
          farther from the bayou if you can.
        </p>
      )}
      {r.braysCrossings.length > 0 && (
        <p className={areas > 0 ? "callout" : undefined}>
          This route crosses Brays Bayou at {r.braysCrossings.join(" and ")}
          {areas > 0 ? ", outside the danger zones. Look before you cross." : "."}
        </p>
      )}
      {r.crossesWillowWaterhole && (
        <p className="callout">
          This route crosses Willow Waterhole Bayou. It has no official gauge, so TurnAround can't
          tell if it's flooding. Watch for water there.
        </p>
      )}
      {r.crossesZone && (
        <p className="callout callout-danger">
          Warning: part of this route touches a risk area. Use extreme caution.
        </p>
      )}
      <div className="route-actions">
        <a className="btn btn-secondary" href={googleMapsUrl(r.coords)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
        <a className="btn btn-secondary" href={appleMapsUrl(r.coords)} target="_blank" rel="noreferrer">
          Open in Apple Maps
        </a>
      </div>
      <p className="fine">
        Google and Apple don't know about flooding. Google gets 3 stops along this route; Apple
        only gets the start and end and may pick other roads. Compare with this map before you
        go. Never drive into water: turn around, don't drown.
      </p>
    </div>
  );
}

function DestinationButton({
  d,
  best,
  pressed,
  onPick,
}: {
  d: Destination;
  best: boolean;
  pressed: boolean;
  onPick: () => void;
}) {
  return (
    <button type="button" className="choice" aria-pressed={pressed} onClick={onPick}>
      <span>
        {d.label}
        {best && <span className="best-tag">Best</span>}
      </span>
      <small>
        {d.detail} · ground {d.groundFt} ft
      </small>
    </button>
  );
}

function AddressSearch({
  label,
  onPick,
  autoFocus = false,
}: {
  label: string;
  onPick: (place: Place) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) {
      setMessage("Type at least 3 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const found = await geocode(query.trim());
      setResults(found);
      if (found.length === 0) setMessage("No Houston-area matches. Try adding a street number.");
    } catch (err) {
      setResults(null);
      setMessage(err instanceof Error ? err.message : "Address search failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="address-search" onSubmit={search} role="search">
      <label>
        <span>{label}</span>
        <span className="address-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 4800 Braeswood Blvd"
            autoComplete="street-address"
            enterKeyHint="search"
            autoFocus={autoFocus}
          />
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            {busy ? "…" : "Search"}
          </button>
        </span>
      </label>
      {message && <p className="form-message">{message}</p>}
      {results && results.length > 0 && (
        <ul className="address-results">
          {results.map((p) => (
            <li key={`${p.lon},${p.lat},${p.label}`}>
              <button
                type="button"
                className="address-result"
                onClick={() => {
                  onPick(p);
                  setResults(null);
                  setQuery(p.label);
                }}
              >
                {p.label}
                {p.note && <small className="address-note">{p.note}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
