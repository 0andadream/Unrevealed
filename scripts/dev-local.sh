#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

export PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if ! curl -sf -X POST "$RPC_URL" -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' >/dev/null; then
  echo "Start Anvil first:  anvil"
  exit 1
fi

mkdir -p deployments
forge script script/Deploy.s.sol --rpc-url "$RPC_URL" --broadcast --legacy
node "$ROOT/scripts/write-env.mjs"
echo "Contracts deployed. Run:  pnpm dev"
