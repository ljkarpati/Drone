// Saves small things on the phone (localStorage) so the app can still show the last known
// readings when there is no signal. localStorage can be missing or blocked (private
// browsing, full storage), so every call is wrapped in try/catch and failures are ignored.

const PREFIX = "turnaround:v1:";

export function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the app still works, it just can't remember.
  }
}

export function loadLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
