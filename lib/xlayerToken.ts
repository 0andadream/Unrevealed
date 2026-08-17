import { createPublicClient, formatUnits, getAddress, http, isAddress, type Address } from "viem";
import { explorerAddress, xLayer, xLayerTestnet } from "./chains";
import { fetchLiveMarkets } from "./prices";

const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export type ChainKey = "xlayer" | "xlayer-testnet";

export type DexPair = {
  dex: string;
  quote: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  url: string | null;
};

export type OnchainToken = {
  query: string;
  isNative: boolean;
  address: string | null;
  chainId: number;
  chain: ChainKey;
  chainLabel: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyRaw: string;
  bytecodeBytes: number;
  owner: string | null;
  paused: boolean | null;
  explorer: string;
  pairs: DexPair[];
  listedPriceUsd: number | null;
};

function clientFor(chain: typeof xLayer | typeof xLayerTestnet) {
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0], { timeout: 8_000 }),
  });
}

async function readMeta(chain: typeof xLayer | typeof xLayerTestnet, address: Address) {
  const client = clientFor(chain);
  const code = await client.getBytecode({ address });
  if (!code || code === "0x") return null;

  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => ""),
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => ""),
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    client.readContract({ address, abi: erc20Abi, functionName: "totalSupply" }).catch(() => 0n),
    client.readContract({ address, abi: erc20Abi, functionName: "owner" }).catch(() => null),
    client.readContract({ address, abi: erc20Abi, functionName: "paused" }).catch(() => null),
  ]);

  const chainKey: ChainKey = chain.id === 196 ? "xlayer" : "xlayer-testnet";
  return {
    address,
    chainId: chain.id,
    chain: chainKey,
    chainLabel: chain.name,
    name: name || "Unknown",
    symbol: symbol || "???",
    decimals: Number(decimals),
    totalSupplyRaw: totalSupply.toString(),
    totalSupply: formatUnits(totalSupply, Number(decimals)),
    bytecodeBytes: Math.max(0, (code.length - 2) / 2),
    owner,
    paused,
    explorer: explorerAddress(chain.id, address),
  };
}

type DsPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  quoteToken?: { symbol?: string };
};

type GtToken = {
  data?: {
    attributes?: {
      price_usd?: string;
      total_reserve_in_usd?: string;
      volume_usd?: { h24?: string };
    };
  };
};

type GtPool = {
  attributes?: {
    name?: string;
    reserve_in_usd?: string;
    volume_usd?: { h24?: string };
    base_token_price_usd?: string;
  };
  relationships?: { dex?: { data?: { id?: string } } };
};

async function geckoLayer(address: string): Promise<{ price: number | null; pairs: DexPair[] }> {
  const base = `https://api.geckoterminal.com/api/v2/networks/x-layer/tokens/${address.toLowerCase()}`;
  try {
    const headers = { accept: "application/json", "user-agent": "Unrevealed/1.0" };
    const [tokRes, poolRes] = await Promise.all([
      fetch(base, { cache: "no-store", signal: AbortSignal.timeout(8000), headers }),
      fetch(`${base}/pools?page=1`, { cache: "no-store", signal: AbortSignal.timeout(8000), headers }),
    ]);
    const tok = tokRes.ok ? ((await tokRes.json()) as GtToken) : {};
    const poolsBody = poolRes.ok ? ((await poolRes.json()) as { data?: GtPool[] }) : {};
    const price = tok.data?.attributes?.price_usd ? Number(tok.data.attributes.price_usd) : null;
    const pairs: DexPair[] = (poolsBody.data ?? []).slice(0, 6).map((p) => ({
      dex: p.relationships?.dex?.data?.id ?? "x-layer",
      quote: p.attributes?.name ?? "pool",
      priceUsd: p.attributes?.base_token_price_usd
        ? Number(p.attributes.base_token_price_usd)
        : price,
      liquidityUsd: p.attributes?.reserve_in_usd ? Number(p.attributes.reserve_in_usd) : null,
      volume24h: p.attributes?.volume_usd?.h24 ? Number(p.attributes.volume_usd.h24) : null,
      url: `https://www.geckoterminal.com/x-layer/tokens/${address.toLowerCase()}`,
    }));
    if (!pairs.length && (tok.data?.attributes?.total_reserve_in_usd || price)) {
      pairs.push({
        dex: "x-layer",
        quote: "USD",
        priceUsd: price,
        liquidityUsd: tok.data?.attributes?.total_reserve_in_usd
          ? Number(tok.data.attributes.total_reserve_in_usd)
          : null,
        volume24h: tok.data?.attributes?.volume_usd?.h24
          ? Number(tok.data.attributes.volume_usd.h24)
          : null,
        url: `https://www.geckoterminal.com/x-layer/tokens/${address.toLowerCase()}`,
      });
    }
    return { price, pairs };
  } catch {
    return { price: null, pairs: [] };
  }
}

async function dexPairs(address: string): Promise<DexPair[]> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { pairs?: DsPair[] };
    const wanted = (body.pairs ?? []).filter((p) => {
      const id = (p.chainId ?? "").toLowerCase();
      return id.includes("xlayer") || id.includes("x-layer") || id === "okx" || id.includes("x layer");
    });
    const list = (wanted.length ? wanted : []).slice(0, 6);
    return list.map((p) => ({
      dex: p.dexId ?? "dex",
      quote: p.quoteToken?.symbol ?? "?",
      priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
      liquidityUsd: p.liquidity?.usd ?? null,
      volume24h: p.volume?.h24 ?? null,
      url: p.url ?? null,
    }));
  } catch {
    return [];
  }
}

export async function inspectXLayerToken(raw: string): Promise<OnchainToken> {
  const query = raw.trim();
  if (!query) throw new Error("Paste an X Layer token address, or OKB.");

  if (query.toUpperCase() === "OKB") {
    const markets = await fetchLiveMarkets();
    const okb = markets.tokens.OKB;
    return {
      query,
      isNative: true,
      address: null,
      chainId: 196,
      chain: "xlayer",
      chainLabel: "X Layer",
      name: "OKB",
      symbol: "OKB",
      decimals: 18,
      totalSupply: "—",
      totalSupplyRaw: "0",
      bytecodeBytes: 0,
      owner: null,
      paused: null,
      explorer: "https://www.okx.com/web3/explorer/xlayer",
      pairs: [],
      listedPriceUsd: okb.price,
    };
  }

  if (!isAddress(query)) {
    throw new Error("That is not a valid 0x address. Paste a token contract deployed on X Layer.");
  }
  const address = getAddress(query);

  const main = await readMeta(xLayer, address).catch(() => null);
  const test = main ? null : await readMeta(xLayerTestnet, address).catch(() => null);
  const meta = main ?? test;
  if (!meta) {
    throw new Error("No contract at that address on X Layer mainnet or testnet.");
  }

  const [ds, gt] = await Promise.all([dexPairs(address), geckoLayer(address)]);
  const pairs = ds.length ? ds : gt.pairs;
  const listedPriceUsd = pairs.find((p) => p.priceUsd != null)?.priceUsd ?? gt.price;

  return {
    query,
    isNative: false,
    ...meta,
    pairs,
    listedPriceUsd,
  };
}
