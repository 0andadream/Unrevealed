import { formatUnits, parseUnits } from "viem";
import type { TokenSymbol } from "./schema";
import { TOKEN_DECIMALS } from "./config";

export function dec(symbol: string) {
  return TOKEN_DECIMALS[symbol.toUpperCase() as TokenSymbol] ?? 18;
}

export function toUnits(amount: string, symbol: string) {
  return parseUnits(amount, dec(symbol));
}

export function fromUnits(amount: bigint, symbol: string) {
  return formatUnits(amount, dec(symbol));
}

export function prettyAmount(amount: bigint, symbol: string) {
  const n = Number(fromUnits(amount, symbol));
  if (!Number.isFinite(n)) return fromUnits(amount, symbol);
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function usd8(value: bigint) {
  return Number(value) / 1e8;
}

export function toUsd8(value: number) {
  return BigInt(Math.round(value * 1e8));
}

export { TOKEN_DECIMALS };
