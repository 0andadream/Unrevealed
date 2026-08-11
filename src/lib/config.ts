export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532);
export const GROVE_ADDRESS = (process.env.NEXT_PUBLIC_INCO_GROVE ||
  "0x4984b0AFa995C103c1a386e1e87138A9597dafCC") as `0x${string}`;
export const RPC_URLS = [
  process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia-rpc.publicnode.com",
  "https://1rpc.io/base-sepolia",
].filter(Boolean) as string[];

export const CRYSTAL_COUNT = 12;
export const QUEST_TARGET = 20;
