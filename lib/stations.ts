import type { LocalStation, StationObservation, StationSize } from "./types";
import { ITALY_ASOS } from "./stations-asos";
import { SMALL_STATIONS } from "./stations-small";
import { HOME } from "./geo";

export type { LocalStation };
export { ITALY_ASOS } from "./stations-asos";
export { SMALL_STATIONS } from "./stations-small";

function mergeStations(): LocalStation[] {
  const out: LocalStation[] = [];
  const seen = new Set<string>();
  for (const station of [...ITALY_ASOS, ...SMALL_STATIONS]) {
    const key = station.icao ?? station.id;
    if (seen.has(key) || seen.has(station.id)) continue;
    seen.add(key);
    seen.add(station.id);
    out.push(station);
  }
  return out;
}

export const ALL_STATIONS: LocalStation[] = mergeStations();

/** Compat: stazioni usate per il blending sul comprensorio di Massa. */
export const LOCAL_STATIONS: LocalStation[] = ALL_STATIONS.filter(
  (station) =>
    Boolean(station.icao) ||
    haversine(HOME.lat, HOME.lon, station.lat, station.lon) < 95,
);

export function stationSizeOf(station: Pick<StationObservation, "size" | "network" | "id">): StationSize {
  if (station.size) return station.size;
  if (station.network.includes("IEM") || station.network.includes("Militare")) return "grande";
  return "piccola";
}

export function nearestStation(
  lat: number,
  lon: number,
  stations: StationObservation[],
): StationObservation | undefined {
  if (stations.length === 0) return undefined;
  return [...stations].sort(
    (a, b) => haversine(lat, lon, a.lat, a.lon) - haversine(lat, lon, b.lat, b.lon),
  )[0];
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inMassaBbox(lat: number, lon: number) {
  return lat >= 43.95 && lat <= 44.52 && lon >= 9.62 && lon <= 10.38;
}
