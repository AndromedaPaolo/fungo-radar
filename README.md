# Spora

Dashboard micologica centrata su **Massa-Carrara**. Sulla mappa un cerchio per **frazione**, **tipo di bosco** e **versante** (frangente o interno), senza sovrapposizioni, con lo stesso schema su tutta Italia. Colore = bosco, opacità = probabilità.

Non è un oracolo. Non mangiare mai un fungo se non sei certo della specie.

## Sito pubblico

Apri questo indirizzo (la mappa è online, senza login Vercel):

**https://temporary-quick-thunder-6kipq7p.vercel.app**

Per tenerlo sempre online: [claim del deploy](https://vercel.com/claim-deployment?code=4be6df8b-5c28-45ab-953f-dee69b03da0b) con l’account Vercel collegato a GitHub.

I nomi `fungo-radar-probe.vercel.app` e `fungo-radar-probe-andromedapaolo.vercel.app` rispondono **404**: il progetto GitHub `fungo-radar-probe` non ha un hostname pubblico (i check su GitHub sono verdi, ma Vercel non pubblica l’alias).

Il bollettino del giorno è nel deploy (`data/latest.json.gz` / `data/bulletin/`), così la mappa non ricalcola il meteo a ogni visita.
