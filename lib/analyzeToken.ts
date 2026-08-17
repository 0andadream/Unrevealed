import OpenAI from "openai";
import { z } from "zod";
import { extractJson } from "./parseLocal";
import type { OnchainToken } from "./xlayerToken";

export const analysisSchema = z.object({
  verdict: z.enum(["established", "watch", "caution", "high_risk", "unknown"]),
  score: z.number().min(0).max(100),
  headline: z.string(),
  summary: z.string(),
  whatItIs: z.string(),
  tokenomics: z.string(),
  risks: z.array(z.string()).min(1),
  flags: z.array(
    z.object({
      severity: z.enum(["info", "low", "medium", "high"]),
      title: z.string(),
      detail: z.string(),
    }),
  ),
  nextSteps: z.array(z.string()).min(1),
});

export type TokenAnalysis = z.infer<typeof analysisSchema>;

const SYSTEM = `You analyze tokens deployed on X Layer (OKX's EVM L2, native gas = OKB).

You receive ONLY measured on-chain / market facts. Do not invent holders, audits, team names, unlocks, or prices that are not in the facts.

Return ONLY JSON:
{
  "verdict": "established" | "watch" | "caution" | "high_risk" | "unknown",
  "score": 0-100 (higher = more trustworthy given the facts),
  "headline": string (max 90 chars),
  "summary": 3-5 sentences, plain English,
  "whatItIs": 1-2 sentences,
  "tokenomics": 2-4 sentences from supply / decimals / owner / DEX liquidity only,
  "risks": string[],
  "flags": [{ "severity": "info"|"low"|"medium"|"high", "title": string, "detail": string }],
  "nextSteps": string[]
}

Guidance:
- Native OKB is the gas token. Treat it as established infrastructure, not a random meme.
- Circle-style stables with deep X Layer liquidity → established.
- Contract exists but no X Layer DEX liquidity → watch or caution.
- Ownable + no liquidity + tiny bytecode or missing name/symbol → caution / high_risk.
- Never tell the user to ape. Next steps should be verify-on-explorer, check LP lock, wallet revoke, size small.`;

export async function analyzeWithGrok(token: OnchainToken): Promise<{
  analysis: TokenAnalysis;
  model: string;
  fallback: boolean;
}> {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return { analysis: localAnalysis(token), model: "local-heuristic", fallback: true };
  }
  try {
    const client = new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
    const completion = await client.chat.completions.create({
      model: "grok-4.6",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Facts:\n${JSON.stringify(token, null, 2)}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    return { analysis: analysisSchema.parse(extractJson(raw)), model: "grok-4.6", fallback: false };
  } catch {
    return { analysis: localAnalysis(token), model: "local-heuristic", fallback: true };
  }
}

export function localAnalysis(token: OnchainToken): TokenAnalysis {
  if (token.isNative) {
    return {
      verdict: "established",
      score: 92,
      headline: "OKB is X Layer’s native gas token",
      summary:
        "OKB is the native asset of X Layer, OKX’s EVM L2. Fees settle in OKB, not a random ERC-20. That puts it in a different class from a freshly deployed meme: issuance and utility are chain-level, not a single unverified contract. Use the live spot print in the ticker — do not treat a testnet faucet balance as the market.",
      whatItIs: "Native currency of X Layer. There is no ERC-20 you need to approve to hold it.",
      tokenomics:
        "Supply and unlocks are not readable from a token contract because there isn’t one. Price on the desk is the live OKX/CoinGecko spot print.",
      risks: [
        "Exchange and L2 operational risk sit with OKX / X Layer, not a token admin key.",
        "Wrapped OKB (WOKB) on a random address is not the same as native OKB — always check the wrapper.",
      ],
      flags: [
        { severity: "info", title: "Native asset", detail: "No ERC-20 contract. Gas token of chain id 196." },
      ],
      nextSteps: [
        "Confirm you are on X Layer (196) or X Layer Testnet (1952), not a lookalike chain.",
        "For a deployed coin, paste its 0x contract — that is what this analyzer is for.",
      ],
    };
  }

  const knownUsdc = token.address?.toLowerCase() === "0xb6ceceab302e2e4948951ee7843fc24e92933061";
  const liq = token.pairs.reduce((s, p) => s + (p.liquidityUsd ?? 0), 0);
  const hasMeta = Boolean(token.name && token.symbol && token.symbol !== "???");
  const hasDex = token.pairs.length > 0 && (liq > 0 || token.listedPriceUsd != null);
  const owner = token.owner && token.owner !== "0x0000000000000000000000000000000000000000";

  let verdict: TokenAnalysis["verdict"] = "unknown";
  let score = 40;
  if (knownUsdc) {
    verdict = "established";
    score = 88;
  } else if (hasMeta && hasDex && liq > 100_000) {
    verdict = "established";
    score = 78;
  } else if (hasMeta && hasDex) {
    verdict = "watch";
    score = 58;
  } else if (hasMeta) {
    verdict = "caution";
    score = 36;
  } else {
    verdict = "high_risk";
    score = 18;
  }
  if (owner && !hasDex) score = Math.max(10, score - 12);

  const flags: TokenAnalysis["flags"] = [
    {
      severity: "info",
      title: `${token.chainLabel} contract`,
      detail: `${token.bytecodeBytes.toLocaleString()} bytes at ${token.address}`,
    },
  ];
  if (!hasDex) {
    flags.push({
      severity: "high",
      title: "No X Layer DEX print",
      detail: "DexScreener returned no usable X Layer pool. Price and exits are unverified.",
    });
  } else {
    flags.push({
      severity: liq > 50_000 ? "info" : "medium",
      title: "DEX liquidity",
      detail: `~$${liq.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${token.pairs.length} pair(s).`,
    });
  }
  if (owner) {
    flags.push({
      severity: "low",
      title: "Ownable",
      detail: `owner() = ${token.owner}. An admin can still change parameters if the ABI allows it.`,
    });
  }

  return {
    verdict,
    score,
    headline: hasDex
      ? `${token.symbol} is live on ${token.chainLabel} with a DEX print`
      : `${token.symbol || "Token"} is deployed on ${token.chainLabel} with no DEX print`,
    summary: hasDex
      ? `${token.name} (${token.symbol}) is an ERC-20 on ${token.chainLabel}. DexScreener sees ${token.pairs.length} pool(s). That is not an audit — it only means someone can trade it. Read supply, owner, and liquidity before sizing anything.`
      : `${token.name || "This contract"} sits on ${token.chainLabel} as an ERC-20 but has no reliable X Layer pool on DexScreener. Treat price claims as unverified until you find LP.`,
    whatItIs: hasMeta
      ? `ERC-20 ${token.name} / ${token.symbol}, ${token.decimals} decimals.`
      : "Contract code exists, but standard ERC-20 metadata did not all resolve.",
    tokenomics: `Reported total supply ${Number(token.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}. ${owner ? "A privileged owner() is set." : "No owner() on the standard ABI."}`,
    risks: [
      hasDex ? "LP can still be pulled if it is not locked." : "No public X Layer liquidity — you may not be able to exit.",
      "This pass does not simulate buy/sell tax or honeypot behavior.",
      "Name/symbol can be copied. Verify the address on OKX Explorer.",
    ],
    flags,
    nextSteps: [
      `Open ${token.explorer}`,
      "Check who holds the supply and whether LP is locked.",
      "If you trade, start with a dust size and confirm the router you are approving.",
    ],
  };
}
