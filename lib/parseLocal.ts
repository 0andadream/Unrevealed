import { SUPPORTED_TOKENS, type TradeIntent, type TokenSymbol } from "./schema";

const ALIASES: Record<string, TokenSymbol> = {
  okb: "OKB",
  usdc: "USDC",
  usdt: "USDT",
  eth: "ETH",
  ether: "ETH",
  ethereum: "ETH",
  weth: "ETH",
  wbtc: "WBTC",
  btc: "WBTC",
  bitcoin: "WBTC",
};

const UNSUPPORTED = [
  "sol",
  "solana",
  "doge",
  "dogeoin",
  "xrp",
  "ada",
  "avax",
  "matic",
  "bnb",
  "link",
  "pepe",
  "shib",
  "ton",
  "sui",
  "apt",
];

function extractJson(text: string): unknown {
  const fenced = text.match(/\{[\s\S]*\}/);
  if (!fenced) throw new Error("Model did not return JSON");
  return JSON.parse(fenced[0]);
}

export { extractJson };

function findTokens(text: string): { supported: TokenSymbol[]; unsupported: string[] } {
  const supported: TokenSymbol[] = [];
  const unsupported: string[] = [];
  const seen = new Set<string>();
  const re = /\b([A-Za-z]{2,10})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[1].toLowerCase();
    if (seen.has(raw)) continue;
    if (ALIASES[raw]) {
      seen.has(ALIASES[raw]) || supported.push(ALIASES[raw]);
      seen.add(raw);
      seen.add(ALIASES[raw]);
    } else if (UNSUPPORTED.includes(raw)) {
      unsupported.push(m[1].toUpperCase());
      seen.add(raw);
    }
  }
  return { supported, unsupported };
}

function pairFromText(text: string, tokens: TokenSymbol[]): { tokenIn: TokenSymbol | null; tokenOut: TokenSymbol | null } {
  const forMatch = text.match(
    /(?:dump|sell|swap|trade|convert|exchange|rotate)?\s*(?:my\s+)?(?:all\s+(?:of\s+)?(?:my\s+)?|half\s+(?:of\s+)?(?:my\s+)?)?([A-Za-z]{2,10})\s+(?:for|into|to)\s+([A-Za-z]{2,10})/i,
  );
  if (forMatch) {
    const a = ALIASES[forMatch[1].toLowerCase()];
    const b = ALIASES[forMatch[2].toLowerCase()];
    if (a && b) return { tokenIn: a, tokenOut: b };
  }
  if (tokens.length >= 2) return { tokenIn: tokens[0], tokenOut: tokens[1] };
  if (tokens.length === 1) return { tokenIn: tokens[0], tokenOut: null };
  return { tokenIn: null, tokenOut: null };
}

function parseAmount(text: string): { amountIn: string | null; amountType: TradeIntent["amountType"]; vague: boolean } {
  if (/\b(some|a bit|a little|a few)\b/i.test(text)) {
    return { amountIn: null, amountType: null, vague: true };
  }
  if (/\ball\b/i.test(text) || /\bdump my\b/i.test(text) || /\bmy entire\b/i.test(text)) {
    return { amountIn: "ALL", amountType: "absolute", vague: false };
  }
  if (/\bhalf\b/i.test(text)) {
    return { amountIn: "HALF", amountType: "percentage", vague: false };
  }
  const num = text.match(/\b(\d+(?:\.\d+)?)\s*(?:okb|usdc|usdt|eth|wbtc|btc)?\b/i);
  if (num) return { amountIn: num[1], amountType: "absolute", vague: false };
  return { amountIn: null, amountType: null, vague: false };
}

function namedConditionAsset(text: string): TokenSymbol | null {
  const nextToVerb = text.match(
    /\b(okb|usdc|usdt|eth|weth|ether|ethereum|wbtc|btc|bitcoin)\s+(?:pumps?|drops?|falls?|hits?|reaches?|breaks?)/i,
  );
  if (nextToVerb) return ALIASES[nextToVerb[1].toLowerCase()];
  return null;
}

