import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";
import type { ForecastSnapshot } from "./types";

const CACHE_FILE = path.join(process.cwd(), "data", "latest.json");
const CACHE_GZ = path.join(process.cwd(), "data", "latest.json.gz");
const CACHE_B64 = path.join(process.cwd(), "data", "latest.b64");

function parseSnapshot(raw: string): ForecastSnapshot {
  return JSON.parse(raw) as ForecastSnapshot;
}

export async function readSnapshotFile(): Promise<ForecastSnapshot | null> {
  try {
    return parseSnapshot(await readFile(CACHE_FILE, "utf8"));
  } catch {
    try {
      const gz = await readFile(CACHE_GZ);
      return parseSnapshot(gunzipSync(gz).toString("utf8"));
    } catch {
      try {
        const b64 = await readFile(CACHE_B64, "utf8");
        return parseSnapshot(
          gunzipSync(Buffer.from(b64, "base64")).toString("utf8"),
        );
      } catch {
        return null;
      }
    }
  }
}

export function isSnapshotStale(snapshot: ForecastSnapshot, now = new Date()) {
  const romeDay = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  return romeDay(now) !== romeDay(new Date(snapshot.generatedAt));
}

export async function writeSnapshotFile(snapshot: ForecastSnapshot) {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const gz = gzipSync(Buffer.from(json, "utf8"));
  await writeFile(CACHE_FILE, json, "utf8");
  await writeFile(CACHE_GZ, gz);
  await writeFile(CACHE_B64, gz.toString("base64"), "utf8");
}
