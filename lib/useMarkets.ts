"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketsPayload } from "./prices";

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async (): Promise<MarketsPayload> => {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error("prices unavailable");
      return res.json();
    },
    refetchInterval: 12_000,
    staleTime: 8_000,
  });
}
