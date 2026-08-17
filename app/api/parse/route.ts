import { NextResponse } from "next/server";
import OpenAI from "openai";
import { extractJson, parseLocal } from "@/lib/parseLocal";
import { intentSchema, PARSER_SYSTEM } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { message?: string; prior?: string };
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      intent: parseLocal(message, body.prior),
      model: "local-heuristic",
      fallback: true,
    });
  }

  try {
    const client = new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
    const user = body.prior
      ? `Previous assistant question:\n${body.prior}\n\nUser reply:\n${message}`
      : message;

    const completion = await client.chat.completions.create({
      model: "grok-4.6",
      temperature: 0,
      messages: [
        { role: "system", content: PARSER_SYSTEM },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const intent = intentSchema.parse(extractJson(raw));
    return NextResponse.json({ intent, model: "grok-4.6", fallback: false });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "parse failed";
    return NextResponse.json({
      intent: parseLocal(message, body.prior),
      model: "local-heuristic",
      fallback: true,
      warning: reason,
    });
  }
}
