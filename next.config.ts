import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { NextConfig } from "next";

function materializeForecastCache() {
  const dir = path.join(process.cwd(), "data");
  const gzPath = path.join(dir, "latest.json.gz");
  const b64Path = path.join(dir, "latest.b64");
  if (existsSync(gzPath)) {
    try {
      gunzipSync(readFileSync(gzPath));
      return;
    } catch {
      // File troncato da un bollettino incompleto: ricomponi.
    }
  }
  let b64 = existsSync(b64Path) ? readFileSync(b64Path, "utf8") : "";
  if (!b64) {
    const bulletin = path.join(dir, "bulletin");
    if (existsSync(bulletin)) {
      const names = readdirSync(bulletin).sort();
      const whole = names.filter((name) => /^p\d{3}$/.test(name));
      const halves = names.filter((name) => /^p\d{3}\.[ab]$/.test(name));
      const parts = halves.length ? halves : whole;
      b64 = parts
        .map((name) => readFileSync(path.join(bulletin, name), "utf8"))
        .join("");
    }
  }
  if (!b64) return;
  const gz = Buffer.from(b64, "base64");
  gunzipSync(gz);
  writeFileSync(gzPath, gz);
}

try {
  materializeForecastCache();
} catch {
  // Bollettino incompleto su GitHub: il build non deve fallire.
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["leaflet"],
  outputFileTracingIncludes: {
    "*": [
      "./data/latest.json.gz",
      "./data/latest.b64",
      "./data/bulletin/**",
      "./data/grid-massa.json",
      "./data/hotspot-pariana-pasquilio.json",
    ],
  },
  outputFileTracingExcludes: {
    "*": ["./data/latest.json"],
  },
};

export default nextConfig;
