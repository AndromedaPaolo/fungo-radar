import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function materializeForecastCache() {
  const dir = path.join(process.cwd(), "data");
  const gzPath = path.join(dir, "latest.json.gz");
  const b64Path = path.join(dir, "latest.b64");
  if (existsSync(gzPath)) return;
  let b64 = existsSync(b64Path) ? readFileSync(b64Path, "utf8") : "";
  if (!b64) {
    for (const suffix of ["aa", "ab", "ac", "ad", "ae"] as const) {
      const part = path.join(dir, `latest.b64.${suffix}`);
      if (!existsSync(part)) break;
      b64 += readFileSync(part, "utf8");
    }
  }
  if (!b64) return;
  writeFileSync(gzPath, Buffer.from(b64, "base64"));
}

materializeForecastCache();

const nextConfig: NextConfig = {
  serverExternalPackages: ["leaflet"],
  outputFileTracingIncludes: {
    "*": ["./data/**/*"],
  },
};

export default nextConfig;
