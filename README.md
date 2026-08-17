# Unrevealed

**Say the trade. Grok parses it. Swaps and limit orders on X Layer.**

Natural-language trading desk for the X Layer BuildX AI Season hackathon. Type English — `swap 5 OKB for USDC`, `dump my OKB into USDC once it pumps past 55 bucks` — and the parser returns a structured intent. You confirm in-wallet. Immediate swaps hit a constant-product AMM. Conditional orders sit in escrow until the demo oracle prints the trigger.

Supported tokens: **OKB · USDC · USDT · ETH · WBTC**

Repo: https://github.com/0andadream/Unrevealed

---

## 3-minute demo

1. `anvil` in one terminal, then `bash scripts/dev-local.sh`, then `pnpm dev`.
2. Open http://localhost:3000 → **Connect** (Anvil #0 or OKX Wallet on X Layer Testnet).
3. **Faucet** for mock USDC / USDT / ETH / WBTC. Native OKB is the chain gas token (Anvil ETH is labeled OKB).
4. Chip: **swap 5 OKB for USDC** → Confirm swap.
5. Chip: **dump my OKB into USDC once it pumps past 55 bucks** → Place limit.
6. **Demo prices → OKB $60** → **Fill** on the resting order.
7. Chip: **swap half my USDT for ETH if it drops below 2800** → **ETH $2600** → Fill.
8. `cancel my order #1` if anything is still open.

Without `XAI_API_KEY` the desk uses a local parser that covers the examples. With a key, Grok 4.6 (`https://api.x.ai/v1`) does the parse.

---

## How the AI is used

`POST /api/parse` sends the user line (plus the last clarifying question, if any) to **Grok 4.6** with a strict JSON schema:

`swap` | `limit_order` | `clarify` | `cancel`

Vague amounts (`some`, `a bit`) and unknown tokens become `clarify`. The model never invents a price the user did not state.

---

## Contracts

| Contract | Role |
| --- | --- |
| `WOKB` | Wrap / unwrap native OKB |
| `MockToken` | USDC (6), USDT (6), ETH (18), WBTC (8) |
| `Faucet` | 10k stables + 5 ETH + 0.1 WBTC / hour |
| `SwapPool` | Constant product, 30 bps, native OKB in/out |
| `Oracle` | USD prices, 8 decimals (permissionless on this demo) |
| `LimitBook` | Escrow + fill when oracle condition is met |

---

## Quick start

```bash
# Node 20+, pnpm, Foundry
cd Unrevealed
pnpm install

cd contracts
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge test -vv

# terminal 1
anvil

# terminal 2
bash scripts/dev-local.sh   # deploys + writes .env.local
pnpm dev                    # http://localhost:3000
```

Optional in `.env.local`:

```
XAI_API_KEY=                # https://console.x.ai
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### X Layer testnet (chain id 1952)

```bash
cd contracts
export PRIVATE_KEY=0x...
export RPC_URL=https://testrpc.xlayer.tech/terigon
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --legacy
node ../scripts/write-env.mjs
# then set NEXT_PUBLIC_CHAIN_ID=1952 in .env.local
```

Faucet for native OKB: https://web3.okx.com/xlayer/faucet

---

## Layout

```
app/                 Next.js 15 App Router — chat desk + /api/parse
components/          Header, balances, ticket, orders
lib/                 parser, schema, wagmi, ABIs
contracts/           Foundry — AMM, oracle, limit book
scripts/dev-local.sh Anvil deploy → .env.local
```

---

## Vercel

- **Root Directory:** repo root (Next.js auto-detected)
- Env: `XAI_API_KEY`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_*` contract addresses, optional WalletConnect id

---

## License

MIT
