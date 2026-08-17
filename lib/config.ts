import type { TokenSymbol } from "./schema";

const addr = (v?: string) => ((v || "").trim() as `0x${string}` | "");

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");

export const ADDR = {
  wokb: addr(process.env.NEXT_PUBLIC_WOKB),
  usdc: addr(process.env.NEXT_PUBLIC_USDC),
  usdt: addr(process.env.NEXT_PUBLIC_USDT),
  eth: addr(process.env.NEXT_PUBLIC_ETH),
  wbtc: addr(process.env.NEXT_PUBLIC_WBTC),
  pool: addr(process.env.NEXT_PUBLIC_SWAP_POOL),
  oracle: addr(process.env.NEXT_PUBLIC_ORACLE),
  book: addr(process.env.NEXT_PUBLIC_LIMIT_BOOK),
  faucet: addr(process.env.NEXT_PUBLIC_FAUCET),
};

export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  OKB: 18,
  USDC: 6,
  USDT: 6,
  ETH: 18,
  WBTC: 8,
};

export function tokenAddress(symbol: string): `0x${string}` | null {
  const s = symbol.toUpperCase();
  if (s === "OKB") return ADDR.wokb || null;
  if (s === "USDC") return ADDR.usdc || null;
  if (s === "USDT") return ADDR.usdt || null;
  if (s === "ETH") return ADDR.eth || null;
  if (s === "WBTC") return ADDR.wbtc || null;
  return null;
}

export function contractsReady() {
  return Boolean(ADDR.pool && ADDR.book && ADDR.oracle && ADDR.wokb && ADDR.usdc);
}
