import { AREAS, type AreaId } from "./geo";
import { MASSA_SITES } from "./sites-massa";
import { ITALY_NAMED_SITES } from "./sites-italy";
import { buildLocalGrid } from "./grid";
import { buildParianaPasquilioHotspot, withTreeKinds } from "./hotspots";
import { inParianaPasquilio } from "./trees";
import massaGrid from "../data/grid-massa.json";
import parianaHotspot from "../data/hotspot-pariana-pasquilio.json";
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

export async function getAllSites(): Promise<Site[]> {
  const grid = (massaGrid as Site[]).length > 0 ? (massaGrid as Site[]) : await buildLocalGrid();
  const pariana =
    (parianaHotspot as Site[]).length > 0
      ? (parianaHotspot as Site[])
      : await buildParianaPasquilioHotspot();
  return withTreeKinds([...localSites, ...grid, ...pariana, ...italySites]);
}

export const REGIONS = [...new Set(SITES.map((site) => site.region))].sort((a, b) =>
  a.localeCompare(b, "it"),
);

export { AREAS, type AreaId };
