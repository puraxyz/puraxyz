# Lightning.Gold — Lightning routing dashboard

Live at [lightning.gold](https://lightning.gold).

Lightning.Gold reads Lightning node capacity from Pura's on-chain oracle and lets you explore capacity-weighted routes. Node operators register their channel liquidity on-chain, backed by stake. The protocol applies exponential smoothing and computes multi-hop routes weighted by real capacity rather than gossip.

## Run locally

```bash
npm install
npm run sync-sdk
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

## Seed demo data

```bash
export OPERATOR_PRIVATE_KEY=0x...
npm run setup
```

This registers three demo nodes on Base Sepolia and joins the routing pool.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHAIN_ID` | `84532` | Base Sepolia (84532) or Base (8453) |
| `RPC_URL` | `https://sepolia.base.org` | JSON-RPC endpoint |
| `OPERATOR_PRIVATE_KEY` | — | Private key for setup script |

## Architecture

Next.js 16 + viem + @puraxyz/sdk + CSS Modules. Two API routes:

- `/api/state` — returns all registered nodes with smoothed capacity and fees
- `/api/route?amount=100000&maxNodes=5` — calls `getOptimalRoute` and returns the computed path

The client polls `/api/state` every 30 seconds and provides a route explorer form that calls `/api/route` on demand.

## SDK functions used

- `lightning.registerNode` — register a node with initial capacity in sats
- `lightning.joinRoutingPool` — join the routing pool
- `lightning.getSmoothedCapacity` — get EMA-smoothed capacity for a node
- `lightning.getOptimalRoute` — compute a multi-hop route for a given amount
- `lightning.getRoutingFee` — get the fee a node charges
