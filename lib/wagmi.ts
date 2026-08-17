"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { okxWallet, metaMaskWallet, walletConnectWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { anvil, xLayer, xLayerTestnet } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Unrevealed",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "unrevealed-xlayer-demo",
  chains: [xLayerTestnet, xLayer, anvil],
  wallets: [
    {
      groupName: "Recommended",
      wallets: [okxWallet, metaMaskWallet, injectedWallet, walletConnectWallet],
    },
  ],
  ssr: true,
});
