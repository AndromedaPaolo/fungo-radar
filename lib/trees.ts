import type { Habitat, Site, TreeKind } from "./types";

export const TREE_KINDS: { id: TreeKind; label: string; color: string }[] = [
  { id: "castagno", label: "Castagneto", color: "#c47a3a" },
  { id: "faggio", label: "Faggeta", color: "#3d7a4a" },
  { id: "abete", label: "Abetina", color: "#1f4d3a" },
  { id: "pino", label: "Pineta", color: "#5a8f6a" },
  { id: "roverella", label: "Querceto di roverella", color: "#8a6b32" },
  { id: "leccio", label: "Lecceta", color: "#2f6b45" },
  { id: "cerro", label: "Cerreta", color: "#6b5428" },
  { id: "misto", label: "Bosco misto", color: "#6f8f5a" },
  { id: "macchia", label: "Macchia / sclerofille", color: "#9aa85a" },
  { id: "pascolo", label: "Pascolo e prateria", color: "#c4b06a" },
];

export const TREE_COLOR: Record<TreeKind, string> = Object.fromEntries(
  TREE_KINDS.map((row) => [row.id, row.color]),
) as Record<TreeKind, string>;

export const TREE_LABEL: Record<TreeKind, string> = Object.fromEntries(
  TREE_KINDS.map((row) => [row.id, row.label]),
) as Record<TreeKind, string>;

export const TUSCANY_TREE_WMS = {
  url: "https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsucs",
  layers: "rt_ucs.idvegfor.rt",
  attribution: "Vegetazione forestale · Regione Toscana",
};

const PARIANA_SOUTH = 44.016;
const PARIANA_NORTH = 44.086;
const PARIANA_WEST = 10.145;
const PARIANA_EAST = 10.248;

export function inParianaPasquilio(lat: number, lon: number) {
  return (
    lat >= PARIANA_SOUTH &&
    lat <= PARIANA_NORTH &&
    lon >= PARIANA_WEST &&
    lon <= PARIANA_EAST
  );
}

function fromHabitat(habitat: Habitat | undefined, elevationM: number): TreeKind {
  if (habitat === "castagno") return "castagno";
  if (habitat === "faggio") return "faggio";
  if (habitat === "pascolo") return "pascolo";
  if (habitat === "macchia") return elevationM < 220 ? "leccio" : "macchia";
  if (habitat === "quercia") return elevationM < 280 ? "leccio" : "roverella";
  if (habitat === "conifera") return elevationM >= 900 ? "abete" : "pino";
  if (habitat === "misto") return "misto";
  if (elevationM >= 1450) return "pascolo";
  if (elevationM >= 900) return "faggio";
  if (elevationM >= 500) return "castagno";
  if (elevationM < 250) return "leccio";
  return "misto";
}

/** Versante Pariana–Pasquilio: castagni sotto, abetine e faggio sul crinale. */
export function classifyTree(opts: {
  lat: number;
  lon: number;
  elevationM?: number;
  habitat?: Habitat;
}): TreeKind {
  const elevationM = opts.elevationM ?? 0;
  const nearPasquilio =
    opts.lat <= 44.042 && opts.lat >= 44.022 && opts.lon >= 10.18 && opts.lon <= 10.222;
  const abovePariana =
    opts.lat >= 44.05 && opts.lat <= 44.078 && opts.lon >= 10.162 && opts.lon <= 10.208;
  const carchioFolgorito =
    opts.lat <= 44.038 && opts.lat >= 44.02 && opts.lon >= 10.2 && opts.lon <= 10.225;

  if (inParianaPasquilio(opts.lat, opts.lon) || nearPasquilio || abovePariana) {
    if (elevationM >= 1180) return "pascolo";
    if (carchioFolgorito && elevationM >= 820) return "faggio";
    if (nearPasquilio && elevationM >= 760 && opts.lon >= 10.19) return "abete";
    if (elevationM >= 920) return "faggio";
    if (abovePariana && elevationM >= 280 && elevationM <= 900) return "castagno";
    if (elevationM >= 320 && elevationM <= 880) return "castagno";
    if (elevationM < 260) return "leccio";
    if (elevationM < 340) return "roverella";
  }

  return fromHabitat(opts.habitat, elevationM);
}

export function treeKindOf(site: Pick<Site, "treeKind" | "habitat" | "lat" | "lon">): TreeKind {
  return site.treeKind ?? classifyTree({ lat: site.lat, lon: site.lon, habitat: site.habitat });
}

export function habitatFromTree(kind: TreeKind): Habitat {
  if (kind === "castagno") return "castagno";
  if (kind === "faggio") return "faggio";
  if (kind === "abete" || kind === "pino") return "conifera";
  if (kind === "roverella" || kind === "cerro") return "quercia";
  if (kind === "leccio" || kind === "macchia") return "macchia";
  if (kind === "pascolo") return "pascolo";
  return "misto";
}
