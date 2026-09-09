import type { SpeciesForecast, SpeciesId } from "./types";
import { SPECIES } from "./species";

export function probabilityColor(value: number) {
  if (value >= 75) return "#d7a441";
  if (value >= 55) return "#6f9b4a";
  if (value >= 40) return "#8aa86a";
  if (value >= 25) return "#c4a35a";
  return "#6b7268";
}

export function statusLabel(status: SpeciesForecast["status"]) {
  switch (status) {
    case "in-corso":
      return "Nascita in corso";
    case "in-arrivo":
      return "In arrivo";
    case "attesa-pioggia":
      return "Serve pioggia";
    case "fuori-stagione":
      return "Fuori stagione";
    default:
      return "Poco favorevole";
  }
}

export function daysLabel(days: number | null, status: SpeciesForecast["status"]) {
  if (status === "in-corso" || days === 0) return "già ora";
  if (days === null) return "non stimabile";
  if (days === 1) return "domani";
  return `tra ${days} giorni`;
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function speciesName(id: SpeciesId) {
  return SPECIES[id].commonName;
}
