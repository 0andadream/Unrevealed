require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY_BASE_SEPOLIA ||
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.29",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    hardhat: { chainId: 31337 },
    baseSepolia: {
      url:
        process.env.BASE_SEPOLIA_RPC_URL ||
        "https://base-sepolia-rpc.publicnode.com",
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    },
  },
};
