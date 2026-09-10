import { AREAS, type AreaId } from "./geo";
import { MASSA_SITES } from "./sites-massa";
import { ITALY_NAMED_SITES } from "./sites-italy";
import { buildLocalGrid } from "./grid";
import { buildParianaPasquilioHotspot, withTreeKinds } from "./hotspots";
import { inParianaPasquilio } from "./trees";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Site } from "./types";

const PROVINCE_BY_COMUNE: Record<string, { region: string; province: string }> = {
  Stazzema: { region: "Toscana", province: "Lucca" },
  Minucciano: { region: "Toscana", province: "Lucca" },
  "Vagli Sotto": { region: "Toscana", province: "Lucca" },
  Careggine: { region: "Toscana", province: "Lucca" },
  Collagna: { region: "Emilia-Romagna", province: "Reggio Emilia" },
  Ramiseto: { region: "Emilia-Romagna", province: "Reggio Emilia" },
};

const localSites: Site[] = MASSA_SITES.map(
  ([id, name, comune, lat, lon, habitat, area, edge, aspect]) => {
    const place = PROVINCE_BY_COMUNE[comune] ?? {
      region: "Toscana",
      province: "Massa-Carrara",
    };
    return {
      id,
      name,
      region: place.region,
      province: place.province,
      comune,
      lat,
      lon,
      habitat,
      area,
      edge,
      aspect,
      local: true,
      kind: "named",
      hotspot: inParianaPasquilio(lat, lon) ? "pariana-pasquilio" : undefined,
    };
  },
);

const italySites: Site[] = ITALY_NAMED_SITES;

export const SITES: Site[] = [...localSites, ...italySites];

const GRID_FILE = path.join(process.cwd(), "data", "grid-massa.json");
const HOTSPOT_FILE = path.join(process.cwd(), "data", "hotspot-pariana-pasquilio.json");

export async function getAllSites(): Promise<Site[]> {
  let grid: Site[] = [];
  try {
    grid = JSON.parse(await readFile(GRID_FILE, "utf8")) as Site[];
  } catch {
    grid = await buildLocalGrid();
    await mkdir(path.dirname(GRID_FILE), { recursive: true });
    await writeFile(GRID_FILE, `${JSON.stringify(grid)}\n`, "utf8");
  }

  let pariana: Site[] = [];
  try {
    pariana = JSON.parse(await readFile(HOTSPOT_FILE, "utf8")) as Site[];
  } catch {
    pariana = await buildParianaPasquilioHotspot();
    await mkdir(path.dirname(HOTSPOT_FILE), { recursive: true });
    await writeFile(HOTSPOT_FILE, `${JSON.stringify(pariana)}\n`, "utf8");
  }

  return withTreeKinds([...localSites, ...grid, ...pariana, ...italySites]);
}

export const REGIONS = [...new Set(SITES.map((site) => site.region))].sort((a, b) =>
  a.localeCompare(b, "it"),
);

export { AREAS, type AreaId };
