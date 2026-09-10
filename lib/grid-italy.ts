import { ALL_STATIONS, haversine, inMassaBbox } from "./stations";
import { ITALY_NAMED_SITES } from "./sites-italy";
import { classifyTree, habitatFromTree } from "./trees";
import type { Aspect, Habitat, Site, TreeKind } from "./types";

const TREE_SHORT: Record<TreeKind, string> = {
  castagno: "castagno",
  faggio: "faggio",
  abete: "abete",
  pino: "pino",
  roverella: "roverella",
  leccio: "leccio",
  cerro: "cerro",
  misto: "misto",
  macchia: "macchia",
  pascolo: "prato",
};

type Place = { region: string; province: string; south: number; north: number; west: number; east: number };

const PLACES: Place[] = [
  { region: "Valle d'Aosta", province: "Aosta", south: 45.65, north: 46.0, west: 6.8, east: 7.95 },
  { region: "Piemonte", province: "Torino", south: 44.7, north: 45.55, west: 6.7, east: 8.0 },
  { region: "Piemonte", province: "Cuneo", south: 44.0, north: 44.7, west: 6.8, east: 8.4 },
  { region: "Piemonte", province: "Verbano-Cusio-Ossola", south: 45.7, north: 46.5, west: 7.9, east: 8.7 },
  { region: "Piemonte", province: "Biella", south: 45.45, north: 45.75, west: 7.8, east: 8.3 },
  { region: "Lombardia", province: "Sondrio", south: 46.05, north: 46.65, west: 9.15, east: 10.55 },
  { region: "Lombardia", province: "Bergamo", south: 45.7, north: 46.15, west: 9.35, east: 10.25 },
  { region: "Lombardia", province: "Brescia", south: 45.55, north: 46.3, west: 10.0, east: 10.75 },
  { region: "Lombardia", province: "Pavia", south: 44.65, north: 45.05, west: 8.9, east: 9.5 },
  { region: "Lombardia", province: "Varese", south: 45.75, north: 46.1, west: 8.55, east: 8.95 },
  { region: "Lombardia", province: "Como", south: 45.85, north: 46.15, west: 8.95, east: 9.4 },
  { region: "Trentino-Alto Adige", province: "Trento", south: 45.7, north: 46.55, west: 10.45, east: 12.0 },
  { region: "Trentino-Alto Adige", province: "Bolzano", south: 46.35, north: 47.1, west: 10.4, east: 12.5 },
  { region: "Veneto", province: "Belluno", south: 46.0, north: 46.7, west: 11.7, east: 12.8 },
  { region: "Veneto", province: "Vicenza", south: 45.65, north: 46.05, west: 11.1, east: 11.8 },
  { region: "Veneto", province: "Verona", south: 45.5, north: 45.9, west: 10.6, east: 11.2 },
  { region: "Friuli-Venezia Giulia", province: "Udine", south: 46.1, north: 46.7, west: 12.5, east: 13.7 },
  { region: "Friuli-Venezia Giulia", province: "Pordenone", south: 46.05, north: 46.4, west: 12.3, east: 12.75 },
  { region: "Liguria", province: "Genova", south: 44.25, north: 44.6, west: 8.7, east: 9.55 },
  { region: "Liguria", province: "Savona", south: 44.05, north: 44.45, west: 8.0, east: 8.7 },
  { region: "Liguria", province: "Imperia", south: 43.85, north: 44.2, west: 7.5, east: 8.05 },
  { region: "Liguria", province: "La Spezia", south: 44.1, north: 44.4, west: 9.5, east: 9.95 },
  { region: "Emilia-Romagna", province: "Parma", south: 44.35, north: 44.8, west: 9.4, east: 10.25 },
  { region: "Emilia-Romagna", province: "Reggio Emilia", south: 44.3, north: 44.5, west: 10.2, east: 10.55 },
  { region: "Emilia-Romagna", province: "Modena", south: 44.1, north: 44.4, west: 10.45, east: 11.0 },
  { region: "Emilia-Romagna", province: "Bologna", south: 44.05, north: 44.3, west: 10.8, east: 11.45 },
  { region: "Emilia-Romagna", province: "Forlì-Cesena", south: 43.8, north: 44.1, west: 11.6, east: 12.05 },
  { region: "Toscana", province: "Pistoia", south: 43.95, north: 44.2, west: 10.55, east: 11.0 },
  { region: "Toscana", province: "Firenze", south: 43.65, north: 44.1, west: 11.15, east: 11.7 },
  { region: "Toscana", province: "Arezzo", south: 43.6, north: 43.95, west: 11.65, east: 12.1 },
  { region: "Toscana", province: "Siena", south: 43.15, north: 43.55, west: 11.05, east: 11.55 },
  { region: "Toscana", province: "Grosseto", south: 42.7, north: 43.2, west: 10.75, east: 11.8 },
  { region: "Toscana", province: "Lucca", south: 43.95, north: 44.2, west: 10.25, east: 10.55 },
  { region: "Umbria", province: "Perugia", south: 42.55, north: 43.55, west: 12.1, east: 13.0 },
  { region: "Marche", province: "Pesaro e Urbino", south: 43.4, north: 43.9, west: 12.3, east: 12.85 },
  { region: "Marche", province: "Macerata", south: 42.85, north: 43.4, west: 12.85, east: 13.4 },
  { region: "Marche", province: "Ascoli Piceno", south: 42.7, north: 42.95, west: 13.2, east: 13.55 },
  { region: "Lazio", province: "Rieti", south: 42.15, north: 42.75, west: 12.7, east: 13.4 },
  { region: "Lazio", province: "Roma", south: 41.7, north: 42.15, west: 12.6, east: 13.4 },
  { region: "Lazio", province: "Frosinone", south: 41.45, north: 41.9, west: 13.05, east: 13.65 },
  { region: "Lazio", province: "Latina", south: 41.2, north: 41.65, west: 13.05, east: 13.7 },
  { region: "Lazio", province: "Viterbo", south: 42.1, north: 42.6, west: 11.65, east: 12.4 },
  { region: "Abruzzo", province: "L'Aquila", south: 41.7, north: 42.6, west: 13.2, east: 14.05 },
  { region: "Abruzzo", province: "Pescara", south: 42.05, north: 42.3, west: 13.95, east: 14.25 },
  { region: "Abruzzo", province: "Teramo", south: 42.5, north: 42.8, west: 13.4, east: 13.75 },
  { region: "Molise", province: "Isernia", south: 41.55, north: 41.95, west: 14.05, east: 14.45 },
  { region: "Campania", province: "Caserta", south: 41.25, north: 41.55, west: 14.2, east: 14.55 },
  { region: "Campania", province: "Avellino", south: 40.75, north: 41.05, west: 14.75, east: 15.2 },
  { region: "Campania", province: "Salerno", south: 40.2, north: 40.6, west: 15.1, east: 15.65 },
  { region: "Puglia", province: "Foggia", south: 41.15, north: 41.95, west: 14.9, east: 16.2 },
  { region: "Puglia", province: "Bari", south: 40.7, north: 41.0, west: 16.3, east: 17.0 },
  { region: "Puglia", province: "Taranto", south: 40.55, north: 40.8, west: 17.1, east: 17.7 },
  { region: "Basilicata", province: "Potenza", south: 39.9, north: 40.65, west: 15.55, east: 16.35 },
  { region: "Calabria", province: "Cosenza", south: 39.0, north: 40.0, west: 15.85, east: 16.85 },
  { region: "Calabria", province: "Catanzaro", south: 38.85, north: 39.25, west: 16.25, east: 16.7 },
  { region: "Calabria", province: "Reggio Calabria", south: 38.0, north: 38.4, west: 15.7, east: 16.15 },
  { region: "Sicilia", province: "Catania", south: 37.55, north: 37.95, west: 14.8, east: 15.2 },
  { region: "Sicilia", province: "Messina", south: 37.75, north: 38.1, west: 14.3, east: 15.0 },
  { region: "Sicilia", province: "Palermo", south: 37.75, north: 38.05, west: 13.3, east: 14.15 },
  { region: "Sicilia", province: "Trapani", south: 36.7, north: 38.1, west: 12.0, east: 12.85 },
  { region: "Sardegna", province: "Nuoro", south: 39.8, north: 40.4, west: 9.05, east: 9.7 },
  { region: "Sardegna", province: "Sassari", south: 40.5, north: 41.05, west: 8.9, east: 9.75 },
  { region: "Sardegna", province: "Sud Sardegna", south: 39.2, north: 39.55, west: 8.35, east: 9.45 },
];

