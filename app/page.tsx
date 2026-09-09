import { Dashboard } from "@/components/dashboard";
import { getForecast } from "@/lib/get-forecast";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function Home() {
  let snapshot = null;
  let loadError: string | null = null;
  try {
    snapshot = await getForecast();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Impossibile leggere meteo e suolo in questo momento.";
  }

  return <Dashboard initial={snapshot} loadError={loadError} />;
}
