"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import type { TradeIntent } from "@/lib/schema";
import { Header } from "./Header";
import { Balances } from "./Balances";
import { Orders } from "./Orders";
import { Ticket } from "./Ticket";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: TradeIntent;
  meta?: string;
};

const EXAMPLES = [
  "swap 5 OKB for USDC",
  "dump my OKB into USDC once it pumps past 55 bucks",
  "swap half my USDT for ETH if it drops below 2800",
  "cancel my order #1",
];

export function Desk() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "hello",
      role: "assistant",
      text: "Say the trade. I'll parse it into a swap or a price-triggered limit on X Layer. OKB, USDC, USDT, ETH, WBTC.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  function lastClarify() {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].intent?.action === "clarify" && msgs[i].intent?.clarifyingQuestion) {
        return msgs[i].intent!.clarifyingQuestion!;
      }
    }
    return undefined;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    const user: Msg = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMsgs((m) => [...m, user]);
    setBusy(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, prior: lastClarify() }),
      });
      const data = (await res.json()) as {
        intent?: TradeIntent;
        model?: string;
        fallback?: boolean;
        error?: string;
      };
      if (!data.intent) throw new Error(data.error || "parse failed");
      const summary =
        data.intent.action === "clarify"
          ? data.intent.clarifyingQuestion ?? "Need a bit more."
          : data.intent.action === "cancel"
            ? `Cancel order #${data.intent.orderIdToCancel}.`
            : data.intent.action === "limit_order"
              ? `Limit: ${data.intent.amountIn} ${data.intent.tokenIn} → ${data.intent.tokenOut}.`
              : `Swap ${data.intent.amountIn} ${data.intent.tokenIn} → ${data.intent.tokenOut}.`;
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: summary,
          intent: data.intent,
          meta: data.fallback ? "local parser" : data.model,
        },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Could not parse that.",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <Balances />
        <section className="panel flex min-h-[70vh] flex-col overflow-hidden">
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-8 text-right" : "mr-8"}>
                <div
                  className={
                    m.role === "user"
                      ? "inline-block rounded-2xl bg-void-600 px-3 py-2 text-sm"
                      : "text-sm leading-relaxed text-mist"
                  }
                >
                  {m.text}
                </div>
                {m.meta && (
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mist-500">
                    {m.meta}
                  </div>
                )}
                {m.intent && (
                  <Ticket
                    intent={m.intent}
                    onDone={(text) =>
                      setMsgs((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text }])
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="rounded-full border border-white/10 px-2.5 py-1 text-left text-[11px] text-mist-300 hover:border-lime/40 hover:text-lime"
                  onClick={() => send(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2 rounded-2xl border border-white/10 bg-void px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="swap 5 OKB for USDC"
                className="max-h-28 min-h-[28px] resize-none py-1 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-void disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp size={16} />
              </button>
            </form>
          </div>
        </section>
        <Orders />
      </div>
    </div>
  );
}
