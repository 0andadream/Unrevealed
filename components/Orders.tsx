"use client";

import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ADDR, tokenAddress } from "@/lib/config";
import { bookAbi, oracleAbi } from "@/lib/abi";
import { prettyAmount, toUsd8, usd8 } from "@/lib/format";
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
  const order = useReadContract({
    address: ADDR.book || undefined,
    abi: bookAbi,
    functionName: "getOrder",
    args: [id],
    query: { enabled: Boolean(ADDR.book) },
  });
  const ready = useReadContract({
    address: ADDR.book || undefined,
    abi: bookAbi,
    functionName: "conditionMet",
    args: [id],
    query: { enabled: Boolean(ADDR.book), refetchInterval: 4000 },
  });

  const o = order.data;
  if (!o) return null;
  const tin = symbolOf(o.tokenIn) as TokenSymbol;
  const tout = symbolOf(o.tokenOut);
  const op = o.condition === 1 ? "≥" : "≤";
  const status = o.filled ? "filled" : o.cancelled ? "cancelled" : ready.data ? "ready" : "open";

  async function act(kind: "cancel" | "fill") {
    if (!publicClient || !ADDR.book) return;
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
        {symbolOf(o.asset)} {op} ${usd8(o.triggerUsd8).toLocaleString()}
      </div>
      {!o.filled && !o.cancelled && (
        <div className="mt-2 flex gap-2">
          {ready.data && (
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
  const { writeContract, isPending } = useWriteContract();
  const ids = useReadContract({
    address: ADDR.book || undefined,
    abi: bookAbi,
    functionName: "ordersOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(ADDR.book && address), refetchInterval: 5000 },
  });

  const list = [...(ids.data ?? [])].reverse();

  function nudge(symbol: string, price: number) {
    const asset = tokenAddress(symbol);
    if (!asset || !ADDR.oracle) return;
    writeContract({
      address: ADDR.oracle,
      abi: oracleAbi,
      functionName: "setPrice",
      args: [asset, toUsd8(price)],
    });
  }

  return (
    <aside className="panel p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">Orders</div>
      {!address && <p className="text-xs text-mist-500">Connect to see your book.</p>}
      {address && list.length === 0 && <p className="text-xs text-mist-500">No orders yet.</p>}
      <div className="max-h-[320px] overflow-y-auto">
        {list.map((id) => (
          <OrderRow key={id.toString()} id={id} />
        ))}
      </div>
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
          Demo prices
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => nudge("OKB", 60)}>
            OKB $60
          </button>
          <button className="btn-ghost !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => nudge("OKB", 50)}>
            OKB $50
          </button>
          <button className="btn-ghost !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => nudge("ETH", 2600)}>
            ETH $2600
          </button>
          <button className="btn-ghost !px-3 !py-1 text-[11px]" disabled={isPending} onClick={() => nudge("ETH", 2800)}>
            ETH $2800
          </button>
        </div>
        <p className="mt-2 text-[11px] text-mist-500">
          Permissionless oracle — push a price so a resting limit can fill.
        </p>
      </div>
    </aside>
  );
}
