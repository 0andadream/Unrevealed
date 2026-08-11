import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { CHAIN_ID, RPC_URLS } from "./config";
import type { SessionBundle } from "./session";

export const chain = {
  ...baseSepolia,
  id: CHAIN_ID,
  rpcUrls: {
    default: { http: RPC_URLS as [string, ...string[]] },
    public: { http: RPC_URLS as [string, ...string[]] },
  },
};

export const publicClient = createPublicClient({
  chain,
  transport: fallback(RPC_URLS.map((u) => http(u, { timeout: 20_000 }))),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEthereum(): any {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: unknown }).ethereum ?? null;
}

export function browserWalletClient(): WalletClient | null {
  const ethereum = getEthereum();
  if (!ethereum) return null;
  return createWalletClient({
    chain,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom(ethereum as any),
  });
}

export function sessionWalletClient(session: SessionBundle): WalletClient {
  const account = privateKeyToAccount(session.privateKey);
  return createWalletClient({
    account,
    chain,
    transport: http(RPC_URLS[0]),
  });
}

export async function ensureBaseSepolia(ethereum: {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
}) {
  const cid = Number(await ethereum.request({ method: "eth_chainId" }));
  if (cid === CHAIN_ID) return;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: "Base Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: RPC_URLS,
          blockExplorerUrls: ["https://sepolia.basescan.org"],
        },
      ],
    });
  }
}
