"use client";

import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { ADDR } from "@/lib/config";
import { erc20Abi, faucetAbi, oracleAbi } from "@/lib/abi";
import { prettyAmount, usd8 } from "@/lib/format";
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
  const nativeBal = useBalance({ address: owner, query: { enabled: Boolean(native && owner) } });
  const erc20 = useReadContract({
    address: address || undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(!native && address && owner) },
  });
  const price = useReadContract({
    address: ADDR.oracle || undefined,
    abi: oracleAbi,
    functionName: "usdPrice",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(ADDR.oracle && address) },
  });

  const raw = native ? nativeBal.data?.value : erc20.data;
  const px = price.data != null ? usd8(price.data) : null;

  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div>
        <div className="text-sm">{symbol}</div>
        {px != null && (
          <div className="font-mono text-[10px] text-mist-500">
            ${px.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
      <div className="font-mono text-sm tabular-nums">
        {raw == null ? "—" : prettyAmount(raw, symbol)}
      </div>
    </div>
  );
}

export function Balances() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  return (
    <aside className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Balances</div>
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
        OKB is native gas. USDC/USDT/ETH/WBTC are demo mocks — drip the faucet, then talk to the desk.
      </p>
    </aside>
  );
}
