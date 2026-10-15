// React hooks that load live data and keep it fresh.

import { useEffect, useState } from "react";
import { GAUGES } from "./data/gauges";
import { fetchGaugeSeries } from "./lib/nwps";
import type { Reading } from "./lib/readings";
import { loadLocal, saveLocal } from "./lib/storage";
import { fetchRainOutlook, type RainOutlook } from "./lib/weather";

/** The current time, updated every `everyMs` so "12 min ago" and staleness stay correct. */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

type SavedReadings = { savedAt: number; seriesById: Record<string, Reading[]> };

export type LiveGauges = {
  seriesById: Record<string, Reading[]>;
  loading: boolean; // true until the first attempt finishes
  failedIds: string[]; // gauges we couldn't refresh on the last try
  savedAt: number | null; // when the readings we're showing were downloaded
  fromCache: boolean; // true if any gauge is showing saved (not freshly downloaded) readings
};

const REFRESH_MS = 5 * 60_000;

/**
 * Downloads every gauge's recent readings now and every 5 minutes after.
 * Each success is saved on the phone. If a download fails (no signal, NOAA down),
 * we fall back to the saved readings, and the app says so.
 */
export function useLiveGauges(): LiveGauges {
  const [state, setState] = useState<LiveGauges>(() => {
    const saved = loadLocal<SavedReadings>("readings");
    return {
      seriesById: saved?.seriesById ?? {},
      loading: true,
      failedIds: [],
      savedAt: saved?.savedAt ?? null,
      fromCache: Boolean(saved),
    };
  });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const results = await Promise.allSettled(GAUGES.map((g) => fetchGaugeSeries(g.id)));
      if (cancelled) return;
      const saved = loadLocal<SavedReadings>("readings");
      const seriesById: Record<string, Reading[]> = {};
      const failedIds: string[] = [];
      results.forEach((result, i) => {
        const id = GAUGES[i].id;
        if (result.status === "fulfilled") seriesById[id] = result.value;
        else {
          failedIds.push(id);
          if (saved?.seriesById[id]) seriesById[id] = saved.seriesById[id];
        }
      });
      const anySuccess = failedIds.length < GAUGES.length;
      if (anySuccess) saveLocal<SavedReadings>("readings", { savedAt: Date.now(), seriesById });
      setState({
        seriesById,
        loading: false,
        failedIds,
        savedAt: anySuccess ? Date.now() : (saved?.savedAt ?? null),
        fromCache: failedIds.some((id) => seriesById[id]),
      });
    }

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("online", refresh);
    };
  }, []);

  return state;
}

export type RainState = {
  outlook: RainOutlook | null;
  loading: boolean;
  error: boolean;
  savedAt: number | null;
};

/** The NWS rain outlook, refreshed every 30 minutes, with the last one saved for offline use. */
export function useRainOutlook(): RainState {
  const [state, setState] = useState<RainState>(() => {
    const saved = loadLocal<{ savedAt: number; outlook: RainOutlook }>("rain");
    return {
      outlook: saved?.outlook ?? null,
      loading: true,
      error: false,
      savedAt: saved?.savedAt ?? null,
    };
  });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const outlook = await fetchRainOutlook();
        if (cancelled) return;
        const savedAt = Date.now();
        saveLocal("rain", { savedAt, outlook });
        setState({ outlook, loading: false, error: false, savedAt });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
      }
    }
    refresh();
    const id = setInterval(refresh, 30 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

/** Test mode is on while developing, or on the live site when the address ends in ?test=1. */
export function testModeAllowed(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has("test");
}
