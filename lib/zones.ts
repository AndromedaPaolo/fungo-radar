import type { AreaId } from "./geo";
import { growsInTree } from "@/lib/species";
import { TREE_LABEL, treeKindOf } from "./trees";
import { haversine } from "./stations";
import type { Aspect, Site, SiteForecast, SpeciesId, TreeKind } from "./types";

export type MapZone = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  local: boolean;
  area?: AreaId;
  treeKind: TreeKind;
  treeKinds: TreeKind[];
  aspect: Aspect;
  edge: boolean;
  frazione: string;
  comune?: string;
  members: SiteForecast[];
  named: SiteForecast[];
  probability: number;
  bestSpecies: SpeciesId | null;
  elevationM: number;
  representative: SiteForecast;
};

export const ASPECT_LABEL: Record<Aspect, string> = {
  N: "versante nord",
  S: "versante sud",
  E: "versante est",
  W: "versante ovest",
};

export const ASPECTS: { id: Aspect; label: string }[] = [
  { id: "N", label: "Nord" },
  { id: "S", label: "Sud" },
  { id: "E", label: "Est" },
  { id: "W", label: "Ovest" },
];

const ITALY_FRINGE = /^hs-it-(.+)-(n|s|e|w|ne|nw|se|sw)$/i;
const ASSIGN_KM = 4.6;
const MIN_R = 620;
const MAX_R = 2800;
const GAP_M = 240;

function aspectOf(site: Site): Aspect {
  return site.aspect ?? "E";
}

function italyForestId(site: Site) {
  const fringe = site.id.match(ITALY_FRINGE);
  return fringe?.[1] ?? site.id;
}

function scoreOf(site: SiteForecast, speciesFilter: SpeciesId | "tutti") {
  const kind = treeKindOf(site.site);
  if (speciesFilter === "tutti") {
    const native = site.species.filter((row) => growsInTree(row.speciesId, kind));
    return native.length === 0 ? 0 : Math.max(...native.map((row) => row.probability));
  }
  if (!growsInTree(speciesFilter, kind)) return 0;
  return site.species.find((row) => row.speciesId === speciesFilter)?.probability ?? 0;
}

function centroid(members: SiteForecast[]) {
  const lat = members.reduce((sum, row) => sum + row.site.lat, 0) / members.length;
  const lon = members.reduce((sum, row) => sum + row.site.lon, 0) / members.length;
  return { lat, lon };
}

function radiusFromMembers(members: SiteForecast[], center: { lat: number; lon: number }) {
  let maxKm = 0;
  for (const row of members) {
    maxKm = Math.max(maxKm, haversine(center.lat, center.lon, row.site.lat, row.site.lon));
  }
  return Math.min(Math.max(maxKm * 1000 * 1.05, MIN_R), MAX_R);
}

function moveMeters(lat: number, lon: number, northM: number, eastM: number) {
  const degLat = 111_320;
  const degLon = 111_320 * Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + northM / degLat,
    lon: lon + eastM / Math.max(degLon, 1),
  };
}

function nearestNamed(
  site: SiteForecast,
  named: SiteForecast[],
): SiteForecast | null {
  const kind = treeKindOf(site.site);
  let best: SiteForecast | null = null;
  let bestKm = ASSIGN_KM;
  for (const row of named) {
    if (treeKindOf(row.site) !== kind) continue;
    const km = haversine(site.site.lat, site.site.lon, row.site.lat, row.site.lon);
    if (km < bestKm) {
      best = row;
      bestKm = km;
    }
  }
  return best;
}

function frazioneLabel(members: SiteForecast[], key: string) {
  const named = members.find((row) => row.site.kind === "named");
  if (named) return named.site.name.replace(/\s+–.*$/, "");
  if (key.startsWith("it:")) {
    const forest = members.find((row) => row.site.kind === "named") ?? members[0];
    return (forest?.site.name ?? "Bosco").replace(/\s+·.*$/, "");
  }
  return members[0]?.site.comune ?? members[0]?.site.name ?? "Frazione";
}

function zoneName(frazione: string, kind: TreeKind, aspect: Aspect, edge: boolean) {
  const orlo = edge ? "frangente" : "interno";
  return `${frazione} · ${TREE_LABEL[kind]} · ${orlo} · ${ASPECT_LABEL[aspect]}`;
}

