import { encodeFunctionData, parseEther, type WalletClient } from "viem";
import { groveAbi } from "./abi";
import { publicClient, sessionWalletClient } from "./chain";
import { GROVE_ADDRESS } from "./config";
import type { SessionBundle } from "./session";

export async function fetchCollectedMask(player: `0x${string}`): Promise<number> {
  if (GROVE_ADDRESS.startsWith("0x0000")) return 0;
  try {
    return Number(
      await publicClient.readContract({
        address: GROVE_ADDRESS,
        abi: groveAbi,
        functionName: "getCollectedMask",
        args: [player],
      })
    );
  } catch {
    return 0;
  }
}

export async function fetchHandles(player: `0x${string}`) {
  if (GROVE_ADDRESS.startsWith("0x0000")) return null;
  try {
    return await publicClient.readContract({
      address: GROVE_ADDRESS,
      abi: groveAbi,
      functionName: "getHandles",
      args: [player],
    });
  } catch {
    return null;
  }
}

export async function isRegistered(player: `0x${string}`) {
  if (GROVE_ADDRESS.startsWith("0x0000")) return false;
  try {
    return (await publicClient.readContract({
      address: GROVE_ADDRESS,
      abi: groveAbi,
      functionName: "registered",
      args: [player],
    })) as boolean;
  } catch {
    return false;
  }
}

/** One-time: register + set session key + fund session with gas from main wallet. */
export async function bootstrapPlayer(
  main: WalletClient,
  account: `0x${string}`,
  session: SessionBundle
) {
  const registered = await isRegistered(account);
  if (!registered) {
    const h = await main.writeContract({
      address: GROVE_ADDRESS,
      abi: groveAbi,
      functionName: "register",
      account,
      chain: main.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: h });
  }

  const h2 = await main.writeContract({
    address: GROVE_ADDRESS,
    abi: groveAbi,
    functionName: "setSessionKey",
    args: [session.address, BigInt(session.expiresAt)],
    account,
    chain: main.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: h2 });

  // Fund session for gas (collects should not prompt main wallet)
  const fund = await main.sendTransaction({
    account,
    chain: main.chain,
    to: session.address,
    value: parseEther("0.002"),
  });
  await publicClient.waitForTransactionReceipt({ hash: fund });
}

/** Collect crystal using session key — no main-wallet popup. */
export async function collectWithSession(session: SessionBundle, crystalId: number) {
  const client = sessionWalletClient(session);
  const data = encodeFunctionData({
    abi: groveAbi,
    functionName: "collect",
    args: [crystalId],
  });
  const hash = await client.sendTransaction({
    to: GROVE_ADDRESS,
    data,
    account: client.account!,
    chain: client.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
