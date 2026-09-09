import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";
import type { ForecastSnapshot } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "latest.json");
const CACHE_GZ = path.join(CACHE_DIR, "latest.json.gz");
const CACHE_B64 = path.join(CACHE_DIR, "latest.b64");
const BULLETIN_DIR = path.join(CACHE_DIR, "bulletin");

function parseSnapshot(raw: string): ForecastSnapshot {
  return JSON.parse(raw) as ForecastSnapshot;
}

async function readJoinedB64(): Promise<string> {
  try {
    return await readFile(CACHE_B64, "utf8");
  } catch {
    const { readdir } = await import("node:fs/promises");
    const names = (await readdir(BULLETIN_DIR))
      .filter((name) => /^p\d{3}$/.test(name))
      .sort();
    if (!names.length) throw new Error("bollettino assente");
    const chunks: string[] = [];
    for (const name of names) {
      chunks.push(await readFile(path.join(BULLETIN_DIR, name), "utf8"));
    }
    return chunks.join("");
  }
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
        const b64 = await readJoinedB64();
        return parseSnapshot(gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
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
