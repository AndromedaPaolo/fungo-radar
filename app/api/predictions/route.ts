import { gzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { getForecast } from "@/lib/get-forecast";

export const maxDuration = 60;

export async function GET() {
  try {
    const snapshot = await getForecast();
    const body = gzipSync(JSON.stringify(snapshot));
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Encoding": "gzip",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore nel calcolo della previsione";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
