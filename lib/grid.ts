import { haversine } from "./stations";
import { MASSA_SITES } from "./sites-massa";
import { classifyTree, habitatFromTree } from "./trees";
import type { Aspect, Habitat, Site } from "./types";
import type { AreaId } from "./geo";

const SOUTH = 44.005;
const NORTH = 44.48;
const WEST = 9.7;
const EAST = 10.31;
const LAT_STEP = 0.016;
const LON_STEP = 0.02;
const DEM_STEP = 0.062;

function inferHabitat(lat: number, lon: number, elevationM: number): Habitat {
  if (elevationM >= 1450) return "pascolo";
  if (elevationM >= 900) return "faggio";
  if (lat > 44.22 && lon < 9.95 && elevationM >= 700) return "faggio";
  if (elevationM >= 500) return "castagno";
  if (elevationM >= 280) return "misto";
  if (lon < 10.05 && lat < 44.08) return "macchia";
  return "misto";
}

function inferArea(lat: number, lon: number, elevationM: number): AreaId {
  if (lat >= 44.28 && (lon <= 9.96 || elevationM >= 1000)) return "appennino";
  if (lon >= 10.1 && lat <= 44.22 && elevationM >= 350) return "apuane";
  if (lat >= 44.18 && lon <= 10.22) return "lunigiana";
  return "colline";
}

function inferAspect(lat: number, lon: number): Aspect {
  if (lon >= 10.14 && lat >= 44.1 && lat <= 44.18) return "N";
  if (lat < 44.08 && lon >= 10.1) return "S";
  if (lon <= 9.95) return "W";
  return "E";
}

function comuneGuess(area: AreaId): string {
  if (area === "apuane") return "Alpi Apuane";
  if (area === "appennino") return "Appennino";
  if (area === "lunigiana") return "Lunigiana";
  return "Massa-Carrara";
}

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
    const w = 1 / Math.max(d, 0.08) ** 2;
    acc += sample.elevationM * w;
    weight += w;
  }
  return weight === 0 ? 0 : acc / weight;
}

export async function buildLocalGrid(): Promise<Site[]> {
  const dem: { lat: number; lon: number }[] = [];
  for (let lat = SOUTH; lat <= NORTH; lat += DEM_STEP) {
    for (let lon = WEST; lon <= EAST; lon += DEM_STEP) {
      dem.push({ lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 });
    }
  }
  const elevations = await fetchElevations(
    dem.map((c) => c.lat),
    dem.map((c) => c.lon),
  );
  const samples = dem.map((coord, index) => ({
    ...coord,
    elevationM: elevations[index] ?? 0,
  }));

  const named = MASSA_SITES.map((row) => ({ lat: row[3], lon: row[4] }));
  const sites: Site[] = [];

  for (let lat = SOUTH; lat <= NORTH; lat += LAT_STEP) {
    for (let lon = WEST; lon <= EAST; lon += LON_STEP) {
      const clat = Math.round(lat * 1000) / 1000;
      const clon = Math.round(lon * 1000) / 1000;
      const elevationM = Math.round(interpolate(clat, clon, samples));
      if (elevationM < 180 || elevationM > 1850) continue;
      if (clat < 44.055 && clon < 10.08 && elevationM < 140) continue;
      if (named.some((n) => haversine(clat, clon, n.lat, n.lon) < 0.85)) continue;

      const area = inferArea(clat, clon, elevationM);
      const treeKind = classifyTree({ lat: clat, lon: clon, elevationM, habitat: inferHabitat(clat, clon, elevationM) });
      const habitat = habitatFromTree(treeKind);
      const aspect = inferAspect(clat, clon);
      sites.push({
        id: `grid-${clat.toFixed(3)}-${clon.toFixed(3)}`,
        name: `${habitat} ${elevationM} m`,
        region: "Toscana",
        province: "Massa-Carrara",
        comune: comuneGuess(area),
        lat: clat,
        lon: clon,
        habitat,
        treeKind,
        area,
        aspect,
        edge: elevationM >= 280 && elevationM <= 750,
        local: true,
        kind: "grid",
      });
    }
  }

  return sites.filter((_, index) => sites.length <= 520 || index % Math.ceil(sites.length / 480) === 0);
}
