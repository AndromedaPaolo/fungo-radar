import { expandSnapshot } from "./forecast";
import { buildItalyWoods } from "./grid-italy";
import { ITALY_NAMED_SITES } from "./sites-italy";
import type { ForecastSnapshot } from "./types";

function isOldItalyFringe(id: string) {
  return id.startsWith("hs-it-");
}

/** Aggiunge frazioni, versanti e orli d'Italia dal vicino, senza toccare il bollettino. */
export function expandItalySnapshot(snapshot: ForecastSnapshot): ForecastSnapshot {
  const fill = buildItalyWoods(ITALY_NAMED_SITES);
  const base: ForecastSnapshot = {
    ...snapshot,
    sites: snapshot.sites.filter((row) => !isOldItalyFringe(row.site.id)),
  };
  return expandSnapshot(base, [...ITALY_NAMED_SITES, ...fill]);
}
