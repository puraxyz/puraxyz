# Command Deck

Private CEO-level briefing dashboard for the Backproto protocol. Curated cards organized by audience and scenario, concept explainers at three depth levels, an objection bank, and live chain metrics.

## Quick start

```bash
cd command-deck
npm install
npm run dev
```

Opens at http://localhost:3000.

## Pages

- **/** — Briefing cards, filterable by audience (investor, engineer, builder, grant reviewer, general) and scenario (elevator pitch, 5-min pitch, technical defense, grant app, objection handling). Search across all cards. Print-friendly.
- **/concepts** — Seven core technical concepts (backpressure routing, Lyapunov drift, EWMA, Sybil resistance, completion verification, EIP-712 batching, GDA pools), each at headline / elevator / detail depth.
- **/objections** — Twelve common objections with evidence-backed responses and source links.

## Live chain data

Set `RPC_URL` and optionally `CHAIN_ID` to pull live metrics from Base Sepolia (or Base mainnet with `CHAIN_ID=8453`). Requires SDK sync:

```bash
npm run sync-sdk
```

Without chain data, the stats bar shows static numbers only.

## Content

All card content lives in TypeScript data files under `lib/`:

- `lib/briefings.ts` — 24 briefing cards
- `lib/concepts.ts` — 7 concept explainers
- `lib/objections.ts` — 12 objection-response pairs

Every card includes `sources[]` pointing to files in the monorepo where the claim originates.
