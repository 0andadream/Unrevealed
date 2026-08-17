"use client";

import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ADDR, tokenAddress } from "@/lib/config";
import { bookAbi, oracleAbi } from "@/lib/abi";
import { prettyAmount, toUsd8, usd8 } from "@/lib/format";
import { conditionMetLive, formatUsd } from "@/lib/prices";
import { useMarkets } from "@/lib/useMarkets";
import type { TokenSymbol } from "@/lib/schema";
import { SUPPORTED_TOKENS } from "@/lib/schema";

function symbolOf(addr: string): string {
  const a = addr.toLowerCase();
  for (const s of SUPPORTED_TOKENS) {
    const t = tokenAddress(s);
    if (t && t.toLowerCase() === a) return s;
  }
  return addr.slice(0, 6);
}

function OrderRow({ id }: { id: bigint }) {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const markets = useMarkets();
  const order = useReadContract({
    address: ADDR.book || undefined,
    abi: bookAbi,
    functionName: "getOrder",
    args: [id],
    query: { enabled: Boolean(ADDR.book) },
  });

  const o = order.data;
  if (!o) return null;
  const tin = symbolOf(o.tokenIn) as TokenSymbol;
  const tout = symbolOf(o.tokenOut);
  const asset = symbolOf(o.asset) as TokenSymbol;
  const op = o.condition === 1 ? "≥" : "≤";
  const trigger = usd8(o.triggerUsd8);
  const live = markets.data?.tokens[asset]?.price;
  const ready = conditionMetLive(o.condition, trigger, live);
  const status = o.filled ? "filled" : o.cancelled ? "cancelled" : ready ? "ready" : "open";

  async function act(kind: "cancel" | "fill") {
    if (!publicClient || !ADDR.book) return;
    if (kind === "fill") {
      const assetAddr = tokenAddress(asset);
      if (!assetAddr || !ADDR.oracle || live == null) return;
      const pxHash = await writeContractAsync({
        address: ADDR.oracle,
        abi: oracleAbi,
        functionName: "setPrice",
        args: [assetAddr, toUsd8(live)],
      });
      await publicClient.waitForTransactionReceipt({ hash: pxHash });
    }
    const hash = await writeContractAsync({
      address: ADDR.book,
      abi: bookAbi,
      functionName: kind === "cancel" ? "cancel" : "execute",
      args: kind === "cancel" ? [id] : [id, 1n],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  return (
    <div className="border-t border-white/[0.05] py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-mist-500">#{id.toString()}</span>
        <span className={`chip ${status === "ready" ? "border-lime/40 text-lime" : ""}`}>{status}</span>
      </div>
      <div className="mt-1 text-sm">
        {prettyAmount(o.amountIn, tin)} {tin} → {tout}
      </div>
      <div className="font-mono text-[11px] text-mist-500">
        {asset} {op} {formatUsd(trigger)}
        {live != null && <span className="ml-1.5">now {formatUsd(live)}</span>}
      </div>
      {!o.filled && !o.cancelled && (
        <div className="mt-2 flex gap-2">
          {ready && (
            <button className="btn-lime !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => act("fill")}>
              Fill
            </button>
          )}
          <button className="btn-ghost !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => act("cancel")}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function Orders() {
  const { address } = useAccount();
  const markets = useMarkets();
  const ids = useReadContract({
    address: ADDR.book || undefined,
    abi: bookAbi,
    functionName: "ordersOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(ADDR.book && address), refetchInterval: 5000 },
  });

  const list = [...(ids.data ?? [])].reverse();
  const tokens = markets.data?.tokens;

  return (
    <aside className="panel p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Orders</div>
      {!address && <p className="text-xs text-mist-500">Connect to see your book.</p>}
      {address && list.length === 0 && <p className="text-xs text-mist-500">No orders yet.</p>}
      <div className="max-h-[280px] overflow-y-auto">
        {list.map((id) => (
          <OrderRow key={id.toString()} id={id} />
        ))}
      </div>
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
          Live market
        </div>
        {markets.isError && <p className="text-xs text-danger">Could not reach the spot feed.</p>}
        {tokens &&
          (["OKB", "ETH", "WBTC"] as TokenSymbol[]).map((s) => {
            const t = tokens[s];
            const up = t.change24h >= 0;
            return (
              <div key={s} className="flex items-baseline justify-between py-1 font-mono text-[11px]">
                <span>{s}</span>
                <span className="tabular-nums">
                  {formatUsd(t.price)}
                  <span className={`ml-2 ${up ? "text-signal" : "text-danger"}`}>
                    {up ? "+" : ""}
                    {t.change24h.toFixed(2)}%
                  </span>
                </span>
              </div>
            );
          })}
        {tokens && (
          <div className="mt-2 space-y-0.5 font-mono text-[10px] text-mist-500">
            <div>OKB 24h {formatUsd(tokens.OKB.low24h)} – {formatUsd(tokens.OKB.high24h)}</div>
            <div>OKB vol {formatUsd(tokens.OKB.volume24h, 0)}</div>
            {tokens.OKB.marketCap != null && <div>OKB mcap {formatUsd(tokens.OKB.marketCap, 0)}</div>}
            <div className="pt-1">{markets.data?.source} spot · refreshes ~12s</div>
          </div>
        )}
      </div>
    </aside>
  );
}
