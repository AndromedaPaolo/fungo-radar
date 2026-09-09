# Spora

Dashboard micologica centrata su **Massa-Carrara**. Sulla mappa un cerchio per **frazione**, **tipo di bosco** e **versante** (frangente o interno), senza sovrapposizioni, con lo stesso schema su tutta Italia. Colore = bosco, opacità = probabilità.

Non è un oracolo. Non mangiare mai un fungo se non sei certo della specie.

## Sito pubblico

Il sito è collegato a GitHub e si aggiorna a ogni push su `main`.

**Indirizzo:** [https://fungo-radar-probe-andromedapaolo.vercel.app](https://fungo-radar-probe-andromedapaolo.vercel.app)

Se compare il login Vercel invece della mappa: nel progetto Vercel apri **Settings → Deployment Protection** e disattiva **Vercel Authentication**. Senza quello il sito resta visibile solo a te.

Il bollettino del giorno è nel deploy (`data/latest.json.gz` / `data/bulletin/`), così la mappa non ricalcola il meteo a ogni visita.
