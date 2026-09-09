import type { AreaId } from "./geo";

export const SPECIES_IDS = [
  "porcini",
  "colombine",
  "russole",
  "galletti",
  "mazze",
] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

export type Habitat =
  | "faggio"
  | "quercia"
  | "castagno"
  | "conifera"
  | "misto"
  | "pascolo"
  | "macchia";

export type TreeKind =
  | "castagno"
  | "faggio"
  | "abete"
  | "pino"
  | "roverella"
  | "leccio"
  | "cerro"
  | "misto"
  | "macchia"
  | "pascolo";

export type Aspect = "N" | "S" | "E" | "W";

export type SiteKind = "named" | "grid" | "hotspot";

export type HotspotId = "pariana-pasquilio" | "italia";

export type StationSize = "grande" | "piccola";

export type LocalStation = {
  id: string;
  icao?: string;
  name: string;
  network: string;
  lat: number;
  lon: number;
  elevationM: number;
  size: StationSize;
  measures: string[];
};

export type Site = {
  id: string;
  name: string;
  region: string;
  province: string;
  comune?: string;
  lat: number;
  lon: number;
  habitat: Habitat;
  treeKind?: TreeKind;
  edge?: boolean;
  area?: AreaId;
  aspect?: Aspect;
  local?: boolean;
  kind?: SiteKind;
  hotspot?: HotspotId;
};

export type DailySeries = {
  dates: string[];
  precipMm: number[];
  precipIconMm: number[];
  precipGfsMm: number[];
  precipLocalMm: number[];
  et0Mm: number[];
  tempMax: number[];
  tempMin: number[];
  windMaxKmh: number[];
  humidityMean: number[];
  soilMoistureSurface: number[];
  soilMoistureRoot: number[];
  soilTempC: number[];
};

export type StationObservation = {
  id: string;
  name: string;
  network: string;
  lat: number;
  lon: number;
  elevationM: number;
  distanceKm: number;
  size: StationSize;
  precip7dMm: number | null;
  windMaxKmh: number | null;
  humidity: number | null;
  tempC: number | null;
  updatedAt: string | null;
};

export type SiteWeather = {
  siteId: string;
  elevationM: number;
  timezone: string;
  daily: DailySeries;
  sources: string[];
  modelAgreement: number;
  nearestStation?: StationObservation;
};

export type SpeciesForecast = {
  speciesId: SpeciesId;
  probability: number;
  daysUntil: number | null;
  status: "in-corso" | "in-arrivo" | "attesa-pioggia" | "fuori-stagione" | "sfavorevole";
  drivers: string[];
  levers: string[];
};

export type SiteForecast = {
  site: Site;
  elevationM: number;
  weather: {
    precip7dMm: number;
    precip14dMm: number;
    precipConsensusMm: number;
    daysSinceTriggerRain: number | null;
    soilMoisture: number;
    soilMoistureRoot: number;
    soilTempC: number;
    tempMean7d: number;
    windMax3dKmh: number;
    humidityMean: number;
    waterBalance7dMm: number;
    modelAgreement: number;
    nearestStationName?: string;
    nearestStationKm?: number;
  };
  species: SpeciesForecast[];
  bestProbability: number;
  bestSpecies: SpeciesId | null;
};

export type ForecastSnapshot = {
  generatedAt: string;
  timezone: string;
  nextUpdateAt: string;
  sources: string[];
  sites: SiteForecast[];
  stations: StationObservation[];
  summary: {
    sitesScanned: number;
    sitesWithSignal: number;
    topSpecies: SpeciesId | null;
    stationsUsed: number;
  };
};
