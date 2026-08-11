# Inco Grove

**Private progression RPG** for the [Inco Summer Game Jam](https://www.inco.org/blog/summer-game-jam-resources-and-what-to-build).

Explore a **3D Whispering Grove** (React Three Fiber), collect glowing crystals, and every pickup updates **encrypted on-chain inventory, XP, and stats** via **Inco Lightning** on **Base Sepolia**. After a one-time wallet connect + session-key grant, collects are signed by a **session key** (no wallet popups).

### How Inco is actually used

1. **`IncoGrove.sol`** stores player dust / potions / XP / level / HP / ATK / DEF / luck / quest progress as **`euint256`** handles (not plaintext).
2. On **`collect(crystalId)`**, the contract runs encrypted math (`e.add`, and level-ups via `e.ge` + `e.select`) and **`allow(player)` + `allow(session)`** so only you can decrypt.
3. The UI never reads stats from public chain storage — it calls **`attestedDecrypt`** (Inco JS) on those handles.
4. Crystal *positions* on the map are public; *your inventory numbers* stay private until you hit **Decrypt with Inco**.

![Inco Grove](https://img.shields.io/badge/Inco-Lightning-a78bfa) ![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-blue)

## Hidden mechanics (the star)

| Data | Storage | Who can read |
| --- | --- | --- |
| Crystal Dust, potions, map pieces | `euint256` mappings | Player EOA + session key only |
| XP, Level, HP, ATK, DEF, Luck | `euint256` | Same |
| Quest progress | `euint256` | Same |
| Crystal collected flags | public `bool` mask | Everyone (needed for map) |

- Updates use **symbolic encrypted ops** (`e.add`, `e.ge`, `e.select` for private level-ups).
- Access control: every new handle gets `allowThis()` + `allow(player)` + `allow(session)`.
- Decrypt: Inco JS `attestedDecrypt` with the player wallet or session key.

## Play loop

1. **Connect wallet** (Base Sepolia) → registers player, sets **session key**, funds session with a little gas.
2. **WASD / click** to explore the grove.
3. Walk into a crystal → particles + float text → **session tx** `collect(id)`.
4. Open **Inventory / Private Stats / Quests** → **Decrypt** to reveal encrypted handles.

Quest: *Gather 20 Crystal Dust* (private progress).

## Project layout

```
contracts/IncoGrove.sol   # Inco encrypted RPG state + session keys
scripts/deploy.cjs
src/                     # Next.js 15 App Router + Phaser 3 + Tailwind
package.json             # Next.js + Hardhat (root — Vercel detects Next)
```

## Setup

```bash
cp .env.example .env
# set PRIVATE_KEY_BASE_SEPOLIA (funded on Base Sepolia)

npm install
npm run compile
npm run deploy:testnet   # writes .env.local

npm run dev
# http://localhost:3000
```

### Env (`.env.local`)

```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_INCO_GROVE=0x4984b0AFa995C103c1a386e1e87138A9597dafCC
NEXT_PUBLIC_RPC_URL=https://base-sepolia-rpc.publicnode.com
```

### Vercel

- **Root Directory:** leave empty (repo root)
- **Framework:** Next.js (auto-detected from root `package.json`)
- Env vars:
  - `NEXT_PUBLIC_CHAIN_ID=84532`
  - `NEXT_PUBLIC_INCO_GROVE=0x4984b0AFa995C103c1a386e1e87138A9597dafCC`
  - `NEXT_PUBLIC_RPC_URL=https://base-sepolia-rpc.publicnode.com`

## Session keys (no popups on collect)

1. Browser generates an ephemeral key (`localStorage`).
2. Main wallet calls `setSessionKey(session, expiresAt)` once.
3. Main wallet sends ~0.002 ETH to the session address for gas.
4. `collect` is sent from the session wallet via `viem` — **no MetaMask popup**.

Decrypt can use the same session (handles are `.allow`ed to it).

## Contract API (short)

| Function | Who | Purpose |
| --- | --- | --- |
| `register()` | player | Init encrypted zeros/base stats |
| `setSessionKey(session, expiry)` | player | Authorize session |
| `collect(crystalId)` | player or session | Encrypted rewards |
| `getHandles(player)` | view | Opaque `bytes32` handles |
| `getCollectedMask(player)` | view | Public map state |

## Deployed (Base Sepolia)

| | |
| --- | --- |
| **IncoGrove** | [`0x4984b0AFa995C103c1a386e1e87138A9597dafCC`](https://sepolia.basescan.org/address/0x4984b0AFa995C103c1a386e1e87138A9597dafCC) |
| **Chain** | Base Sepolia (84532) + Inco Lightning |

After redeploy, see `deployments.baseSepolia.json`.

## Jam judging notes

- **Hidden mechanics**: private stats/inventory/quest are euint + allow-list.
- **Completeness**: end-to-end collect → chain → decrypt.
- **Creativity**: RPG progression that stays private until you choose to decrypt.
- **Fun**: tight collect loop, pixel grove, clear HUD.

## License

MIT
