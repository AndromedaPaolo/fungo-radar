import { ALL_STATIONS, haversine } from "./stations";
import { HOME } from "./geo";
import type { StationObservation } from "./types";

function iemUrl(station: string, start: Date, end: Date) {
  const params = new URLSearchParams({
    station,
    data: "tmpf,relh,drct,sknt,p01i",
    tz: "Europe/Rome",
    format: "onlycomma",
    latlon: "no",
    elev: "no",
    missing: "null",
    trace: "0.0001",
    direct: "no",
    report_type: "3",
  });
  const from = new Date(start);
  const to = new Date(end);
  params.set("year1", String(from.getUTCFullYear()));
  params.set("month1", String(from.getUTCMonth() + 1));
  params.set("day1", String(from.getUTCDate()));
  params.set("year2", String(to.getUTCFullYear()));
  params.set("month2", String(to.getUTCMonth() + 1));
  params.set("day2", String(to.getUTCDate()));
  return `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${params.toString()}`;
}

function fToC(f: number) {
  return ((f - 32) * 5) / 9;
}

function parseCsv(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = cols[i] ?? "";
    });
    return row;
  });
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function fetchIemStations(): Promise<StationObservation[]> {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 8);
  const icaoStations = ALL_STATIONS.filter((s) => s.icao);

  const results = await mapPool(icaoStations, 8, async (station) => {
    try {
      const response = await fetch(iemUrl(station.icao!, start, end), {
        headers: { Accept: "text/plain", "User-Agent": "Spora/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(18000),
      });
      if (!response.ok) return null;
      const rows = parseCsv(await response.text());
      const byDay = new Map<string, { precipIn: number; windKt: number; rh: number[]; tmp: number[] }>();
      for (const row of rows) {
        const valid = row.valid ?? "";
        const day = valid.slice(0, 10);
        if (!day) continue;
        const bucket = byDay.get(day) ?? { precipIn: 0, windKt: 0, rh: [], tmp: [] };
        const precip = Number(row.p01i);
        const wind = Number(row.sknt);
        const rh = Number(row.relh);
        const tmp = Number(row.tmpf);
        if (Number.isFinite(precip)) bucket.precipIn += precip;
        if (Number.isFinite(wind)) bucket.windKt = Math.max(bucket.windKt, wind);
        if (Number.isFinite(rh)) bucket.rh.push(rh);
        if (Number.isFinite(tmp)) bucket.tmp.push(tmp);
        byDay.set(day, bucket);
      }
      const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const last7 = days.slice(-7);
      const precip7dMm = last7.reduce((s, [, v]) => s + v.precipIn * 25.4, 0);
      const windMaxKmh = Math.max(0, ...last7.map(([, v]) => v.windKt * 1.852));
      const rhAll = last7.flatMap(([, v]) => v.rh);
      const tmpAll = last7.flatMap(([, v]) => v.tmp);
      const last = days.at(-1);
      return {
        id: station.id,
        name: station.name,
        network: station.network,
        lat: station.lat,
        lon: station.lon,
        elevationM: station.elevationM,
        distanceKm: Math.round(haversine(HOME.lat, HOME.lon, station.lat, station.lon) * 10) / 10,
        size: station.size,
        precip7dMm: last7.length ? Math.round(precip7dMm * 10) / 10 : null,
        windMaxKmh: last7.length ? Math.round(windMaxKmh) : null,
        humidity: rhAll.length ? Math.round(rhAll.reduce((a, b) => a + b, 0) / rhAll.length) : null,
        tempC: tmpAll.length ? Math.round(fToC(tmpAll.reduce((a, b) => a + b, 0) / tmpAll.length) * 10) / 10 : null,
        updatedAt: last?.[0] ?? null,
      } satisfies StationObservation;
    } catch {
      return null;
    }
  });

  return results.filter((row) => row !== null);
}
