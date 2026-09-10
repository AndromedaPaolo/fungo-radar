# Spora

Dashboard micologica centrata su **Massa-Carrara**. Sulla mappa un cerchio per **frazione**, **tipo di bosco** e **versante** (frangente o interno), senza sovrapposizioni, con lo stesso schema su tutta Italia. Colore = bosco, opacità = probabilità.

Non è un oracolo. Non mangiare mai un fungo se non sei certo della specie.

## Sito pubblico

**https://fungoapp.vercel.app**

Codice: [github.com/AndromedaPaolo/fungo-radar](https://github.com/AndromedaPaolo/fungo-radar)

Il bollettino del giorno sta in `data/bulletin/` (parti da 4 KB), così il deploy ha la mappa senza ricalcolare il meteo a ogni visita.

## Cosa mostra

- **Frazioni**: Pariana, Pasquilio, Colonnata, Equi, Cerreto… e i grandi boschi italiani (Paneveggio, Cansiglio, Casentino, Sila, Nebrodi…).
- **Tipo di bosco**: castagneto, faggeta, abetina, pineta… un cerchio un bosco, mai uno sopra l’altro.
- **Frangente e versante**: nord/sud/est/ovest e orlo vs interno hanno probabilità diverse.
- **Filtri**: gruppi (Porcini, Colombine, Russole, Galletti, Mazze), tipo di bosco, zona, versante, frangente.
- **Specie commestibili**: porcini (*Boletus edulis, aestivalis, aereus, pinophilus*), colombine (*Amanita vaginata, fulva…*), russole dolci (*R. cyanoxantha, virescens, vesca…*), galletti e finferli (*Cantharellus, Craterellus*), mazze (*Macrolepiota procera, mastoidea*). Solo commestibili; le russole acre non ci sono.
- **Stazioni grandi**: tutta la rete IT__ASOS / Aeronautica Militare (aeroporti, capi, valichi, cime).
- **Stazioni piccole**: crinali e boschi (Pasquilio, Campocecina, Cerreto, Paneveggio, Foresta Umbra, Lorica…).
- Probabilità per porcini, colombine, russole, galletti e mazze di tamburo.

## Avvio locale

```bash
npm install
npx tsx scripts/refresh.ts
npm run dev
```

Apri [http://127.0.0.1:43123](http://127.0.0.1:43123).

`scripts/refresh.ts` scarica i modelli, le osservazioni IEM e scrive `data/latest.json`. Se il file è del giorno (fuso di Roma), la dashboard lo usa senza richiedere di nuovo le API.

## Fonti

| Dato | Fonte |
| --- | --- |
| Pioggia/vento locale 2 km | ItaliaMeteo ARPAE ICON-2I via Open-Meteo |
| Controllo pioggia | DWD ICON Seamless |
| Suolo 0–7 e 7–28 cm | Open-Meteo IFS / ERA5-Land |
| Stazioni grandi | Aeronautica Militare via Iowa Environmental Mesonet (`IT__ASOS`) |
| Nodi piccoli | ICON-2I sui crinali e nei boschi |
| Vegetazione forestale Toscana | Geoscopio WMS `rt_ucs.idvegfor.rt` |
| Quota | DEM Open-Meteo interpolato |

## Aggiornamento alle 00:00

Due automazioni, entrambe a mezzanotte **ora di Roma in estate** (22:00 UTC):

1. **Vercel Cron** — `vercel.json` chiama `GET /api/cron/refresh` ogni giorno alle `0 22 * * *`.
2. **GitHub Action** — `.github/workflows/daily-forecast.yml` ricalcola `data/latest.json`.

## Avvertenze

Rispetta i regolamenti regionali di raccolta, i limiti di chili, i parchi e la proprietà privata. Questo software non sostituisce un micologo.
