"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";

const CHAIN_LABEL: Record<number, string> = {
  196: "X Layer",
  1952: "X Layer Testnet",
  31337: "Anvil",
};

export function Header() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-lime font-mono text-xs font-medium text-void">
          UR
        </span>
        <div>
          <div className="text-sm font-medium tracking-tight">Unrevealed</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
            X Layer · NL desk
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isConnected && (
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-mist-500 sm:inline">
            {CHAIN_LABEL[chainId] ?? `chain ${chainId}`}
          </span>
        )}
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
      </div>
    </header>
  );
}
