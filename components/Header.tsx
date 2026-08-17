"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { formatUsd } from "@/lib/prices";
import { useMarkets } from "@/lib/useMarkets";
import type { TokenSymbol } from "@/lib/schema";

const CHAIN_LABEL: Record<number, string> = {
  196: "X Layer",
  1952: "X Layer Testnet",
  31337: "Anvil",
};

const TICK: TokenSymbol[] = ["OKB", "ETH", "WBTC", "USDC"];

const NAV = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/desk", label: "Desk" },
];

export function Header() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const markets = useMarkets();
  const path = usePathname();

  return (
    <header className="border-b border-white/[0.06]">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-lime font-mono text-xs font-medium text-void">
              UR
            </span>
            <div>
              <div className="text-sm font-medium tracking-tight">Unrevealed</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
                X Layer · OKB
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-mist-500 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={
                  (n.href === "/" ? path === "/" : path?.startsWith(n.href))
                    ? "text-lime"
                    : "hover:text-mist"
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-mist-500 sm:inline">
              {CHAIN_LABEL[chainId] ?? `chain ${chainId}`}
            </span>
          )}
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-white/[0.04] px-5 py-1.5 md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
              (n.href === "/" ? path === "/" : path?.startsWith(n.href)) ? "text-lime" : "text-mist-500"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto border-t border-white/[0.04] px-5 py-1.5 font-mono text-[10px] text-mist-300">
        {TICK.map((s) => {
          const t = markets.data?.tokens[s];
          if (!t) {
            return (
              <span key={s} className="shrink-0 text-mist-500">
                {s} …
              </span>
            );
          }
          const up = t.change24h >= 0;
          return (
            <span key={s} className="shrink-0 tabular-nums">
              {s} {formatUsd(t.price, t.price >= 100 ? 2 : 4)}{" "}
              <span className={up ? "text-signal" : "text-danger"}>
                {up ? "+" : ""}
                {t.change24h.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </header>
  );
}
