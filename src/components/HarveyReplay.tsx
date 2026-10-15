// Harvey Replay: play back the real Hurricane Harvey water levels through the exact same
// logic the live app uses, and see what TurnAround would have shown, minute by minute.

import { useEffect, useMemo, useRef, useState } from "react";
import { GAUGES, gaugeById } from "../data/gauges";
import { RISK_STYLE } from "../lib/colors";
import { formatDayTime, formatDuration } from "../lib/format";
import {
  HARVEY_END,
  HARVEY_SERIES,
  HARVEY_START,
  milestones,
  STEP_MS,
  warningTimes,
} from "../lib/harvey";
import { riskZones } from "../lib/risk";
import type { Place, RouteOutcome } from "../lib/routing";
import { gaugeStatusesAt, levelsKey, readingsById } from "../lib/status";
import { GaugeCard } from "./GaugeCard";
import { MapView } from "./Map";
import { RiskBadge, RiskIcon } from "./RiskIcon";
import { RoutePanel } from "./RoutePanel";
import { StatusBanner } from "./StatusBanner";

const LAST_STEP = Math.round((HARVEY_END - HARVEY_START) / STEP_MS);
const SPEEDS = [
  { label: "1 hour / sec", stepsPerSecond: 4 },
  { label: "3 hours / sec", stepsPerSecond: 12 },
  { label: "6 hours / sec", stepsPerSecond: 24 },
];
// 6:00 PM on Aug 26, 2017: three hours before the first alert. A good place to start a demo.
const BEFORE_THE_FLOOD = Math.round((Date.parse("2017-08-26T23:00:00Z") - HARVEY_START) / STEP_MS);

const MILESTONES = milestones(GAUGES, HARVEY_SERIES);
const MILESTONE_TIMES = new Set(MILESTONES.map((m) => m.time));
const WARNINGS = warningTimes(GAUGES, HARVEY_SERIES);

type RouteState = { start: Place | null; end: Place | null; outcome: RouteOutcome | null };

