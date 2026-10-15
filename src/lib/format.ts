// Turning numbers into words people read at a glance.

const HOUSTON_TZ = "America/Chicago";

export function formatAgo(minutes: number | null): string {
  if (minutes === null) return "no recent reading";
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h ago`;
  return m === 0 ? `${h} h ago` : `${h} h ${m} min ago`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} minutes`;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} h ${m} min`;
}

export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

export function formatDriveTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : formatDuration(minutes);
}

/** "3:45 PM" in Houston time. */
export function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOUSTON_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

/** "Sat, Aug 26, 9:00 PM" in Houston time. */
export function formatDayTime(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOUSTON_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}
