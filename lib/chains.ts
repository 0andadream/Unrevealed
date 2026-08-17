import { defineChain } from "viem";

export const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer" },
  },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"],
    },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer-test" },
  },
  testnet: true,
});

export const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export function explorerTx(chainId: number, hash: string) {
  if (chainId === 196) return `https://www.okx.com/web3/explorer/xlayer/tx/${hash}`;
  if (chainId === 1952) return `https://www.okx.com/web3/explorer/xlayer-test/tx/${hash}`;
  return `#${hash}`;
}

export function explorerAddress(chainId: number, address: string) {
  if (chainId === 196) return `https://www.okx.com/web3/explorer/xlayer/address/${address}`;
  if (chainId === 1952) return `https://www.okx.com/web3/explorer/xlayer-test/address/${address}`;
  return `#${address}`;
}
