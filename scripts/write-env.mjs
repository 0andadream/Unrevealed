import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const depPath = resolve(root, "contracts/deployments/local.json");
if (!existsSync(depPath)) {
  console.error("missing contracts/deployments/local.json — run forge script first");
  process.exit(1);
}
const d = JSON.parse(readFileSync(depPath, "utf8"));
const envPath = resolve(root, ".env.local");
const prev = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

const keys = {
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || "31337",
  NEXT_PUBLIC_WOKB: d.wokb,
  NEXT_PUBLIC_USDC: d.usdc,
  NEXT_PUBLIC_USDT: d.usdt,
  NEXT_PUBLIC_ETH: d.eth,
  NEXT_PUBLIC_WBTC: d.wbtc,
  NEXT_PUBLIC_SWAP_POOL: d.swapPool,
  NEXT_PUBLIC_ORACLE: d.oracle,
  NEXT_PUBLIC_LIMIT_BOOK: d.limitBook,
  NEXT_PUBLIC_FAUCET: d.faucet,
};

let next = prev;
if (!next.includes("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=")) {
  next += (next.endsWith("\n") || next === "" ? "" : "\n") + "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=\n";
}
if (!next.includes("XAI_API_KEY=")) {
  next += (next.endsWith("\n") ? "" : "\n") + "XAI_API_KEY=\n";
}

for (const [k, v] of Object.entries(keys)) {
  const line = `${k}=${v}`;
  const re = new RegExp(`^${k}=.*$`, "m");
  if (re.test(next)) next = next.replace(re, line);
  else next += (next.endsWith("\n") ? "" : "\n") + line + "\n";
}

writeFileSync(envPath, next.endsWith("\n") ? next : next + "\n");
console.log("wrote", envPath);
