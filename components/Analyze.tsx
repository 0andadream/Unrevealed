"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "./Header";
import { formatUsd } from "@/lib/prices";
import type { OnchainToken } from "@/lib/xlayerToken";
import type { TokenAnalysis } from "@/lib/analyzeToken";

const VERDICT: Record<TokenAnalysis["verdict"], string> = {
  established: "text-signal",
  watch: "text-lime",
  caution: "text-lime",
  high_risk: "text-danger",
  unknown: "text-mist-500",
};

export function Analyze() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<OnchainToken | null>(null);
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  async function run(q: string) {
    const v = q.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: v }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: OnchainToken;
        analysis?: TokenAnalysis;
        model?: string;
        fallback?: boolean;
      };
      if (!res.ok || !data.token || !data.analysis) throw new Error(data.error || "Analyze failed");
      setToken(data.token);
      setAnalysis(data.analysis);
      setMeta(data.fallback ? "local analyzer" : data.model ?? "grok");
    } catch (e) {
      setToken(null);
      setAnalysis(null);
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initial) {
      setQuery(initial);
      void run(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.replace(`/analyze?q=${encodeURIComponent(query.trim())}`);
    void run(query);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Analyzer</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Coin on X Layer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-300">
          Paste any ERC-20 deployed on OKB’s chain. We read the contract on X Layer, pull DexScreener
          if a pool exists, then Grok writes the brief.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x… or OKB"
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-void-800 px-4 font-mono text-sm"
            spellCheck={false}
          />
          <button type="submit" className="btn-lime h-12 px-6" disabled={busy || !query.trim()}>
            {busy ? "Reading chain…" : "Analyze"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        {token && analysis && (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_280px]">
            <article className="panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${VERDICT[analysis.verdict]}`}>{analysis.verdict.replace("_", " ")}</span>
                <span className="chip">score {analysis.score}</span>
                {meta && <span className="chip">{meta}</span>}
              </div>
              <h2 className="mt-4 text-2xl tracking-tight">{analysis.headline}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist-300">{analysis.summary}</p>
              <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">What it is</h3>
              <p className="mt-2 text-sm leading-relaxed">{analysis.whatItIs}</p>
              <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Tokenomics</h3>
              <p className="mt-2 text-sm leading-relaxed">{analysis.tokenomics}</p>
              <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Risks</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist-300">
                {analysis.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Flags</h3>
              <div className="mt-2 space-y-2">
                {analysis.flags.map((f) => (
                  <div key={f.title} className="rounded-xl border border-white/[0.06] px-3 py-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist-500">
                      {f.severity} · {f.title}
                    </div>
                    <div className="mt-1 text-sm">{f.detail}</div>
                  </div>
                ))}
              </div>
              <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Next</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist-300">
                {analysis.nextSteps.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </article>

            <aside className="space-y-4">
              <div className="panel p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">On-chain</div>
                <dl className="mt-3 space-y-2 font-mono text-[12px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist-500">Name</dt>
                    <dd>{token.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist-500">Symbol</dt>
                    <dd>{token.symbol}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist-500">Chain</dt>
                    <dd>{token.chainLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist-500">Decimals</dt>
                    <dd>{token.decimals}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist-500">Supply</dt>
                    <dd className="truncate">
                      {token.totalSupply === "—"
                        ? "—"
                        : Number(token.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  {token.listedPriceUsd != null && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-mist-500">Spot</dt>
                      <dd>{formatUsd(token.listedPriceUsd)}</dd>
                    </div>
                  )}
                </dl>
                {token.address && (
                  <p className="mt-3 break-all font-mono text-[10px] text-mist-500">{token.address}</p>
                )}
                <a
                  href={token.explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs text-lime hover:underline"
                >
                  OKX Explorer
                </a>
              </div>

              {token.pairs.length > 0 && (
                <div className="panel p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
                    X Layer pools
                  </div>
                  <div className="mt-2 space-y-2">
                    {token.pairs.map((p, i) => (
                      <div key={`${p.dex}-${i}`} className="font-mono text-[11px]">
                        <div>
                          {p.dex} / {p.quote}
                        </div>
                        <div className="text-mist-500">
                          {p.priceUsd != null ? formatUsd(p.priceUsd) : "—"} · liq{" "}
                          {p.liquidityUsd != null ? formatUsd(p.liquidityUsd, 0) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link href="/desk" className="btn-ghost w-full">
                Open desk
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
