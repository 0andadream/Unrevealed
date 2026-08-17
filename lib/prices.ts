import { SUPPORTED_TOKENS, type TokenSymbol } from "./schema";

export type TokenStats = {
  symbol: TokenSymbol;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number | null;
};

export type MarketsPayload = {
  tokens: Record<TokenSymbol, TokenStats>;
  source: string;
  updatedAt: number;
};

const CG_IDS: Record<TokenSymbol, string> = {
  OKB: "okb",
  USDC: "usd-coin",
  USDT: "tether",
  ETH: "ethereum",
  WBTC: "bitcoin",
};

const OKX_INST: Partial<Record<TokenSymbol, string>> = {
  OKB: "OKB-USDT",
  ETH: "ETH-USDT",
  WBTC: "BTC-USDT",
  USDC: "USDC-USDT",
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type OkxTicker = {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
};

async function fetchOkx(): Promise<Map<string, OkxTicker>> {
  const res = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT", {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`OKX ${res.status}`);
  const body = (await res.json()) as { code?: string; data?: OkxTicker[] };
  if (body.code && body.code !== "0") throw new Error(`OKX ${body.code}`);
  const map = new Map<string, OkxTicker>();
  for (const t of body.data ?? []) map.set(t.instId, t);
  return map;
}

type CgCoin = {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
};

async function fetchCoinGecko(): Promise<Map<string, CgCoin>> {
  const ids = Object.values(CG_IDS).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`,
    { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const list = (await res.json()) as CgCoin[];
  const map = new Map<string, CgCoin>();
  for (const c of list) map.set(c.id, c);
  return map;
}

function fromOkx(t: OkxTicker, usdtUsd: number): Omit<TokenStats, "symbol" | "marketCap"> {
  const last = num(t.last) * usdtUsd;
  const open = num(t.open24h) * usdtUsd;
  const change = open > 0 ? ((last - open) / open) * 100 : 0;
  return {
    price: last,
    change24h: change,
    high24h: num(t.high24h) * usdtUsd,
    low24h: num(t.low24h) * usdtUsd,
    volume24h: num(t.volCcy24h) * usdtUsd,
  };
}

export async function fetchLiveMarkets(): Promise<MarketsPayload> {
  const [okxSettled, cgSettled] = await Promise.allSettled([fetchOkx(), fetchCoinGecko()]);
  const okx = okxSettled.status === "fulfilled" ? okxSettled.value : null;
  const cg = cgSettled.status === "fulfilled" ? cgSettled.value : null;
  if (!okx && !cg) throw new Error("price feeds unavailable");

  const usdtUsd = cg?.get("tether")?.current_price || 1;
  const tokens = {} as Record<TokenSymbol, TokenStats>;
  const sources: string[] = [];
  if (okx) sources.push("OKX");
  if (cg) sources.push("CoinGecko");

  for (const symbol of SUPPORTED_TOKENS) {
    const cgCoin = cg?.get(CG_IDS[symbol]);
    const inst = OKX_INST[symbol];
    const okxT = inst ? okx?.get(inst) : undefined;

    if (okxT) {
      tokens[symbol] = {
        symbol,
        ...fromOkx(okxT, usdtUsd),
        marketCap: cgCoin?.market_cap ?? null,
      };
    } else if (cgCoin) {
      tokens[symbol] = {
        symbol,
        price: num(cgCoin.current_price),
        change24h: num(cgCoin.price_change_percentage_24h),
        high24h: num(cgCoin.high_24h),
        low24h: num(cgCoin.low_24h),
        volume24h: num(cgCoin.total_volume),
        marketCap: cgCoin.market_cap ?? null,
      };
    } else if (symbol === "USDT") {
      tokens[symbol] = {
        symbol,
        price: usdtUsd,
        change24h: 0,
        high24h: usdtUsd,
        low24h: usdtUsd,
        volume24h: 0,
        marketCap: null,
      };
    } else {
      throw new Error(`no feed for ${symbol}`);
    }
  }

  return { tokens, source: sources.join(" + "), updatedAt: Date.now() };
}

export function formatUsd(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

export function conditionMetLive(
  type: "price_above" | "price_below" | "none" | number,
  trigger: number,
  live: number | undefined,
) {
  if (live == null || !Number.isFinite(live)) return false;
  const above = type === "price_above" || type === 1;
  const below = type === "price_below" || type === 2;
  if (above) return live >= trigger;
  if (below) return live <= trigger;
  return false;
}
