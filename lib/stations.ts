import type { LocalStation, StationObservation, StationSize } from "./types";
import { ITALY_ASOS } from "./stations-asos";
import { SMALL_STATIONS } from "./stations-small";
import { ITALY_RIDGE_STATIONS } from "./stations-small-italy";
import { HOME } from "./geo";

export type { LocalStation };
export { ITALY_ASOS } from "./stations-asos";
export { SMALL_STATIONS } from "./stations-small";
export { ITALY_RIDGE_STATIONS } from "./stations-small-italy";

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Tiene Massa densa; sul resto d'Italia non accosta due nodi piccoli a meno di 8 km. */
export function thinByDistance(
  candidates: LocalStation[],
  existing: LocalStation[],
  minKm: number,
): LocalStation[] {
  const kept = [...existing];
  const added: LocalStation[] = [];
  for (const candidate of candidates) {
    if (kept.some((row) => haversine(row.lat, row.lon, candidate.lat, candidate.lon) < minKm)) {
      continue;
    }
    kept.push(candidate);
    added.push(candidate);
  }
  return added;
}

const ITALY_SMALL = thinByDistance(ITALY_RIDGE_STATIONS, SMALL_STATIONS, 8);

function mergeStations(): LocalStation[] {
  const out: LocalStation[] = [];
  const seen = new Set<string>();
  for (const station of [...ITALY_ASOS, ...SMALL_STATIONS, ...ITALY_SMALL]) {
    const key = station.icao ?? station.id;
    if (seen.has(key) || seen.has(station.id)) continue;
    seen.add(key);
    seen.add(station.id);
    out.push(station);
  }
  return out;
}

export const ALL_STATIONS: LocalStation[] = mergeStations();

export function mergeCatalogWithObservations(
  observed: StationObservation[] | undefined,
): StationObservation[] {
  const byId = new Map((observed ?? []).map((row) => [row.id, row]));
  const out: StationObservation[] = ALL_STATIONS.map((station) => {
    const hit = byId.get(station.id);
    if (hit) {
      byId.delete(station.id);
      return {
        ...hit,
        name: station.name,
        network: station.network,
        lat: station.lat,
        lon: station.lon,
        elevationM: station.elevationM,
        size: station.size,
      };
    }
    return {
      id: station.id,
      name: station.name,
      network: station.network,
      lat: station.lat,
      lon: station.lon,
      elevationM: station.elevationM,
      distanceKm: Math.round(haversine(HOME.lat, HOME.lon, station.lat, station.lon) * 10) / 10,
      size: station.size,
      precip7dMm: null,
      windMaxKmh: null,
      humidity: null,
      tempC: null,
      updatedAt: null,
    };
  });
  for (const leftover of byId.values()) out.push(leftover);
  return out;
}

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

export function inMassaBbox(lat: number, lon: number) {
  return lat >= 43.95 && lat <= 44.52 && lon >= 9.62 && lon <= 10.38;
}
