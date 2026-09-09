import { haversine } from "./stations";
import { MASSA_SITES } from "./sites-massa";
import { classifyTree, habitatFromTree, inParianaPasquilio } from "./trees";
import type { Aspect, Site, TreeKind } from "./types";

export const PARIANA_BOX = {
  south: 44.016,
  north: 44.086,
  west: 10.145,
  east: 10.248,
};

const FRINGE: { dLat: number; dLon: number; dir: string; aspect: Aspect }[] = [
  { dLat: 0.005, dLon: 0, dir: "N", aspect: "N" },
  { dLat: -0.005, dLon: 0, dir: "S", aspect: "S" },
  { dLat: 0, dLon: 0.0065, dir: "E", aspect: "E" },
  { dLat: 0, dLon: -0.0065, dir: "W", aspect: "W" },
  { dLat: 0.0042, dLon: 0.0055, dir: "NE", aspect: "N" },
  { dLat: 0.0042, dLon: -0.0055, dir: "NW", aspect: "N" },
  { dLat: -0.0042, dLon: 0.0055, dir: "SE", aspect: "S" },
  { dLat: -0.0042, dLon: -0.0055, dir: "SW", aspect: "S" },
];

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

async function fetchElevations(lats: number[], lons: number[]): Promise<number[]> {
  const params = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Elevation ${response.status}`);
  const payload = (await response.json()) as { elevation?: number[] };
  return payload.elevation ?? lats.map(() => 0);
}

function interpolate(
  lat: number,
  lon: number,
  samples: { lat: number; lon: number; elevationM: number }[],
) {
  let weight = 0;
  let acc = 0;
  for (const sample of samples) {
    const d = haversine(lat, lon, sample.lat, sample.lon);
    const w = 1 / Math.max(d, 0.05) ** 2;
    acc += sample.elevationM * w;
    weight += w;
  }
  return weight === 0 ? 0 : acc / weight;
}

function guessComune(lat: number, lon: number): string {
  if (lat <= 44.034 && lon >= 10.168) return "Montignoso";
  return "Massa";
}

export async function buildParianaPasquilioHotspot(): Promise<Site[]> {
  const { south, north, west, east } = PARIANA_BOX;
  const dem: { lat: number; lon: number }[] = [];
  for (let lat = south; lat <= north; lat += 0.008) {
    for (let lon = west; lon <= east; lon += 0.01) {
      dem.push({ lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 });
    }
  }
  let samples: { lat: number; lon: number; elevationM: number }[] = [];
  try {
    const elevations = await fetchElevations(
      dem.map((c) => c.lat),
      dem.map((c) => c.lon),
    );
    samples = dem.map((coord, index) => ({
      ...coord,
      elevationM: elevations[index] ?? 0,
    }));
  } catch {
    samples = [];
  }

  const named = MASSA_SITES.filter((row) => inParianaPasquilio(row[3], row[4])).map((row) => ({
    lat: row[3],
    lon: row[4],
  }));
  const sites: Site[] = [];
  const rows = 22;
  const cols = 18;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = Math.round((south + ((north - south) * r) / (rows - 1)) * 10000) / 10000;
      const lon = Math.round((west + ((east - west) * c) / (cols - 1)) * 10000) / 10000;
      const elevationM = samples.length
        ? Math.round(interpolate(lat, lon, samples))
        : Math.round(180 + (lat - south) * 9000 + (lon - west) * 2500);
      if (elevationM < 140 || elevationM > 1350) continue;
      if (named.some((n) => haversine(lat, lon, n.lat, n.lon) < 0.09)) continue;
      const treeKind = classifyTree({ lat, lon, elevationM });
      const habitat = habitatFromTree(treeKind);
      const aspect: Aspect = lon >= 10.2 ? "E" : lat < 44.04 ? "S" : "E";
      const edge =
        habitat === "pascolo" ||
        (elevationM >= 280 && elevationM <= 820 && (r + c) % 3 === 0);
      sites.push({
        id: `hs-pp-${lat.toFixed(4)}-${lon.toFixed(4)}`,
        name: `${edge ? "Frangente" : "Bosco"} ${TREE_SHORT[treeKind]} ${elevationM} m`,
        region: "Toscana",
        province: "Massa-Carrara",
        comune: guessComune(lat, lon),
        lat,
        lon,
        habitat,
        treeKind,
        area: lat >= 44.04 && lon >= 10.2 ? "apuane" : "colline",
        aspect,
        edge,
        local: true,
        kind: "hotspot",
        hotspot: "pariana-pasquilio",
      });
    }
  }
  return sites;
}

export function buildItalyFragments(named: Site[]): Site[] {
  const out: Site[] = [];
  for (const site of named) {
    for (const fringe of FRINGE) {
      const lat = Math.round((site.lat + fringe.dLat) * 10000) / 10000;
      const lon = Math.round((site.lon + fringe.dLon) * 10000) / 10000;
      const treeKind = classifyTree({
        lat,
        lon,
        habitat: site.habitat,
      });
      out.push({
        id: `hs-it-${site.id}-${fringe.dir.toLowerCase()}`,
        name: `${site.name} · frangente ${fringe.dir}`,
        region: site.region,
        province: site.province,
        comune: site.comune,
        lat,
        lon,
        habitat: site.habitat,
        treeKind,
        area: site.area,
        aspect: fringe.aspect,
        edge: true,
        local: false,
        kind: "hotspot",
        hotspot: "italia",
      });
    }
  }
  return out;
}

export function withTreeKinds(sites: Site[], elevationById?: Map<string, number>): Site[] {
  return sites.map((site) => {
    if (site.treeKind) return site;
    return {
      ...site,
      treeKind: classifyTree({
        lat: site.lat,
        lon: site.lon,
        habitat: site.habitat,
        elevationM: elevationById?.get(site.id),
      }),
    };
  });
}

export function isParianaSite(site: Site) {
  return site.hotspot === "pariana-pasquilio" || inParianaPasquilio(site.lat, site.lon);
}
