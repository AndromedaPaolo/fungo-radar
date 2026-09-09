import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function materializeForecastCache() {
  const dir = path.join(process.cwd(), "data");
  const gzPath = path.join(dir, "latest.json.gz");
  const b64Path = path.join(dir, "latest.b64");
  if (existsSync(gzPath)) return;
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
