# @spilt/sdk

TypeScript SDK for the [Spilt](https://spilt.dev) protocol on Base Sepolia.

## Installation

```bash
npm install @spilt/sdk
```

## Usage

```typescript
import { getAddresses } from "@spilt/sdk";
import * as sink from "@spilt/sdk/actions/sink";
import * as pool from "@spilt/sdk/actions/pool";
import * as pricing from "@spilt/sdk/actions/pricing";
import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const addrs = getAddresses(84532); // Base Sepolia
const account = privateKeyToAccount("0x...");

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

// Register as a sink for a task type
await sink.registerSink(walletClient, addrs, taskTypeId, 50n);

// Read the dynamic price
const price = await pricing.getPrice(publicClient, addrs, taskTypeId, account.address);
```

## Modules

| Module | Description |
|--------|-------------|
| `actions/sink` | Register/deregister sinks |
| `actions/source` | Register task types, start/stop payment streams |
| `actions/pool` | Create pools, rebalance, read member units |
| `actions/stake` | Stake/unstake tokens, read capacity cap |
| `actions/buffer` | Deposit to / drain from escrow buffer |
| `actions/pricing` | Report queue load, advance pricing epoch, read prices |
| `actions/completion` | Record completions, advance completion epoch |
| `actions/aggregator` | Submit batched off-chain attestations |
| `signing` | EIP-712 signing helpers for attestations and completion receipts |

## Examples

- [`examples/full-flow.ts`](src/examples/full-flow.ts) — 7-step end-to-end demo
- [`examples/testnet-validation.ts`](src/examples/testnet-validation.ts) — multi-scenario validation with CSV output

Run examples:
```bash
PRIVATE_KEY=0x... npx tsx src/examples/full-flow.ts
```

## Development

```bash
npm install
npm run build    # compile TypeScript
npm run lint     # type-check (tsc --noEmit)
npm test         # run tests (vitest)
```

## License

[MIT](../LICENSE)