function separateCircles(zones: MapZone[]): MapZone[] {
  const items = zones.map((zone) => ({ ...zone }));
  for (let iter = 0; iter < 48; iter++) {
    let hits = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const distM = Math.max(haversine(a.lat, a.lon, b.lat, b.lon) * 1000, 1);
        const need = a.radiusM + b.radiusM + GAP_M;
        if (distM >= need) continue;
        hits += 1;
        const overflow = need - distM;
        const shrinkA = a.radiusM > MIN_R ? Math.min(a.radiusM - MIN_R, overflow * 0.38) : 0;
        const shrinkB = b.radiusM > MIN_R ? Math.min(b.radiusM - MIN_R, overflow * 0.38) : 0;
        a.radiusM = Math.round(a.radiusM - shrinkA);
        b.radiusM = Math.round(b.radiusM - shrinkB);
        const still = a.radiusM + b.radiusM + GAP_M - haversine(a.lat, a.lon, b.lat, b.lon) * 1000;
        if (still <= 0) continue;
        const northM = (b.lat - a.lat) * 111_320;
        const eastM = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
        const len = Math.hypot(northM, eastM) || 1;
        const push = still / 2 + 12;
        const movedA = moveMeters(a.lat, a.lon, (-northM / len) * push, (-eastM / len) * push);
        const movedB = moveMeters(b.lat, b.lon, (northM / len) * push, (eastM / len) * push);
        a.lat = movedA.lat;
        a.lon = movedA.lon;
        b.lat = movedB.lat;
        b.lon = movedB.lon;
      }
    }
    if (hits === 0) break;
  }
  return items.map((zone) => ({
    ...zone,
    lat: Math.round(zone.lat * 10000) / 10000,
    lon: Math.round(zone.lon * 10000) / 10000,
    radiusM: Math.round(zone.radiusM),
  }));
}

export function clusterZones(
  sites: SiteForecast[],
  speciesFilter: SpeciesId | "tutti",
): MapZone[] {
  const named = sites.filter((row) => row.site.kind === "named");
  const localNamed = named.filter((row) => row.site.local);
  const buckets = new Map<string, SiteForecast[]>();

  for (const site of sites) {
    const kind = treeKindOf(site.site);
    const aspect = aspectOf(site.site);
    const edge = Boolean(site.site.edge);
    let frazione: string;
    if (!site.site.local) frazione = `it:${italyForestId(site.site)}`;
    else if (site.site.kind === "named") frazione = site.site.id;
    else {
      const near = nearestNamed(site, localNamed);
      if (!near) continue;
      frazione = near.site.id;
    }
    const id = `${frazione}|${kind}|${aspect}|${edge ? "orlo" : "dentro"}`;
    const list = buckets.get(id);
    if (list) list.push(site);
    else buckets.set(id, [site]);
  }

  const raw: MapZone[] = [];
  for (const [id, members] of buckets) {
    const [frazioneId, kind, aspect, edgeKey] = id.split("|") as [
      string,
      TreeKind,
      Aspect,
      string,
    ];
    const namedMembers = members.filter((row) => row.site.kind === "named");
    const ranked = [...members].sort(
      (a, b) => scoreOf(b, speciesFilter) - scoreOf(a, speciesFilter),
    );
    const representative =
      [...namedMembers].sort(
        (a, b) => scoreOf(b, speciesFilter) - scoreOf(a, speciesFilter),
      )[0] ?? ranked[0];
    if (!representative) continue;
    const hull = namedMembers.length > 0 ? namedMembers : members;
    const center = centroid(hull);
    const edge = edgeKey === "orlo";
    const frazione = frazioneLabel(members, frazioneId);
    const local = members.every((row) => row.site.local);
    raw.push({
      id,
      name: zoneName(frazione, kind, aspect, edge),
      lat: center.lat,
      lon: center.lon,
      radiusM: Math.round(radiusFromMembers(hull, center)),
      local,
      area: members.find((row) => row.site.area)?.site.area,
      treeKind: kind,
      treeKinds: [kind],
      aspect,
      edge,
      frazione,
      comune: members[0]?.site.comune,
      members,
      named: namedMembers,
      probability: Math.round(scoreOf(ranked[0], speciesFilter)),
      bestSpecies: representative.bestSpecies,
      elevationM: Math.round(
        members.reduce((sum, row) => sum + row.elevationM, 0) / members.length,
      ),
      representative,
    });
  }

  return separateCircles(raw).sort((a, b) => b.probability - a.probability);
}
