import { z } from "zod";

export const SUPPORTED_TOKENS = ["OKB", "USDC", "USDT", "ETH", "WBTC"] as const;
export type TokenSymbol = (typeof SUPPORTED_TOKENS)[number];

export const intentSchema = z.object({
  action: z.enum(["swap", "limit_order", "clarify", "cancel"]),
  tokenIn: z.string().nullable(),
  tokenOut: z.string().nullable(),
  amountIn: z.string().nullable(),
  amountType: z.enum(["absolute", "percentage"]).nullable(),
  condition: z
    .object({
      type: z.enum(["price_above", "price_below", "none"]),
      asset: z.string().nullable(),
      value: z.number().nullable(),
    })
    .nullable(),
  orderIdToCancel: z.string().nullable(),
  clarifyingQuestion: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type TradeIntent = z.infer<typeof intentSchema>;

export const PARSER_SYSTEM = `You are a DeFi transaction parser for a natural-language trading assistant on X Layer (an EVM-compatible blockchain using OKB as its native gas token).

Your job: convert the user's message into a single structured JSON object describing a swap or conditional order. Output ONLY valid JSON — no prose, no markdown fences, no explanation.

SUPPORTED TOKENS: OKB, USDC, USDT, ETH, WBTC
(If the user mentions a token not in this list, set "action" to "clarify" and ask about it.)

OUTPUT SCHEMA:
{
  "action": "swap" | "limit_order" | "clarify" | "cancel",
  "tokenIn": string | null,
  "tokenOut": string | null,
  "amountIn": string | null,
  "amountType": "absolute" | "percentage" | null,
  "condition": {
    "type": "price_above" | "price_below" | "none",
    "asset": string | null,
    "value": number | null
  } | null,
  "orderIdToCancel": string | null,
  "clarifyingQuestion": string | null,
  "confidence": "high" | "medium" | "low"
}

RULES:
1. "swap" = execute immediately, no condition.
2. "limit_order" = only execute when the price condition is met. Always include a "condition" object for limit orders.
3. If the amount is vague ("some", "a bit") — do NOT guess a number. Set action to "clarify" and ask for a specific amount or percentage.
4. If the token pair is ambiguous or unsupported, set action to "clarify".
5. If intent is unclear or the message isn't about trading, set action to "clarify" and explain what you need.
6. Never invent token prices or assume a condition value the user didn't state.
7. "confidence" reflects how certain you are the parse matches user intent — use "low" whenever you had to guess anything.
8. Numbers should be plain numeric strings (e.g. "5", "0.5"), not words.
9. "all" of a balance → amountIn "ALL", amountType "absolute". "half" → amountIn "HALF", amountType "percentage".
10. "dump A into B once it pumps past N" is a limit_order selling A, condition price_above on A.
11. "swap A for B if it drops below N" is a limit_order buying B, condition price_below on B (unless the user names a different asset).`;
