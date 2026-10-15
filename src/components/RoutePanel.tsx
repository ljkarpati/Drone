// "Get Me Out". One tap does everything: find you, pick the best place to go on your side of
// the bayou, and plan a route around the water. People who want to choose (helping a relative,
// or a demo) can open "Change start or destination".

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatDriveTime, formatMiles } from "../lib/format";
import { locate } from "../lib/locate";
import type { RiskZones } from "../lib/risk";
import {
  appleMapsUrl,
  DEMO_START,
  destinationsFor,
  geocode,
  googleMapsUrl,
  inHouston,
  requestRoute,
  type Destination,
  type Place,
  type RouteOutcome,
} from "../lib/routing";
import { braysSide } from "../lib/sides";

type RouteState = { start: Place | null; end: Place | null; outcome: RouteOutcome | null };

type Props = {
  zones: RiskZones;
  runId: number; // goes up by one every time someone taps Get Me Out
  onChange: (state: RouteState) => void;
  onBusyChange?: (busy: boolean) => void;
};

type Stage = "idle" | "locating" | "routing" | "done";

const LOCATION_PROBLEM: Record<string, string> = {
  denied:
    "Location is off for this site. Turn it on in Settings › Privacy & Security › Location Services › Safari Websites, or type your address below.",
  unavailable: "Couldn't find your location. Type your address below.",
  unsupported: "This browser can't share your location. Type your address below.",
};

