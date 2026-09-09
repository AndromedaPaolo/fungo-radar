# Spora

Dashboard micologica centrata su **Massa-Carrara**. Sulla mappa un cerchio per **frazione**, **tipo di bosco** e **versante** (frangente o interno), senza sovrapposizioni, con lo stesso schema su tutta Italia. Colore = bosco, opacità = probabilità.

Non è un oracolo. Non mangiare mai un fungo se non sei certo della specie.

## Sito pubblico

Codice: [github.com/AndromedaPaolo/fungo-radar](https://github.com/AndromedaPaolo/fungo-radar)

Progetto Vercel: [vercel.com/andromedapaolo/fungo-app](https://vercel.com/andromedapaolo/fungo-app)

Dopo il deploy l’indirizzo è:

**https://fungo-app-andromedapaolo.vercel.app**

(`fungo-app.vercel.app` è un altro sito, non questo progetto.)

In Vercel, **fungo-app → Settings → Git** deve essere collegato a `AndromedaPaolo/fungo-radar`, branch `main`. Ogni push su `main` rifà il deploy.

Il bollettino del giorno è nel deploy (`data/latest.json.gz` / `data/bulletin/`), così la mappa non ricalcola il meteo a ogni visita.