function parseCondition(
  text: string,
  tokenIn: string | null,
  tokenOut: string | null,
): TradeIntent["condition"] {
  const above = text.match(
    /(?:pumps?\s+past|breaks?\s+(?:above\s+)?|above|over|past|hits?|reaches?)\s+\$?\s*(\d+(?:\.\d+)?)/i,
  );
  const below = text.match(
    /(?:drops?\s+(?:below|under)|falls?\s+(?:below|under)|below|under)\s+\$?\s*(\d+(?:\.\d+)?)/i,
  );
  if (!above && !below) return null;

  const named = namedConditionAsset(text);
  if (above) {
    return { type: "price_above", asset: named ?? tokenIn, value: Number(above[1]) };
  }
  return { type: "price_below", asset: named ?? tokenOut ?? tokenIn, value: Number(below![1]) };
}

function blank(partial: Partial<TradeIntent>): TradeIntent {
  return {
    action: "clarify",
    tokenIn: null,
    tokenOut: null,
    amountIn: null,
    amountType: null,
    condition: null,
    orderIdToCancel: null,
    clarifyingQuestion: null,
    confidence: "low",
    ...partial,
  };
}

export function parseLocal(message: string, prior?: string): TradeIntent {
  const text = [prior, message].filter(Boolean).join("\n").trim();
  const lower = text.toLowerCase();

  const cancel = text.match(/cancel\b.*?(?:order\s*)?#?\s*(\d+)/i) || text.match(/#\s*(\d+)/i);
  if (/\bcancel\b/i.test(text) && cancel) {
    return blank({
      action: "cancel",
      orderIdToCancel: cancel[1],
      confidence: "high",
    });
  }

  const { supported, unsupported } = findTokens(text);
  if (unsupported.length && !supported.length) {
    return blank({
      clarifyingQuestion: `${unsupported[0]} isn't in the supported set (OKB, USDC, USDT, ETH, WBTC). Which of those do you want to trade?`,
      confidence: "high",
    });
  }

  const { tokenIn, tokenOut } = pairFromText(text, supported);
  const { amountIn, amountType, vague } = parseAmount(text);
  const condition = parseCondition(text, tokenIn, tokenOut);
  const trading =
    /\b(swap|trade|dump|sell|buy|convert|exchange|limit|order)\b/i.test(text) ||
    (tokenIn && tokenOut);

  if (!trading && !tokenIn) {
    return blank({
      clarifyingQuestion:
        "Tell me a trade — for example: swap 5 OKB for USDC, place a limit when a price is hit, or cancel an order by ID.",
      confidence: "low",
    });
  }

  if (unsupported.length && (tokenIn || tokenOut)) {
    return blank({
      tokenIn,
      tokenOut,
      clarifyingQuestion: `${unsupported[0]} isn't supported. Use OKB, USDC, USDT, ETH, or WBTC.`,
      confidence: "high",
    });
  }

  if (!tokenIn || !tokenOut) {
    return blank({
      tokenIn,
      tokenOut,
      amountIn,
      amountType,
      condition,
      clarifyingQuestion: `Which pair? Supported tokens: ${SUPPORTED_TOKENS.join(", ")}.`,
      confidence: "low",
    });
  }

  if (vague || !amountIn) {
    return blank({
      tokenIn,
      tokenOut,
      condition,
      clarifyingQuestion: `How much ${tokenIn} would you like to swap? You can give an exact amount or say 'all'/'half'.`,
      confidence: "low",
    });
  }

  if (condition && condition.type !== "none" && condition.value != null) {
    return {
      action: "limit_order",
      tokenIn,
      tokenOut,
      amountIn,
      amountType,
      condition,
      orderIdToCancel: null,
      clarifyingQuestion: null,
      confidence: /\bit\b/i.test(lower) && !condition.asset ? "medium" : "high",
    };
  }

  return {
    action: "swap",
    tokenIn,
    tokenOut,
    amountIn,
    amountType,
    condition: null,
    orderIdToCancel: null,
    clarifyingQuestion: null,
    confidence: "high",
  };
}