const ELEV_HASH = 0.32;
const NAMED_HASH = 0.05;

function inferPlace(lat: number, lon: number): { region: string; province: string } {
  for (const box of PLACES) {
    if (lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east) {
      return { region: box.region, province: box.province };
    }
  }
  return { region: "Italia", province: "Appennino" };
}

function bucketKey(lat: number, lon: number, step: number) {
  return `${Math.round(lat / step)}:${Math.round(lon / step)}`;
}

function indexByHash<T extends { lat: number; lon: number }>(items: T[], step: number) {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = bucketKey(item.lat, item.lon, step);
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return buckets;
}

function nearby<T extends { lat: number; lon: number }>(
  buckets: Map<string, T[]>,
  lat: number,
  lon: number,
  step: number,
): T[] {
  const gi = Math.round(lat / step);
  const gj = Math.round(lon / step);
  const out: T[] = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const list = buckets.get(`${gi + di}:${gj + dj}`);
      if (list) out.push(...list);
    }
  }
  return out;
}

const stationIndex = indexByHash(ALL_STATIONS, ELEV_HASH);

function interpolateElevation(lat: number, lon: number): number {
  const samples = nearby(stationIndex, lat, lon, ELEV_HASH);
  const pool = samples.length > 0 ? samples : ALL_STATIONS;
  let weight = 0;
  let acc = 0;
  for (const sample of pool) {
    const d = haversine(lat, lon, sample.lat, sample.lon);
    const w = 1 / Math.max(d, 0.12) ** 2;
    acc += sample.elevationM * w;
    weight += w;
  }
  return weight === 0 ? 800 : acc / weight;
}

