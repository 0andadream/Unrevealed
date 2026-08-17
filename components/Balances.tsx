"use client";

import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { ADDR } from "@/lib/config";
import { erc20Abi, faucetAbi } from "@/lib/abi";
import { prettyAmount, fromUnits } from "@/lib/format";
import { formatUsd } from "@/lib/prices";
import { useMarkets } from "@/lib/useMarkets";
import type { TokenSymbol } from "@/lib/schema";
import { SUPPORTED_TOKENS } from "@/lib/schema";

const META: { symbol: TokenSymbol; address: `0x${string}` | ""; native?: boolean }[] = [
  { symbol: "OKB", address: ADDR.wokb, native: true },
  { symbol: "USDC", address: ADDR.usdc },
  { symbol: "USDT", address: ADDR.usdt },
  { symbol: "ETH", address: ADDR.eth },
  { symbol: "WBTC", address: ADDR.wbtc },
];

function Row({
  symbol,
  address,
  native,
  owner,
}: {
  symbol: TokenSymbol;
  address: `0x${string}` | "";
  native?: boolean;
  owner?: `0x${string}`;
}) {
  const markets = useMarkets();
  const nativeBal = useBalance({ address: owner, query: { enabled: Boolean(native && owner) } });
  const erc20 = useReadContract({
    address: address || undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(!native && address && owner) },
  });

  const raw = native ? nativeBal.data?.value : erc20.data;
  const stat = markets.data?.tokens[symbol];
  const held = raw != null ? Number(fromUnits(raw, symbol)) : null;
  const usd = held != null && stat ? held * stat.price : null;
  const up = (stat?.change24h ?? 0) >= 0;

  return (
    <div className="border-t border-white/[0.05] py-2 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm">{symbol}</div>
        <div className="font-mono text-sm tabular-nums">
          {raw == null ? "—" : prettyAmount(raw, symbol)}
        </div>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 font-mono text-[10px]">
        <span className="text-mist-500">
          {stat ? formatUsd(stat.price, stat.price >= 100 ? 2 : 4) : markets.isLoading ? "…" : "—"}
          {stat && (
            <span className={`ml-1.5 ${up ? "text-signal" : "text-danger"}`}>
              {up ? "+" : ""}
              {stat.change24h.toFixed(2)}%
            </span>
          )}
        </span>
        <span className="text-mist-500">{usd == null ? "" : formatUsd(usd)}</span>
      </div>
    </div>
  );
}

export function Balances() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const markets = useMarkets();

  return (
    <aside className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Wallet</div>
          <div className="mt-0.5 font-mono text-[10px] text-mist-500/80">
            {markets.data
              ? `${markets.data.source} · ${new Date(markets.data.updatedAt).toLocaleTimeString()}`
              : markets.isError
                ? "feed error"
                : "loading feed…"}
          </div>
        </div>
        {ADDR.faucet ? (
          <button
            className="btn-ghost !px-3 !py-1 text-[11px]"
            disabled={!address || isPending}
            onClick={() =>
              writeContract({
                address: ADDR.faucet as `0x${string}`,
                abi: faucetAbi,
                functionName: "drip",
              })
            }
          >
            {isPending ? "Dripping…" : "Faucet"}
          </button>
        ) : null}
      </div>
      {SUPPORTED_TOKENS.map((s) => {
        const m = META.find((x) => x.symbol === s)!;
        return <Row key={s} symbol={s} address={m.address} native={m.native} owner={address} />;
      })}
      <p className="mt-3 text-[11px] leading-relaxed text-mist-500">
        Prices are live spot. On testnet/Anvil the ERC-20s are still faucet mints — OKB is native gas.
      </p>
    </aside>
  );
}
