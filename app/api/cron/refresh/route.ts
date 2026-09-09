import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { refreshForecast } from "@/lib/get-forecast";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const snapshot = await refreshForecast(true);
  revalidateTag("forecast", "max");
  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    sites: snapshot.sites.length,
    sitesWithSignal: snapshot.summary.sitesWithSignal,
  });
}
