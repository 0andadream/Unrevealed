import { Lightning } from "@inco/lightning-js/lite";
import type { HexString } from "@inco/lightning-js";
import type { WalletClient } from "viem";
import { RPC_URLS } from "./config";

let zap: Lightning | null = null;

export async function getZap() {
  if (!zap) {
    zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: RPC_URLS });
  }
  return zap;
}

export async function decryptHandles(
  walletClient: WalletClient,
  handles: (`0x${string}` | string)[]
): Promise<Record<string, bigint>> {
  const valid = handles.filter(
    (h) => h && h !== "0x" + "0".repeat(64)
  ) as HexString[];
  if (!valid.length) return {};

  const z = await getZap();
  const results = await z.attestedDecrypt(walletClient as never, valid, {
    backoffConfig: { maxRetries: 14, baseDelayInMs: 1200, backoffFactor: 1.35 },
  });

  const out: Record<string, bigint> = {};
  results.forEach((r, i) => {
    const key = valid[i];
    const v = r.plaintext?.value as unknown;
    if (typeof v === "bigint") out[key] = v;
    else if (typeof v === "number") out[key] = BigInt(v);
    else if (typeof v === "boolean") out[key] = v ? 1n : 0n;
    else out[key] = BigInt(String(v ?? 0));
  });
  return out;
}