function aspectFromOffset(dLat: number, dLon: number): Aspect {
  if (Math.abs(dLat) >= Math.abs(dLon)) return dLat >= 0 ? "N" : "S";
  return dLon >= 0 ? "E" : "W";
}

function habitatAt(parent: Site, elevationM: number): Habitat {
  if (elevationM >= 1500) return "pascolo";
  if (elevationM >= 1100) return parent.habitat === "conifera" ? "conifera" : "faggio";
  if (elevationM >= 900) return parent.habitat === "conifera" ? "conifera" : "faggio";
  if (elevationM < 220) {
    return parent.habitat === "macchia" || parent.habitat === "quercia" ? "macchia" : parent.habitat;
  }
  if (elevationM < 480 && parent.habitat === "faggio") return "castagno";
  return parent.habitat;
}

function namedFromStations(woods: Site[]): Site[] {
  const extra: Site[] = [];
  for (const station of ALL_STATIONS) {
    if (station.size !== "piccola") continue;
    if (station.elevationM < 180 || station.elevationM > 1850) continue;
    if (inMassaBbox(station.lat, station.lon)) continue;
    if (woods.some((wood) => haversine(station.lat, station.lon, wood.lat, wood.lon) < 8)) continue;
    const treeKind = classifyTree({
      lat: station.lat,
      lon: station.lon,
      elevationM: station.elevationM,
    });
    const place = inferPlace(station.lat, station.lon);
    extra.push({
      id: `itw-${station.id}`,
      name: station.name,
      region: place.region,
      province: place.province,
      comune: station.name,
      lat: station.lat,
      lon: station.lon,
      habitat: habitatFromTree(treeKind),
      treeKind,
      aspect: "E",
      edge: false,
      local: false,
      kind: "named",
      hotspot: "italia",
      elevationM: station.elevationM,
    });
  }
  return extra;
}

let cachedFill: Site[] | null = null;

/** Griglia di versanti e orli intorno a ogni bosco italiano, come a Massa. */
export function buildItalyWoods(namedWoods: Site[] = ITALY_NAMED_SITES): Site[] {
  if (cachedFill) return cachedFill;

  const extraNamed = namedFromStations(namedWoods);
  const named = [...namedWoods, ...extraNamed];
  const namedIndex = indexByHash(named, NAMED_HASH);
  const grid: Site[] = [];
  const seen = new Set<string>();
  const latStep = 0.014;
  const lonStep = 0.018;

  for (const parent of named) {
    const dense = !parent.id.startsWith("itw-");
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        if (row === 0 && col === 0) continue;
        const ring = Math.max(Math.abs(row), Math.abs(col));
        if (!dense && ring === 2) continue;
        const lat = Math.round((parent.lat + row * latStep) * 10000) / 10000;
        const lon = Math.round((parent.lon + col * lonStep) * 10000) / 10000;
        if (inMassaBbox(lat, lon)) continue;
        const toParent = haversine(lat, lon, parent.lat, parent.lon);
        if (toParent < 0.75) continue;
        const nearer = nearby(namedIndex, lat, lon, NAMED_HASH).some(
          (other) => other.id !== parent.id && haversine(lat, lon, other.lat, other.lon) < toParent,
        );
        if (nearer) continue;
        const elevationM = Math.round(interpolateElevation(lat, lon));
        if (elevationM < 90 || elevationM > 1950) continue;
        if (elevationM < 160 && lat > 44.2 && lon > 8.5 && lon < 13.5) continue;
        const habitat = habitatAt(parent, elevationM);
        const treeKind = classifyTree({ lat, lon, elevationM, habitat });
        const manhattan = Math.abs(row) + Math.abs(col);
        const edge = ring >= 2 || (!dense && manhattan === 2) || habitat === "pascolo";
        const id = `itg-${lat.toFixed(4)}-${lon.toFixed(4)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        grid.push({
          id,
          name: `${edge ? "Frangente" : "Bosco"} ${TREE_SHORT[treeKind]} ${elevationM} m`,
          region: parent.region,
          province: parent.province,
          comune: parent.comune ?? parent.name,
          lat,
          lon,
          habitat: habitatFromTree(treeKind),
          treeKind,
          aspect: aspectFromOffset(row * latStep, col * lonStep),
          edge,
          local: false,
          kind: "grid",
          hotspot: "italia",
          parentId: parent.id,
          elevationM,
        });
      }
    }
  }

  cachedFill = [...extraNamed, ...grid];
  return cachedFill;
}
