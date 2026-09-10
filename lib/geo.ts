export const HOME = {
  label: "Massa",
  lat: 44.0355,
  lon: 10.139,
};

export type AreaId = "colline" | "apuane" | "lunigiana" | "appennino";

export type ZoneId = AreaId | "tutte" | "pariana-pasquilio" | "hotspot-italia";

export const AREAS: { id: AreaId; label: string }[] = [
  { id: "colline", label: "Massa, Carrara, Fosdinovo" },
  { id: "apuane", label: "Alpi Apuane" },
  { id: "lunigiana", label: "Lunigiana" },
  { id: "appennino", label: "Appennino e valichi" },
];

export const ZONE_CHIPS: { id: ZoneId; label: string }[] = [
  { id: "pariana-pasquilio", label: "Pariana–Pasquilio" },
  ...AREAS,
  { id: "hotspot-italia", label: "Boschi e versanti d’Italia" },
];

export function kmFromHome(lat: number, lon: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - HOME.lat);
  const dLon = toRad(lon - HOME.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(HOME.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
