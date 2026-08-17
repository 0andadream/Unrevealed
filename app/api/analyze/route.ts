import { NextResponse } from "next/server";
import { analyzeWithGrok } from "@/lib/analyzeToken";
import { inspectXLayerToken } from "@/lib/xlayerToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = (body.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "Paste a token address or OKB." }, { status: 400 });

  try {
    const token = await inspectXLayerToken(query);
    const { analysis, model, fallback } = await analyzeWithGrok(token);
    return NextResponse.json({ token, analysis, model, fallback });
  } catch (err) {
    const message = err instanceof Error ? err.message : "analyze failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
