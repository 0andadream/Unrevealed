"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { ADDR, contractsReady, tokenAddress } from "@/lib/config";
import { bookAbi, erc20Abi, poolAbi } from "@/lib/abi";
import { prettyAmount, toUnits, toUsd8 } from "@/lib/format";
import { explorerTx } from "@/lib/chains";
import type { TradeIntent } from "@/lib/schema";

function condLabel(intent: TradeIntent) {
  const c = intent.condition;
  if (!c || c.type === "none" || c.value == null) return null;
  const op = c.type === "price_above" ? "≥" : "≤";
  return `${c.asset ?? "asset"} ${op} $${c.value}`;
}

export function Ticket({
  intent,
  onDone,
}: {
  intent: TradeIntent;
  onDone: (text: string) => void;
}) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [err, setErr] = useState<string | null>(null);

  const tokenIn = intent.tokenIn ?? "";
  const tokenOut = intent.tokenOut ?? "";
  const inAddr = tokenAddress(tokenIn);
  const outAddr = tokenAddress(tokenOut);
  const nativeIn = tokenIn.toUpperCase() === "OKB";

  const nativeBal = useBalance({ address, query: { enabled: Boolean(nativeIn && address) } });
  const ercBal = useReadContract({
    address: inAddr || undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(!nativeIn && inAddr && address) },
  });

  const amount = useMemo(() => {
    if (!intent.amountIn) return null;
    const bal = nativeIn ? nativeBal.data?.value : ercBal.data;
    if (intent.amountIn === "ALL") {
      if (bal == null) return null;
      if (nativeIn) {
        const gas = 10n ** 16n; // 0.01 OKB
        return bal > gas ? bal - gas : 0n;
      }
      return bal;
    }
    if (intent.amountIn === "HALF") {
      if (bal == null) return null;
      return bal / 2n;
    }
    try {
      return toUnits(intent.amountIn, tokenIn);
    } catch {
      return null;
    }
  }, [intent.amountIn, nativeIn, nativeBal.data?.value, ercBal.data, tokenIn]);

  const quote = useReadContract({
    address: ADDR.pool || undefined,
    abi: poolAbi,
    functionName: "quote",
    args: inAddr && outAddr && amount != null ? [inAddr, outAddr, amount] : undefined,
    query: { enabled: Boolean(ADDR.pool && inAddr && outAddr && amount != null && amount > 0n) },
  });

  async function ensureAllowance(spender: `0x${string}`) {
    if (nativeIn || !inAddr || !address || amount == null) return;
    const current = (await publicClient!.readContract({
      address: inAddr,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, spender],
    })) as bigint;
    if (current >= amount) return;
    const hash = await writeContractAsync({
      address: inAddr,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  async function runSwap() {
    if (!address || !inAddr || !outAddr || amount == null) return;
    setErr(null);
    try {
      if (!ADDR.pool) throw new Error("pool not configured");
      if (!nativeIn) await ensureAllowance(ADDR.pool);
      const minOut = quote.data ? (quote.data * 99n) / 100n : 1n;
      const hash = await writeContractAsync({
        address: ADDR.pool,
        abi: poolAbi,
        functionName: "swap",
        args: [inAddr, outAddr, amount, minOut, address],
        value: nativeIn ? amount : 0n,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      onDone(`Swap sent. ${explorerTx(chainId ?? 0, hash)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "swap failed");
    }
  }

  async function runLimit() {
    if (!address || !inAddr || !outAddr || amount == null || !intent.condition) return;
    setErr(null);
    try {
      if (!ADDR.book) throw new Error("book not configured");
      if (!nativeIn) await ensureAllowance(ADDR.book);
      const cond = intent.condition.type === "price_above" ? 1 : 2;
      const asset = tokenAddress(intent.condition.asset ?? tokenIn);
      if (!asset || intent.condition.value == null) {
        setErr("Missing condition asset or price.");
        return;
      }
      const hash = await writeContractAsync({
        address: ADDR.book,
        abi: bookAbi,
        functionName: "place",
        args: [inAddr, outAddr, amount, cond, asset, toUsd8(intent.condition.value)],
        value: nativeIn ? amount : 0n,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      onDone(`Limit order escrowed. Fills when ${condLabel(intent)}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "place failed");
    }
  }

  async function runCancel() {
    if (!intent.orderIdToCancel || !ADDR.book) return;
    setErr(null);
    try {
      const hash = await writeContractAsync({
        address: ADDR.book,
        abi: bookAbi,
        functionName: "cancel",
        args: [BigInt(intent.orderIdToCancel)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      onDone(`Cancelled order #${intent.orderIdToCancel}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "cancel failed");
    }
  }

  if (intent.action === "clarify") {
    return (
      <div className="panel mt-2 border-lime/20 p-3">
        <div className="chip mb-2">clarify · {intent.confidence}</div>
        <p className="text-sm leading-relaxed">{intent.clarifyingQuestion}</p>
      </div>
    );
  }

  if (!contractsReady()) {
    return (
      <div className="panel mt-2 p-3 text-sm text-mist-300">
        Contracts are not configured. Run the local deploy script or set NEXT_PUBLIC_* addresses.
      </div>
    );
  }

  return (
    <div className="panel mt-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="chip">
          {intent.action.replace("_", " ")} · {intent.confidence}
        </span>
        {condLabel(intent) && <span className="font-mono text-[11px] text-lime">{condLabel(intent)}</span>}
      </div>
      {intent.action !== "cancel" ? (
        <div className="mb-3">
          <div className="font-mono text-lg tracking-tight">
            {intent.amountIn} {intent.tokenIn}
            <span className="mx-2 text-mist-500">→</span>
            {intent.tokenOut}
          </div>
          {quote.data != null && amount != null && (
            <div className="mt-1 font-mono text-xs text-mist-500">
              quote ≈ {prettyAmount(quote.data, tokenOut)} {tokenOut}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 font-mono text-lg">Cancel #{intent.orderIdToCancel}</div>
      )}
      {!address && <p className="text-xs text-mist-500">Connect a wallet to sign.</p>}
      <div className="flex flex-wrap gap-2">
        {intent.action === "swap" && (
          <button className="btn-lime" disabled={!address || !amount || isPending} onClick={runSwap}>
            {isPending ? "Signing…" : "Confirm swap"}
          </button>
        )}
        {intent.action === "limit_order" && (
          <button className="btn-lime" disabled={!address || !amount || isPending} onClick={runLimit}>
            {isPending ? "Signing…" : "Place limit"}
          </button>
        )}
        {intent.action === "cancel" && (
          <button className="btn-lime" disabled={!address || isPending} onClick={runCancel}>
            {isPending ? "Signing…" : "Cancel order"}
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-danger">{err}</p>}
    </div>
  );
}
