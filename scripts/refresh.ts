import { refreshForecast } from "../lib/get-forecast";

async function main() {
  const snapshot = await refreshForecast(true);
  console.log(
    `Previsione aggiornata ${snapshot.generatedAt}: ${snapshot.sites.length} siti, ${snapshot.summary.sitesWithSignal} con segnale.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
