import { NextResponse } from "next/server";
import { getForecast } from "@/lib/get-forecast";

export const maxDuration = 120;

export async function GET() {
  try {
    const snapshot = await getForecast();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore nel calcolo della previsione";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