export function RoutePanel({ zones, runId, onChange, onBusyChange }: Props) {
  const [start, setStart] = useState<Place | null>(null);
  const [end, setEnd] = useState<Place | null>(null);
  const [endChoice, setEndChoice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  useEffect(() => onChange({ start, end, outcome }), [start, end, outcome, onChange]);
  useEffect(() => onBusyChange?.(stage === "locating" || stage === "routing"), [stage, onBusyChange]);

  const show = () =>
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const plan = useCallback(async (from: Place, to: Place) => {
    setStage("routing");
    const result = await requestRoute(from, to, zonesRef.current);
    setOutcome(result);
    setStage("done");
    return result;
  }, []);

  // The one-tap flow.
  const autoRun = useCallback(async () => {
    setEditing(false);
    setOutcome(null);
    setMessage(null);
    setStage("locating");
    show();

    let here: Place;
    try {
      here = await locate();
    } catch (err) {
      setStage("idle");
      setMessage(LOCATION_PROBLEM[(err as Error).message] ?? LOCATION_PROBLEM.unavailable);
      setEditing(true);
      return;
    }
    if (!inHouston(here)) {
      here = DEMO_START;
      setMessage("You're outside Houston, so this is a demo starting in Meyerland.");
    }
    setStart(here);

    // Best destinations first. If the zones block one completely, try the next.
    const { recommended, across } = destinationsFor(here);
    let last: RouteOutcome | null = null;
    for (const d of [...recommended, ...across]) {
      setEnd(d);
      setEndChoice(d.id);
      last = await plan(here, d);
      if (last.kind !== "noRoute") break;
    }
    show();
  }, [plan]);

  useEffect(() => {
    if (runId > 0) autoRun();
  }, [runId, autoRun]);

  // If the water changes while a route is showing, plan it again with the new zones.
  useEffect(() => {
    if (start && end && stage === "done") plan(start, end);
    // (Deliberately runs only when the zones change, not when start or end change.)
  }, [zones]);

  const busy = stage === "locating" || stage === "routing";
  const dests = destinationsFor(start);

  return (
    <section ref={ref} className="trip" aria-live="polite" aria-busy={busy}>
      {busy && (
        <p className="trip-progress">
          <span className="spinner" aria-hidden="true" />
          {stage === "locating" ? "Finding you…" : "Planning a way around the water…"}
        </p>
      )}
      {message && <p className="trip-message">{message}</p>}
      {stage === "done" && outcome && <TripResult outcome={outcome} start={start} end={end} />}

      {!busy && (
        <button type="button" className="btn-link trip-change" onClick={() => setEditing(!editing)}>
          {editing
            ? "Hide"
            : stage === "idle" && !message
              ? "Or plan a trip from an address"
              : "Change start or destination"}
        </button>
      )}

      {editing && (
        <div className="manual">
          <fieldset>
            <legend>From</legend>
            <button type="button" className="btn btn-secondary" onClick={autoRun}>
              Use my location
            </button>
            <AddressSearch
              label="Or type an address"
              onPick={(p) => {
                setStart(p);
                setOutcome(null);
                if (endChoice !== "other") {
                  setEnd(null);
                  setEndChoice(null);
                }
              }}
            />
            <button type="button" className="btn-link" onClick={() => setStart(DEMO_START)}>
              Use demo start (Rutherglenn Dr)
            </button>
            {start && <p className="chosen">From {start.label}</p>}
          </fieldset>

          <fieldset>
            <legend>To</legend>
            {dests.side && <p className="fine">You're on the {dests.side} side of Brays Bayou.</p>}
            <div className="choices">
              {dests.recommended.map((d, i) => (
                <DestinationButton
                  key={d.id}
                  d={d}
                  best={Boolean(dests.side) && i === 0}
                  pressed={endChoice === d.id}
                  onPick={() => {
                    setEnd(d);
                    setEndChoice(d.id);
                  }}
                />
              ))}
            </div>
            {dests.across.length > 0 && (
              <>
                <p className="fine">Across Brays Bayou (crossings flood first):</p>
                <div className="choices">
                  {dests.across.map((d) => (
                    <DestinationButton
                      key={d.id}
                      d={d}
                      best={false}
                      pressed={endChoice === d.id}
                      onPick={() => {
                        setEnd(d);
                        setEndChoice(d.id);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              className="choice"
              aria-pressed={endChoice === "other"}
              onClick={() => {
                setEndChoice("other");
                setEnd(null);
              }}
            >
              <span>Somewhere else</span>
            </button>
            {endChoice === "other" && (
              <AddressSearch label="Destination" onPick={(p) => setEnd(p)} autoFocus />
            )}
          </fieldset>

          <button
            type="button"
            className="btn btn-primary btn-big"
            disabled={!start || !end || busy}
            onClick={async () => {
              if (!start || !end) return;
              setMessage(null);
              setEditing(false);
              await plan(start, end);
              show();
            }}
          >
            Plan this route
          </button>
        </div>
      )}
    </section>
  );
}

function TripResult({
  outcome,
  start,
  end,
}: {
  outcome: RouteOutcome;
  start: Place | null;
  end: Place | null;
}) {
  if (outcome.kind === "noRoute") {
    return (
      <div className="trip-result trip-none">
        <p className="trip-dest">No safe route out.</p>
        <p>Every way out goes through flooded areas. Stay where you are and call 911 if you are in danger.</p>
        <a className="btn btn-danger btn-big" href="tel:911">
          Call 911
        </a>
      </div>
    );
  }
  if (outcome.kind === "error") {
    return <p className="trip-message">{outcome.message}</p>;
  }

  const r = outcome.route;
  const destination = end && "detail" in end ? (end as Destination).detail : end?.label;
  const side = start ? braysSide([start.lon, start.lat]) : null;
  const facts: { text: string; warn?: boolean }[] = [];
  if (r.startInZone.length > 0) {
    facts.push({ text: "You're starting in a risk area. Drive slowly, away from the bayou.", warn: true });
  }
  if (r.braysCrossings.length > 0) {
    facts.push({
      text: `Crosses Brays Bayou at ${r.braysCrossings.join(" and ")}${r.avoidedAreas > 0 ? ", outside the flooded stretch" : ""}.`,
      warn: r.avoidedAreas > 0,
    });
  } else if (side) {
    facts.push({ text: `Stays on the ${side} side of Brays Bayou.` });
  }
  if (r.crossesWillowWaterhole) {
    facts.push({ text: "Crosses Willow Waterhole Bayou, which has no gauge. Watch for water.", warn: true });
  }
  if (r.endInZone.length > 0) {
    facts.push({ text: "Your destination is near a risk area. Pick one farther away if you can.", warn: true });
  }
  if (r.crossesZone) {
    facts.push({ text: "Part of this route touches a risk area. Use extreme caution.", warn: true });
  }

  return (
    <div className="trip-result">
      <p className="trip-eyebrow">Head to</p>
      <p className="trip-dest">{destination}</p>
      <p className="trip-meta">
        <strong>{formatDriveTime(r.durationS)}</strong>
        <span>{formatMiles(r.distanceM)}</span>
        <span>
          {r.avoidedAreas === 0
            ? "no flooding on the map"
            : `avoids ${r.avoidedAreas} flood ${r.avoidedAreas === 1 ? "area" : "areas"}`}
        </span>
      </p>
      {r.roads.length > 0 && <p className="trip-via">via {r.roads.slice(0, 2).join(" and ")}</p>}
      {facts.length > 0 && (
        <ul className="trip-facts">
          {facts.map((f) => (
            <li key={f.text} className={f.warn ? "is-warn" : undefined}>
              {f.text}
            </li>
          ))}
        </ul>
      )}
      <div className="trip-actions">
        <a className="btn btn-primary" href={googleMapsUrl(r.coords)} target="_blank" rel="noreferrer">
          Google Maps
        </a>
        <a className="btn btn-secondary" href={appleMapsUrl(r.coords)} target="_blank" rel="noreferrer">
          Apple Maps
        </a>
      </div>
      <p className="fine">
        Apple Maps may choose other roads; Google follows this route. Never drive into water.
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
        {d.detail}
        {best && <span className="best-tag">Best</span>}
      </span>
      <small>
        {d.label} · {d.groundFt} ft up
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
      if (found.length === 0) setMessage("No Houston-area matches. Try adding a house number.");
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
            placeholder="4800 Braeswood Blvd"
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
