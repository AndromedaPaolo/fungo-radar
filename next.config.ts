import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function materializeForecastCache() {
  const dir = path.join(process.cwd(), "data");
  const gzPath = path.join(dir, "latest.json.gz");
  const b64Path = path.join(dir, "latest.b64");
  if (existsSync(gzPath) || !existsSync(b64Path)) return;
  writeFileSync(gzPath, Buffer.from(readFileSync(b64Path, "utf8"), "base64"));
}

materializeForecastCache();

const nextConfig: NextConfig = {
  serverExternalPackages: ["leaflet"],
  outputFileTracingIncludes: {
    "*": ["./data/**/*"],
  },
};

export default nextConfig;
