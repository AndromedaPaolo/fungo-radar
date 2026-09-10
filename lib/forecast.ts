import { SPECIES } from "./species";
import type {
  ForecastSnapshot,
  Site,
  SiteForecast,
  SiteWeather,
  SpeciesForecast,
  SpeciesId,
  StationObservation,
} from "./types";

const TODAY_INDEX_OFFSET = 14;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function bell(value: number, low: number, high: number) {
  if (value >= low && value <= high) return 1;
  if (value < low) {
    const start = low > 1 ? 0 : low * 0.45;
    if (value <= start) return 0;
    return (value - start) / (low - start);
  }
  const extra = Math.max(high - low, low > 1 ? 25 : Math.max(low, 0.08));
  return clamp(1 - (value - high) / extra);
}

function lastN(values: number[], end: number, n: number) {
  return values.slice(Math.max(0, end - n + 1), end + 1);
}

function nextMidnightRome(from = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const noon = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00+02:00`);
  const next = new Date(noon);
  next.setUTCDate(next.getUTCDate() + 1);
  const y = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(next);
  const ny = y.find((p) => p.type === "year")?.value;
  const nm = y.find((p) => p.type === "month")?.value;
  const nd = y.find((p) => p.type === "day")?.value;
  return `${ny}-${nm}-${nd}T00:00:00+02:00`;
}

function romeMonth(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      month: "numeric",
    }).format(date),
  );
}

function triggerIndex(precip: number[], today: number) {
  for (let i = today; i >= 0; i--) {
    const two = precip[i] + (precip[i - 1] ?? 0);
    if (precip[i] >= 8 || two >= 12) return i;
  }
  return null;
}

function futureTrigger(precip: number[], today: number) {
  for (let i = today + 1; i < precip.length; i++) {
    const two = precip[i] + (precip[i - 1] ?? 0);
    if (precip[i] >= 8 || two >= 12) return i;
  }
  return null;
}

function habitatFit(
  site: SiteForecast["site"],
  speciesId: SpeciesId,
) {
  const profile = SPECIES[speciesId];
  const treeOk = site.treeKind
    ? profile.treeKinds.includes(site.treeKind)
    : profile.habitats.includes(site.habitat);
  const base = treeOk ? 1 : 0.18;
  let score = profile.likesEdge ? clamp(base * (site.edge ? 1.15 : 0.55)) : base;
  if (site.aspect === "N" && (speciesId === "porcini" || speciesId === "galletti" || speciesId === "russole")) {
    score = clamp(score * 1.1);
  }
  if (site.aspect === "E" && (speciesId === "porcini" || speciesId === "russole")) {
    score = clamp(score * 1.05);
  }
  if (site.aspect === "W" && speciesId === "colombine") {
    score = clamp(score * 1.04);
  }
  if (site.aspect === "S" && speciesId === "mazze") {
    score = clamp(score * 1.1);
  }
  if (site.aspect === "S" && (speciesId === "porcini" || speciesId === "galletti")) {
    score = clamp(score * 0.88);
  }
  return score;
}

function scoreSpecies(
  speciesId: SpeciesId,
  site: SiteForecast["site"],
  elevationM: number,
  weather: SiteWeather,
): SpeciesForecast {
  const profile = SPECIES[speciesId];
  const d = weather.daily;
  const today = Math.min(TODAY_INDEX_OFFSET, d.dates.length - 1);
  const month = romeMonth();
  const inSeason = profile.seasonMonths.includes(month);

  const precip7 = sum(lastN(d.precipMm, today, 7));
  const precipIcon7 = sum(lastN(d.precipIconMm.length ? d.precipIconMm : d.precipMm, today, 7));
  const precipLocal7 = sum(lastN(d.precipLocalMm?.length ? d.precipLocalMm : d.precipMm, today, 7));
  let precipConsensus = (precip7 + precipIcon7 + precipLocal7) / 3;
  const station = weather.nearestStation;
  if (
    station?.precip7dMm != null &&
    station.distanceKm < 28 &&
    Math.abs(station.elevationM - elevationM) < 550
  ) {
    precipConsensus = precipConsensus * 0.72 + station.precip7dMm * 0.28;
  }
  const et07 = sum(lastN(d.et0Mm, today, 7));
  const waterBalance = precipConsensus - et07;
  const soil = d.soilMoistureSurface[today] || mean(lastN(d.soilMoistureSurface, today, 3));
  const soilRoot = d.soilMoistureRoot[today] || soil;
  const soilTemp = d.soilTempC[today] || mean(lastN(d.tempMax, today, 3)) - 2;
  const air = mean(lastN(d.tempMax, today, 7).map((max, i) => (max + lastN(d.tempMin, today, 7)[i]) / 2));
  let wind3 = Math.max(...lastN(d.windMaxKmh, today, 3), 0);
  if (
    station?.windMaxKmh != null &&
    station.distanceKm < 22 &&
    Math.abs(station.elevationM - elevationM) < 500
  ) {
    wind3 = Math.round(wind3 * 0.6 + station.windMaxKmh * 0.4);
  }
  const frost = Math.min(...lastN(d.tempMin, today, 4));

  const trig = triggerIndex(d.precipMm, today);
  const daysSince = trig === null ? null : today - trig;
  const nextRain = futureTrigger(d.precipMm, today);

  const drivers: string[] = [];
  const levers: string[] = [];

  if (!inSeason) {
    return {
      speciesId,
      probability: Math.round(8 * habitatFit(site, speciesId)),
      daysUntil: null,
      status: "fuori-stagione",
      drivers: [`Fuori stagione: ${profile.commonName} in Italia fruttifica soprattutto nei mesi ${profile.seasonMonths.join(", ")}.`],
      levers: ["Attendi il periodo fenologico giusto: il meteo da solo non basta."],
    };
  }

  const habitat = habitatFit(site, speciesId);
  const elevOk =
    elevationM >= profile.elevation[0] - 80 && elevationM <= profile.elevation[1] + 80
      ? bell(elevationM, profile.elevation[0], profile.elevation[1])
      : 0.25;
  const rainScore = bell(precipConsensus, profile.rain7d[0], profile.rain7d[1]);
  const moistScore = bell(soil, profile.soilMoisture[0], profile.soilMoisture[1]);
  const deepScore = bell(soilRoot, profile.soilMoisture[0] - 0.02, profile.soilMoisture[1] + 0.04);
  const soilTScore = bell(soilTemp, profile.soilTemp[0], profile.soilTemp[1]);
  const airScore = bell(air, profile.airTemp[0], profile.airTemp[1]);
  const windScore = wind3 > profile.windPenaltyKmh ? clamp(1 - (wind3 - profile.windPenaltyKmh) / 25) : 1;
  const frostScore = frost < 2 ? 0.15 : frost < 5 ? 0.6 : 1;
  const balanceScore =
    speciesId === "galletti"
      ? clamp(0.35 + waterBalance / 40)
      : speciesId === "mazze"
        ? waterBalance > 35
          ? 0.45
          : bell(waterBalance, 4, 28)
        : clamp(0.3 + waterBalance / 50);

  let triggerScore = 0.35;
  let daysUntil: number | null = null;
  let status: SpeciesForecast["status"] = "sfavorevole";

  const [lagMin, lagMax] = profile.lagDays;

  if (daysSince !== null) {
    if (daysSince < lagMin) {
      triggerScore = 0.55 + 0.35 * (daysSince / lagMin);
      daysUntil = lagMin - daysSince;
      status = "in-arrivo";
      drivers.push(
        `Pioggia-innesco ${daysSince === 0 ? "oggi" : `${daysSince} giorni fa`}: attesi ancora ${daysUntil} giorni di incubazione.`,
      );
    } else if (daysSince <= lagMax + 2) {
      triggerScore = 1;
      daysUntil = 0;
      status = "in-corso";
      drivers.push(`Finestra di nascita aperta: l'innesco è di ${daysSince} giorni fa (lag tipico ${lagMin}–${lagMax} giorni).`);
    } else {
      triggerScore = clamp(1 - (daysSince - lagMax) / 8);
      if (nextRain !== null) {
        daysUntil = nextRain - today + lagMin;
        status = "in-arrivo";
        drivers.push("La spinta della pioggia precedente sta svanendo; una nuova nascità dipende dal prossimo fronte.");
      } else {
        status = "attesa-pioggia";
        drivers.push("L'onda della scorsa pioggia è oltre il picco: il micelio torna in attesa.");
      }
    }
  } else if (nextRain !== null) {
    daysUntil = nextRain - today + lagMin;
    triggerScore = 0.4;
    status = "in-arrivo";
    drivers.push(`Nessun innesco recente. Pioggia prevista tra ${nextRain - today} giorni: nascita stimata +${lagMin} giorni dopo.`);
  } else {
    status = "attesa-pioggia";
    triggerScore = 0.15;
    drivers.push("Nei 14 giorni passati non c'è stata una pioggia-innesco (≥ 8 mm).");
  }

  const agreementBoost = 0.72 + weather.modelAgreement * 0.28;
  const timing =
    status === "in-corso"
      ? 1
      : status === "in-arrivo" && daysUntil !== null
        ? clamp(0.42 + (1 - daysUntil / (lagMax + 3)) * 0.58)
        : 0.5;
  const raw =
    0.16 * habitat +
    0.08 * elevOk +
    0.16 * rainScore +
    0.14 * moistScore +
    0.08 * deepScore +
    0.12 * soilTScore +
    0.08 * airScore +
    0.1 * triggerScore +
    0.06 * balanceScore +
    0.05 * windScore +
    0.03 * frostScore;

  let probability = Math.round(clamp(raw * agreementBoost * timing) * 100);
  if (habitat < 0.3) probability = Math.min(probability, 22);
  if (status === "attesa-pioggia") probability = Math.min(probability, 34);
  if (moistScore < 0.35 && rainScore < 0.4) probability = Math.min(probability, 32);

  if (habitat >= 0.9) {
    const verso = site.aspect ? `, versante ${site.aspect}` : "";
    drivers.push(`Habitat adatto: ${site.habitat}${site.edge ? ", orlo/radura" : ""}${verso}.`);
  } else {
    levers.push(
      `Questo bosco non è da ${profile.commonName}: cerca ${profile.treeKinds.join(", ")}.`,
    );
  }
  if (site.aspect === "S" && speciesId === "porcini") {
    levers.push("Versante sud: più caldo e asciutto. Cerca il nord di Sagro, Campocecina, Vinca o i valichi.");
  }

  drivers.push(
    `Pioggia 7 giorni: ${Math.round(precipConsensus)} mm (IFS ${Math.round(precip7)} · ICON ${Math.round(precipIcon7)} · ICON-2I ${Math.round(precipLocal7)}${
      station?.precip7dMm != null ? ` · ${station.name} ${station.precip7dMm}` : ""
    }).`,
  );
  drivers.push(
    `Suolo ${soil.toFixed(2)} m³/m³ (0–7 cm), ${soilRoot.toFixed(2)} in profondità, ${soilTemp.toFixed(1)} °C. Bilancio idrico 7g: ${Math.round(waterBalance)} mm.`,
  );
  if (station && station.distanceKm < 25) {
    drivers.push(
      `Stazione più vicina: ${station.name} (${station.distanceKm} km, ${station.network}).`,
    );
  }

  if (precipConsensus < profile.rain7d[0]) {
    const missing = Math.round(profile.rain7d[0] - precipConsensus);
    levers.push(`Servono ancora circa ${missing} mm di pioggia nei prossimi giorni, meglio spezzati che un nubifragio.`);
  }
  if (soil < profile.soilMoisture[0]) {
    levers.push("Il primo strato di suolo è asciutto: una notte umida o 8–15 mm sollevano subito la probabilità.");
  }
  if (soil > profile.soilMoisture[1] + 0.04) {
    levers.push("Terreno troppo saturo: 1–2 giorni asciutti riducono marciumi e alzano le nascite.");
  }
  if (soilTemp < profile.soilTemp[0]) {
    levers.push(`Suolo a ${soilTemp.toFixed(1)} °C: un rialzo di 2–3 °C verso ${profile.soilTemp[0]}–${profile.soilTemp[1]} °C sblocca il micelio.`);
  }
  if (soilTemp > profile.soilTemp[1]) {
    levers.push("Suolo caldo: cerca versanti nord e quote più alte, o attendi un calo notturno.");
  }
  if (wind3 > profile.windPenaltyKmh) {
    levers.push(`Vento recente a ${Math.round(wind3)} km/h: la lettiera si asciuga. Meglio dopo una giornata ferma e umida.`);
  }
  if (speciesId === "galletti" && waterBalance < 10) {
    levers.push("I galletti vogliono umidità continua per 10–18 giorni, non un solo temporale.");
  }
  if (speciesId === "porcini" && daysSince !== null && daysSince < 4) {
    levers.push("Per i porcini non correre: lascia 2–4 giorni più miti dopo l'innesco, senza vento di caduta.");
  }
  if (speciesId === "mazze" && !site.edge && site.habitat !== "pascolo") {
    levers.push("Spostati su prati, sentieri e radure: il bosco chiuso è poco adatto alle mazze di tamburo.");
  }
  if (levers.length === 0 && probability >= 55) {
    levers.push("Le condizioni ci sono già: non rastrellare la lettiera e torna sullo stesso versante tra 1–2 giorni.");
  }

  if (probability < 22 && status === "in-corso") status = "sfavorevole";
  if (probability >= 45 && status === "sfavorevole" && daysUntil !== null) status = "in-arrivo";

  return { speciesId, probability, daysUntil, status, drivers, levers };
}