export function HarveyReplay() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pauseAtMilestones, setPauseAtMilestones] = useState(true);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeState, setRouteState] = useState<RouteState>({ start: null, end: null, outcome: null });
  const panelRef = useRef<HTMLDivElement>(null);

  const time = HARVEY_START + step * STEP_MS;
  const statuses = gaugeStatusesAt(GAUGES, HARVEY_SERIES, time);
  const key = levelsKey(statuses);
  // Zones depend only on the levels, so rebuild them only when a level changes.
  const zones = useMemo(() => riskZones(GAUGES, readingsById(statuses)), [key]);

  // The play button: move forward one 15-minute step at a time.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LAST_STEP)),
      1000 / SPEEDS[speed].stepsPerSecond,
    );
    return () => clearInterval(id);
  }, [playing, speed]);

  // Stop at the end, and (if chosen) at every moment a gauge crosses a flood stage.
  // `pausedAt` remembers where we last stopped, so pressing Play moves on instead of
  // stopping again on the same moment.
  const pausedAt = useRef(-1);
  useEffect(() => {
    if (!playing) return;
    const atMilestone = pauseAtMilestones && MILESTONE_TIMES.has(time) && pausedAt.current !== step;
    if (step >= LAST_STEP || atMilestone) {
      pausedAt.current = step;
      setPlaying(false);
    }
  }, [playing, step, time, pauseAtMilestones]);

  function togglePlay() {
    if (!playing && step >= LAST_STEP) setStep(0);
    if (!playing) pausedAt.current = step;
    setPlaying(!playing);
  }

  function jumpTo(t: number) {
    setPlaying(false);
    setStep(Math.round((t - HARVEY_START) / STEP_MS));
  }

  const route = routeState.outcome?.kind === "ok" ? routeState.outcome.route.coords : null;
  const timeLabel = formatDayTime(time);

  return (
    <>
      <h1 className="page-title">Harvey Replay</h1>
      <p className="lede">
        The real water levels from both Brays Bayou gauges during Hurricane Harvey, August 25 to
        September 2, 2017, played through the same code the live app runs today.
      </p>

      <section className="card replay-controls" aria-label="Replay controls">
        <p className="replay-time" aria-live="off">
          {timeLabel}, 2017
        </p>
        <div className="slider-wrap">
          <input
            type="range"
            min={0}
            max={LAST_STEP}
            step={1}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
            }}
            aria-label="Replay time"
            aria-valuetext={timeLabel}
          />
          <div className="slider-marks" aria-hidden="true">
            {MILESTONES.map((m) => (
              <span
                key={`${m.gaugeId}-${m.level}`}
                className="slider-mark"
                style={{
                  left: `${((m.time - HARVEY_START) / (HARVEY_END - HARVEY_START)) * 100}%`,
                  background: RISK_STYLE[m.level].bg,
                  borderColor: RISK_STYLE[m.level].outline,
                }}
              />
            ))}
          </div>
          <div className="slider-ends fine" aria-hidden="true">
            <span>Aug 25</span>
            <span>Sep 2</span>
          </div>
        </div>
        <div className="replay-buttons">
          <button type="button" className="btn btn-primary" onClick={togglePlay}>
            {playing ? "Pause" : step >= LAST_STEP ? "Replay from start" : "Play"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => jumpTo(HARVEY_START + BEFORE_THE_FLOOD * STEP_MS)}>
            Jump to Aug 26, 6 PM
          </button>
          <label className="inline-field">
            <span>Speed</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={pauseAtMilestones}
              onChange={(e) => setPauseAtMilestones(e.target.checked)}
            />
            <span>Pause at each warning</span>
          </label>
        </div>
      </section>

      <StatusBanner statuses={statuses} note={`Replay · ${timeLabel}, 2017`} />

      <button
        type="button"
        className="get-me-out"
        aria-expanded={routeOpen}
        onClick={() => {
          setPlaying(false);
          setRouteOpen(true);
          requestAnimationFrame(() =>
            panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }}
      >
        Get Me Out <span className="get-me-out-sub">at this moment in Harvey</span>
      </button>
      <div ref={panelRef}>
        {routeOpen && (
          <RoutePanel
            zones={zones}
            onChange={setRouteState}
            note={`Avoiding the flood zones from ${timeLabel}, 2017. Routes use today's roads.`}
          />
        )}
      </div>

      <MapView
        statuses={statuses}
        zones={zones}
        route={route}
        start={routeState.start}
        end={routeState.end}
      />

      <div className="gauge-grid">
        {statuses.map((s) => (
          <GaugeCard key={s.gauge.id} status={s} />
        ))}
      </div>

      <WarningResult />

      <section className="card" aria-labelledby="milestones-title">
        <h2 id="milestones-title">When each gauge crossed a flood stage</h2>
        <ol className="milestones">
          {MILESTONES.map((m) => (
            <li key={`${m.gaugeId}-${m.level}`}>
              <RiskBadge level={m.level} />
              <span className="milestone-text">
                <strong>{gaugeById(m.gaugeId)?.shortName}</strong> · {formatDayTime(m.time)}
              </span>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => jumpTo(m.time)}>
                Jump
              </button>
            </li>
          ))}
        </ol>
        <p className="fine">
          The Gessner gauge sent no readings from 11:30 PM on Aug 26 until midnight on Aug 28,
          right at the peak. TurnAround keeps its last dangerous reading on the map (marked "last
          known") instead of treating the silence as safe.
        </p>
      </section>
    </>
  );
}

function WarningResult() {
  const first = WARNINGS[0]?.firstAlert;
  const firstGauge = MILESTONES.find((m) => m.level === "atRisk");
  return (
    <section className="card warning-result" aria-labelledby="warning-title">
      <h2 id="warning-title">
        <RiskIcon level="atRisk" size={26} /> How much warning would TurnAround have given?
      </h2>
      {first !== undefined && firstGauge && (
        <p>
          First alert: <strong>{formatDayTime(first)}</strong>, when the{" "}
          {gaugeById(firstGauge.gaugeId)?.shortName} gauge reached action stage.
        </p>
      )}
      <ul className="warning-list">
        {WARNINGS.map((w) => {
          const g = gaugeById(w.gaugeId)!;
          return (
            <li key={w.gaugeId}>
              <strong>{g.shortName}</strong> reached flood stage{" "}
              {w.flood !== null ? formatDayTime(w.flood) : "(never)"}.{" "}
              {w.appLeadMin !== null && (
                <>
                  Warning before flooding: <strong className="big-number">{formatDuration(w.appLeadMin)}</strong>
                  {w.ownLeadMin !== null && w.ownLeadMin !== w.appLeadMin && (
                    <> ({formatDuration(w.ownLeadMin)} from its own gauge; the upstream Gessner gauge raised the alarm first)</>
                  )}
                  .
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p>
        The honest lesson: once Brays Bayou starts to rise, it rises fast. At S Main St it climbed
        more than 12 feet in one hour. A gauge alone can't give hours of notice, which is why TurnAround
        also shows the rain forecast, and why it plans the way out for you instead of leaving you
        to find it by trial and error in the dark.
      </p>
    </section>
  );
}
