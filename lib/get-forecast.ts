import { buildSnapshot } from "./forecast";
import { fetchAllSiteWeather } from "./weather";
import { getAllSites } from "./sites";
import { isSnapshotStale, readSnapshotFile, writeSnapshotFile } from "./cache";
import type { ForecastSnapshot } from "./types";

let memory: ForecastSnapshot | null = null;
let inflight: Promise<ForecastSnapshot> | null = null;

export async function refreshForecast(persist = true): Promise<ForecastSnapshot> {
  const catalog = await getAllSites();
  const { weathers, stations } = await fetchAllSiteWeather(catalog);
  const snapshot = buildSnapshot(weathers, catalog, stations);
  memory = snapshot;
  if (persist) {
    try {
      await writeSnapshotFile(snapshot);
    } catch {
      // Su Vercel il filesystem è effimero: la cache in memoria resta valida per l'istanza.
    }
  }
  return snapshot;
}

export async function getForecast(): Promise<ForecastSnapshot> {
  if (memory && !isSnapshotStale(memory)) return memory;

  const file = await readSnapshotFile();
  if (file && !isSnapshotStale(file)) {
    memory = file;
    return file;
  }

  if (inflight) return inflight;
  inflight = refreshForecast(true)
    .catch((error: unknown) => {
      if (file) {
        memory = file;
        return file;
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