export function buildSnapshot(
  weathers: SiteWeather[],
  catalog: Site[],
  stations: StationObservation[] = [],
  generatedAt = new Date(),
): ForecastSnapshot {
  const byId = new Map(weathers.map((w) => [w.siteId, w]));
  const sites: SiteForecast[] = catalog.map((site) => {
    const weather = byId.get(site.id);
    if (!weather) {
      return {
        site,
        elevationM: 0,
        weather: {
          precip7dMm: 0,
          precip14dMm: 0,
          precipConsensusMm: 0,
          daysSinceTriggerRain: null,
          soilMoisture: 0,
          soilMoistureRoot: 0,
          soilTempC: 0,
          tempMean7d: 0,
          windMax3dKmh: 0,
          humidityMean: 0,
          waterBalance7dMm: 0,
          modelAgreement: 0,
        },
        species: [],
        bestProbability: 0,
        bestSpecies: null,
      };
    }
    const today = Math.min(TODAY_INDEX_OFFSET, weather.daily.dates.length - 1);
    const precip7dMm = sum(lastN(weather.daily.precipMm, today, 7));
    const precip14dMm = sum(lastN(weather.daily.precipMm, today, 14));
    const precipIcon = sum(lastN(weather.daily.precipIconMm.length ? weather.daily.precipIconMm : weather.daily.precipMm, today, 7));
    const precipLocal = sum(lastN(weather.daily.precipLocalMm?.length ? weather.daily.precipLocalMm : weather.daily.precipMm, today, 7));
    const precipConsensusMm = (precip7dMm + precipIcon + precipLocal) / 3;
    const trig = triggerIndex(weather.daily.precipMm, today);
    const species = (Object.keys(SPECIES) as SpeciesId[]).map((id) =>
      scoreSpecies(speciesIdSafe(id), site, weather.elevationM, weather),
    );
    const best = [...species].sort((a, b) => b.probability - a.probability)[0];
    return {
      site,
      elevationM: weather.elevationM,
      weather: {
        precip7dMm: Math.round(precip7dMm * 10) / 10,
        precip14dMm: Math.round(precip14dMm * 10) / 10,
        precipConsensusMm: Math.round(precipConsensusMm * 10) / 10,
        daysSinceTriggerRain: trig === null ? null : today - trig,
        soilMoisture: Math.round((weather.daily.soilMoistureSurface[today] || 0) * 1000) / 1000,
        soilMoistureRoot: Math.round((weather.daily.soilMoistureRoot[today] || 0) * 1000) / 1000,
        soilTempC: Math.round((weather.daily.soilTempC[today] || 0) * 10) / 10,
        tempMean7d: Math.round(mean(lastN(weather.daily.tempMax, today, 7)) * 10) / 10,
        windMax3dKmh: Math.round(Math.max(...lastN(weather.daily.windMaxKmh, today, 3))),
        humidityMean: Math.round(mean(lastN(weather.daily.humidityMean, today, 7))),
        waterBalance7dMm: Math.round(precipConsensusMm - sum(lastN(weather.daily.et0Mm, today, 7))),
        modelAgreement: weather.modelAgreement,
        nearestStationName: weather.nearestStation?.name,
        nearestStationKm: weather.nearestStation?.distanceKm,
      },
      species,
      bestProbability: best?.probability ?? 0,
      bestSpecies: best?.speciesId ?? null,
    };
  });

  const withSignal = sites.filter((s) => s.bestProbability >= 40);
  const speciesTotals = (Object.keys(SPECIES) as SpeciesId[]).map((id) => ({
    id,
    score: mean(sites.map((s) => s.species.find((x) => x.speciesId === id)?.probability ?? 0)),
  }));
  const topSpecies = [...speciesTotals].sort((a, b) => b.score - a.score)[0]?.id ?? null;

  const listed = stations.length
    ? stations
    : (() => {
        const fallback: StationObservation[] = [];
        const seen = new Set<string>();
        for (const row of weathers) {
          const station = row.nearestStation;
          if (!station || seen.has(station.id)) continue;
          seen.add(station.id);
          fallback.push(station);
        }
        return fallback;
      })();

  return {
    generatedAt: generatedAt.toISOString(),
    timezone: "Europe/Rome",
    nextUpdateAt: nextMidnightRome(generatedAt),
    sources: [
      "ItaliaMeteo ARPAE ICON-2I (2 km) — pioggia, vento e temperatura sul crinale",
      "DWD ICON Seamless — controllo indipendente della pioggia",
      "Open-Meteo suolo — umidità 0–7 cm e 7–28 cm, temperatura del terreno (IFS / ERA5-Land)",
      "Stazioni Aeronautica Militare / METAR di tutta Italia via IEM (aeroporti, capi, valichi e cime)",
      "Nodi piccoli ICON-2I: crinali, valichi e boschi di tutta Italia",
      "Carta degli alberi: vegetazione forestale Regione Toscana + classificazione dei boschi",
      "Evapotraspirazione FAO ET0 — bilancio idrico della lettiera",
      "Quota Open-Meteo / DEM — griglia 1.2 km sul comprensorio di Massa-Carrara",
    ],
    sites,
    stations: listed,
    summary: {
      sitesScanned: sites.length,
      sitesWithSignal: withSignal.length,
      topSpecies,
      stationsUsed: listed.length,
    },
  };
}

function speciesIdSafe(id: string): SpeciesId {
  return id as SpeciesId;
}
