"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createWalletClient,
  custom,
  type WalletClient,
} from "viem";
import { groveAbi } from "@/lib/abi";
import {
  chain,
  ensureBaseSepolia,
  getEthereum,
  publicClient,
  sessionWalletClient,
} from "@/lib/chain";
import { GROVE_ADDRESS } from "@/lib/config";
import {
  bootstrapPlayer,
  collectWithSession,
  fetchCollectedMask,
  fetchHandles,
  isRegistered,
} from "@/lib/grove";
import { decryptHandles } from "@/lib/inco";
import {
  createSession,
  loadSession,
  type SessionBundle,
} from "@/lib/session";

export type DecryptedStats = {
  dust: number;
  potions: number;
  maps: number;
  xp: number;
  level: number;
  hp: number;
  atk: number;
  def: number;
  luck: number;
  quest: number;
};

const ZERO = "0x" + "0".repeat(64);

export function useGrove() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [session, setSession] = useState<SessionBundle | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mask, setMask] = useState(0);
  const [handles, setHandles] = useState<string[] | null>(null);
  const [stats, setStats] = useState<DecryptedStats | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const push = (m: string) => setLog((l) => [m, ...l].slice(0, 12));

  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const mainClient = useMemo(() => {
    if (typeof window === "undefined" || !address) return null;
    const eth = getEthereum();
    if (!eth) return null;
    return createWalletClient({
      account: address,
      chain,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: custom(eth as any),
    });
  }, [address]);

  const refreshChain = useCallback(async (player: `0x${string}`) => {
    const m = await fetchCollectedMask(player);
    setMask(m);
    const h = await fetchHandles(player);
    if (h) {
      setHandles([
        h[0],
        h[1],
        h[2],
        h[3],
        h[4],
        h[5],
        h[6],
        h[7],
        h[8],
        h[9],
      ] as string[]);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) {
      setError("Install MetaMask (Base Sepolia)");
      return;
    }
    try {
      setBusy("Connecting wallet…");
      await ensureBaseSepolia(eth);
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = accounts[0] as `0x${string}`;
      setAddress(addr);

      let sess = loadSession();
      if (!sess) sess = createSession(48);
      setSession(sess);

      setBusy("Registering & granting session key (one-time)…");
      const main = createWalletClient({
        account: addr,
        chain,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(eth as any),
      });

      // Only bootstrap if session not already on-chain for this player
      const onChainSession = (await publicClient.readContract({
        address: GROVE_ADDRESS,
        abi: groveAbi,
        functionName: "sessionOf",
        args: [addr],
      })) as string;

      if (onChainSession.toLowerCase() !== sess.address.toLowerCase()) {
        await bootstrapPlayer(main, addr, sess);
        push("Session key granted — collects won't prompt your wallet");
      } else {
        const reg = await isRegistered(addr);
        if (!reg) {
          const h = await main.writeContract({
            address: GROVE_ADDRESS,
            abi: groveAbi,
            functionName: "register",
            account: addr,
            chain,
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        push("Welcome back to the Grove");
      }

      await refreshChain(addr);
      setReady(true);
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [refreshChain]);

  const collect = useCallback(
    async (crystalId: number) => {
      if (!session || !address) throw new Error("Connect first");
      setBusy(`Collecting crystal #${crystalId} (session)…`);
      try {
        const hash = await collectWithSession(session, crystalId);
        push(`Collected crystal ${crystalId} · ${hash.slice(0, 10)}…`);
        await refreshChain(address);
        setBusy(null);
        return hash;
      } catch (e) {
        setBusy(null);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [session, address, refreshChain]
  );

  const decryptAll = useCallback(async () => {
    if (!address || !handles) return;
    setBusy("Decrypting private state (Inco)…");
    setError(null);
    try {
      // Prefer session client for decrypt if allowed; else main wallet
      let client: WalletClient | null = null;
      if (session) {
        client = sessionWalletClient(session);
      }
      if (!client?.account && mainClient) client = mainClient;
      if (!client) {
        const eth = getEthereum();
        if (eth) {
          client = createWalletClient({
            account: address,
            chain,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transport: custom(eth as any),
          });
        }
      }
      if (!client) throw new Error("No wallet for decrypt");

      const map = await decryptHandles(client, handles);
      const g = (i: number) => {
        const h = handles[i];
        if (!h || h === ZERO) return 0;
        return Number(map[h] ?? 0n);
      };
      setStats({
        dust: g(0),
        potions: g(1),
        maps: g(2),
        xp: g(3),
        level: g(4) || 1,
        hp: g(5) || 100,
        atk: g(6) || 10,
        def: g(7) || 5,
        luck: g(8) || 5,
        quest: g(9),
      });
      push("Private stats decrypted for your eyes only");
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [address, handles, session, mainClient]);

  // optimistic local dust for UX if decrypt lagging
  const applyOptimisticCollect = useCallback(() => {
    setStats((s) =>
      s
        ? {
            ...s,
            dust: s.dust + 5,
            xp: s.xp + 10,
            quest: Math.min(20, s.quest + 5),
            luck: s.luck + 1,
          }
        : {
            dust: 5,
            potions: 0,
            maps: 0,
            xp: 10,
            level: 1,
            hp: 100,
            atk: 10,
            def: 5,
            luck: 6,
            quest: 5,
          }
    );
  }, []);

  return {
    address,
    short,
    session,
    ready,
    busy,
    error,
    setError,
    mask,
    stats,
    handles,
    log,
    connect,
    collect,
    decryptAll,
    refreshChain,
    applyOptimisticCollect,
    configured: !GROVE_ADDRESS.startsWith("0x0000"),
  };
}
