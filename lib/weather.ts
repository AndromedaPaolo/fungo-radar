import { fetchIemStations } from "./iem";
import { ALL_STATIONS, haversine, nearestStation } from "./stations";
import { HOME } from "./geo";
import type { DailySeries, Site, SiteWeather, StationObservation } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const BATCH = 20;
const PAST_DAYS = 14;
const FORECAST_DAYS = 7;
const CELL = 0.04;

const DAILY_SOIL =
  "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean";
const HOURLY_SOIL =
  "soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_temperature_0_to_7cm";
const DAILY_LOCAL =
  "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean";

type OpenMeteoLocation = {
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  daily?: Record<string, (number | null)[] | string[]>;
  hourly?: Record<string, (number | null)[] | string[]>;
};

function asLocations(payload: unknown): OpenMeteoLocation[] {
  if (Array.isArray(payload)) return payload as OpenMeteoLocation[];
  if (payload && typeof payload === "object") return [payload as OpenMeteoLocation];
  return [];
}

function nums(values: unknown, length: number): number[] {
  if (!Array.isArray(values)) return Array.from({ length }, () => 0);
  return values.map((value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  });
}

function meanChunk(values: number[], dates: string[]) {
  const buckets = new Map<string, number[]>();
  values.forEach((value, index) => {
    const date = dates[index]?.slice(0, 10);
    if (!date) return;
    const list = buckets.get(date) ?? [];
    list.push(value);
    buckets.set(date, list);
  });
  return (day: string) => {
    const list = buckets.get(day) ?? [];
    if (list.length === 0) return 0;
    return list.reduce((a, b) => a + b, 0) / list.length;
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(28000),
  });
  if (response.status === 429 && attempt < 5) {
    await sleep(1500 * (attempt + 1));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  return response.json();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function cellKey(lat: number, lon: number) {
  const slat = Math.round(lat / CELL) * CELL;
  const slon = Math.round(lon / CELL) * CELL;
  return `${slat.toFixed(3)},${slon.toFixed(3)}`;
}

function parseKey(key: string) {
  const [lat, lon] = key.split(",").map(Number);
  return { lat, lon };
}

function seriesFrom(location: OpenMeteoLocation, mode: "full" | "precip" | "local"): DailySeries {
  const daily = location.daily ?? {};
  const dates = Array.isArray(daily.time) ? daily.time.map(String) : [];
  const n = dates.length;
  const hourlyTimes = Array.isArray(location.hourly?.time)
    ? location.hourly.time.map(String)
    : [];
  const surface = meanChunk(nums(location.hourly?.soil_moisture_0_to_7cm, hourlyTimes.length), hourlyTimes);
  const root = meanChunk(nums(location.hourly?.soil_moisture_7_to_28cm, hourlyTimes.length), hourlyTimes);
  const soilT = meanChunk(nums(location.hourly?.soil_temperature_0_to_7cm, hourlyTimes.length), hourlyTimes);
  const empty = Array.from({ length: n }, () => 0);

  return {
    dates,
    precipMm: nums(daily.precipitation_sum, n),
    precipIconMm: [],
    precipGfsMm: [],
    precipLocalMm: mode === "local" ? nums(daily.precipitation_sum, n) : empty,
    et0Mm: mode === "full" ? nums(daily.et0_fao_evapotranspiration, n) : empty,
    tempMax: mode === "precip" ? empty : nums(daily.temperature_2m_max, n),
    tempMin: mode === "precip" ? empty : nums(daily.temperature_2m_min, n),
    windMaxKmh: mode === "precip" ? empty : nums(daily.wind_speed_10m_max, n),
    humidityMean: mode === "precip" ? empty : nums(daily.relative_humidity_2m_mean, n),
    soilMoistureSurface: mode === "full" ? dates.map((day) => surface(day)) : empty,
    soilMoistureRoot: mode === "full" ? dates.map((day) => root(day)) : empty,
    soilTempC: mode === "full" ? dates.map((day) => soilT(day)) : empty,
  };
}

function agreement(a: number[], b: number[], c: number[]): number {
  const n = Math.min(a.length, b.length, c.length);
  if (n === 0) return 0.5;
  let close = 0;
  for (let i = 0; i < n; i++) {
    const vals = [a[i], b[i], c[i]];
    const mean = (vals[0] + vals[1] + vals[2]) / 3;
    const spread = Math.max(...vals) - Math.min(...vals);
    if (mean < 1 && spread < 2) close += 1;
    else if (spread / Math.max(mean, 1) < 0.45) close += 1;
  }
  return Math.round((close / n) * 100) / 100;
}

function buildUrl(opts: { models?: string; soil?: boolean; local?: boolean }) {
  return (lats: number[], lons: number[]) => {
    const params = new URLSearchParams({
      latitude: lats.join(","),
      longitude: lons.join(","),
      daily: opts.local ? DAILY_LOCAL : opts.soil ? DAILY_SOIL : "precipitation_sum",
      timezone: "Europe/Rome",
      past_days: String(PAST_DAYS),
      forecast_days: String(FORECAST_DAYS),
      wind_speed_unit: "kmh",
    });
    if (opts.soil) params.set("hourly", HOURLY_SOIL);
    if (opts.models) params.set("models", opts.models);
    return `${FORECAST_URL}?${params.toString()}`;
  };
}

export async function fetchAllSiteWeather(
  sites: Site[],
): Promise<{ weathers: SiteWeather[]; stations: StationObservation[] }> {
  const siteCells = new Map<string, { lat: number; lon: number }>();
  for (const site of sites) {
    if (site.hotspot === "italia" && site.kind !== "named") continue;
    const key = cellKey(site.lat, site.lon);
    if (!siteCells.has(key)) siteCells.set(key, parseKey(key));
  }
  const stationOnly = new Map<string, { lat: number; lon: number }>();
  for (const station of ALL_STATIONS) {
    const key = cellKey(station.lat, station.lon);
    if (siteCells.has(key) || stationOnly.has(key)) continue;
    stationOnly.set(key, { lat: station.lat, lon: station.lon });
  }

  const cellWeather = new Map<string, DailySeries & { elevationM: number }>();

  const siteList = [...siteCells.entries()].map(([key, coord]) => ({ key, ...coord }));
  for (const group of chunk(siteList, BATCH)) {
    const lats = group.map((c) => c.lat);
    const lons = group.map((c) => c.lon);
    const best = await fetchJson(buildUrl({ soil: true })(lats, lons));
    await sleep(250);
    const icon = await fetchJson(buildUrl({ models: "icon_seamless" })(lats, lons));
    await sleep(250);
    const local = await fetchJson(
      buildUrl({ models: "italia_meteo_arpae_icon_2i", local: true })(lats, lons),
    ).catch(() => null);
    await sleep(400);
    const bestLocs = asLocations(best);
    const iconLocs = asLocations(icon);
    const localLocs = local ? asLocations(local) : [];

    group.forEach((cell, index) => {
      const primary = bestLocs[index] ?? bestLocs[0];
      if (!primary) return;
      const daily = seriesFrom(primary, "full");
      const iconDaily = iconLocs[index] ? seriesFrom(iconLocs[index], "precip") : daily;
      const localDaily = localLocs[index] ? seriesFrom(localLocs[index], "local") : daily;
      daily.precipIconMm = iconDaily.precipMm;
      daily.precipGfsMm = daily.precipMm;
      daily.precipLocalMm = localDaily.precipMm;
      if (localDaily.windMaxKmh.some((v) => v > 0)) daily.windMaxKmh = localDaily.windMaxKmh;
      if (localDaily.tempMax.some((v) => v > 0)) {
        daily.tempMax = localDaily.tempMax;
        daily.tempMin = localDaily.tempMin;
        daily.humidityMean = localDaily.humidityMean;
      }
      cellWeather.set(cell.key, { ...daily, elevationM: Math.round(primary.elevation ?? 0) });
    });
  }

  const stationList = [...stationOnly.entries()].map(([key, coord]) => ({ key, ...coord }));
  for (const group of chunk(stationList, 40)) {
    const lats = group.map((c) => c.lat);
    const lons = group.map((c) => c.lon);
    const local = await fetchJson(
      buildUrl({ models: "italia_meteo_arpae_icon_2i", local: true })(lats, lons),
    ).catch(() => null);
    await sleep(280);
    if (!local) continue;
    const localLocs = asLocations(local);
    group.forEach((cell, index) => {
      const primary = localLocs[index] ?? localLocs[0];
      if (!primary) return;
      const daily = seriesFrom(primary, "local");
      daily.precipLocalMm = daily.precipMm;
      cellWeather.set(cell.key, { ...daily, elevationM: Math.round(primary.elevation ?? 0) });
    });
  }

  const observations = await fetchIemStations();
  const seen = new Set(observations.map((row) => row.id));
  const todayIndex = 14;
  for (const station of ALL_STATIONS) {
    if (seen.has(station.id)) continue;
    seen.add(station.id);
    const packed = cellWeather.get(cellKey(station.lat, station.lon));
    const precip = packed?.precipLocalMm?.length ? packed.precipLocalMm : packed?.precipMm ?? [];
    const end = Math.min(todayIndex, Math.max(0, precip.length - 1));
    const slice = precip.slice(Math.max(0, end - 6), end + 1);
    const windEnd = Math.min(todayIndex, Math.max(0, (packed?.windMaxKmh.length || 1) - 1));
    const wind = packed?.windMaxKmh?.slice(Math.max(0, windEnd - 2), end + 1) ?? [];
    observations.push({
      id: station.id,
      name: station.name,
      network: station.network,
      lat: station.lat,
      lon: station.lon,
      elevationM: station.elevationM,
      distanceKm: Math.round(haversine(HOME.lat, HOME.lon, station.lat, station.lon) * 10) / 10,
      size: station.size,
      precip7dMm: slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) * 10) / 10 : null,
      windMaxKmh: wind.length ? Math.round(Math.max(...wind)) : null,
      humidity: packed?.humidityMean?.at(end) ?? null,
      tempC: packed?.tempMax?.at(end) ?? null,
      updatedAt: packed?.dates?.at(end) ?? null,
    });
  }

  const packedCoords = [...cellWeather.entries()].map(([key, packed]) => ({
    key,
    lat: parseKey(key).lat,
    lon: parseKey(key).lon,
    packed,
  }));

  function packedNear(lat: number, lon: number) {
    const direct = cellWeather.get(cellKey(lat, lon));
    if (direct) return direct;
    let best = Infinity;
    let hit: (typeof packedCoords)[number]["packed"] | undefined;
    for (const cell of packedCoords) {
      const d = haversine(lat, lon, cell.lat, cell.lon);
      if (d < best) {
        best = d;
        hit = cell.packed;
      }
    }
    return hit;
  }

  const weathers = sites.map((site) => {
    const packed = packedNear(site.lat, site.lon);
    const daily = packed ?? {
      dates: [],
      precipMm: [],
      precipIconMm: [],
      precipGfsMm: [],
      precipLocalMm: [],
      et0Mm: [],
      tempMax: [],
      tempMin: [],
      windMaxKmh: [],
      humidityMean: [],
      soilMoistureSurface: [],
      soilMoistureRoot: [],
      soilTempC: [],
    };
    const station = nearestStation(site.lat, site.lon, observations);
    const stationCopy = station
      ? {
          ...station,
          distanceKm: Math.round(haversine(site.lat, site.lon, station.lat, station.lon) * 10) / 10,
        }
      : undefined;
    return {
      siteId: site.id,
      elevationM: site.elevationM ?? packed?.elevationM ?? 0,
      timezone: "Europe/Rome",
      daily,
      sources: [
        "ItaliaMeteo ARPAE ICON-2I (2 km) — modello nazionale ad alta risoluzione",
        "DWD ICON Seamless",
        "Open-Meteo suolo ERA5-Land / IFS",
        "Stazioni Aeronautica Militare / METAR italiane via Iowa Environmental Mesonet",
        "Nodi ICON-2I su crinali e boschi di tutta Italia",
      ],
      modelAgreement: agreement(
        daily.precipMm,
        daily.precipIconMm.length ? daily.precipIconMm : daily.precipMm,
        daily.precipLocalMm.length ? daily.precipLocalMm : daily.precipMm,
      ),
      nearestStation: stationCopy,
    };
  });

  return { weathers, stations: observations };
}
