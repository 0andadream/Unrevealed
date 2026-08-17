"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "./Header";
import { useMarkets } from "@/lib/useMarkets";
import { formatUsd } from "@/lib/prices";
import type { TokenSymbol } from "@/lib/schema";

const EXAMPLES = [
  { label: "OKB (native)", query: "OKB" },
  { label: "Circle USDC", query: "0xB6CEceAB302E2E4948951eE7843FC24E92933061" },
];

const CARDS: TokenSymbol[] = ["OKB", "ETH", "WBTC", "USDC"];

export function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const markets = useMarkets();

  function go(q: string) {
    const v = q.trim();
    if (!v) return;
    router.push(`/analyze?q=${encodeURIComponent(v)}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    go(query);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-16 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">X Layer · OKB chain</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-medium tracking-tight sm:text-5xl">
          See the coin before you trade it.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-mist-300">
          Unrevealed reads a token actually deployed on X Layer — name, supply, owner, DEX print —
          then Grok writes the risk. The desk is for saying the swap in English.
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste a token 0x address on X Layer, or OKB"
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-void-800 px-4 font-mono text-sm"
            spellCheck={false}
          />
          <button type="submit" className="btn-lime h-12 px-6">
            Analyze coin
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.query}
              type="button"
              className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-mist-300 hover:border-lime/40 hover:text-lime"
              onClick={() => go(ex.query)}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/analyze" className="btn-ghost">
            Open analyzer
          </Link>
          <Link href="/desk" className="btn-ghost">
            Open trading desk
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <section className="mt-14">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
            Live spot
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((s) => {
              const t = markets.data?.tokens[s];
              const up = (t?.change24h ?? 0) >= 0;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === "OKB") go("OKB");
                    else if (s === "USDC") go(EXAMPLES[1].query);
                  }}
                  className="panel p-4 text-left transition hover:border-lime/30"
                >
                  <div className="text-sm">{s}</div>
                  <div className="mt-2 font-mono text-xl tabular-nums">
                    {t ? formatUsd(t.price, t.price >= 100 ? 2 : 4) : "…"}
                  </div>
                  <div className={`mt-1 font-mono text-[11px] ${up ? "text-signal" : "text-danger"}`}>
                    {t ? `${up ? "+" : ""}${t.change24h.toFixed(2)}% 24h` : "loading"}
                  </div>
                  {t && (
                    <div className="mt-2 font-mono text-[10px] text-mist-500">
                      vol {formatUsd(t.volume24h, 0)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-mist-500">
            OKB and Circle USDC are one click. Any other coin: paste its X Layer contract from OKX Explorer.
          </p>
        </section>
      </main>
    </div>
  );
}
