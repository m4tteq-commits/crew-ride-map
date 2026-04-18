// Geo helpers — haversine distance, speed bucket.

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type SpeedLevel = "idle" | "low" | "mid" | "high";

export function speedLevel(kmh: number | null | undefined): SpeedLevel {
  if (kmh == null || kmh < 5) return "idle";
  if (kmh < 60) return "low";
  if (kmh < 110) return "mid";
  return "high";
}

export function speedColorClass(level: SpeedLevel): string {
  switch (level) {
    case "low": return "text-speed-low";
    case "mid": return "text-speed-mid";
    case "high": return "text-speed-high";
    default: return "text-speed-idle";
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)} min`;
}
