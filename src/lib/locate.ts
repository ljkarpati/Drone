// Finding where you are, as fast as the phone allows.
//
// The first time, iPhone asks "Allow TurnAround to use your location?" and nothing can skip
// that. After someone says yes, we ask for the location quietly as soon as the page opens, so
// when they tap Get Me Out it's usually already there.

import type { Place } from "./routing";

const FRESH_MS = 2 * 60_000; // a location from the last 2 minutes is good enough
let cached: { place: Place; at: number } | null = null;

function ask(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place = { label: "Your location", lon: pos.coords.longitude, lat: pos.coords.latitude };
        cached = { place, at: Date.now() };
        resolve(place);
      },
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

/** Your location: the recent one if we have it, otherwise ask the phone. */
export function locate(): Promise<Place> {
  if (cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.place);
  return ask();
}

/** If you already allowed location for this site, start finding you in the background. */
export async function prefetchLocation(): Promise<void> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (status?.state === "granted") await ask();
  } catch {
    // Not supported or failed: no problem, we'll ask when they tap the button.
  }
}
