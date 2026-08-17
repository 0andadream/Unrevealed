import { NextResponse } from "next/server";
import { fetchLiveMarkets } from "@/lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await fetchLiveMarkets();
    return NextResponse.json(markets, {
      headers: { "cache-control": "public, s-maxage=8, stale-while-revalidate=20" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "prices unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
