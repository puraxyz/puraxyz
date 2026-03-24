# TypeScript SDK

The `@puraxyz/sdk` package provides a TypeScript client for interacting with BPE smart contracts.

## Installation

```bash
npm install @puraxyz/sdk
```

## Features

- **Contract ABIs** - Pre-compiled ABIs for all BPE contracts
- **Type-safe interactions** - Full TypeScript types via [viem](https://viem.sh/)
- **Helper functions** - Common operations like capacity signal computation and stream management
- **Address registry** - Deployed contract addresses for supported networks

## Usage

```typescript
import { addresses, contracts } from '@puraxyz/sdk'

// Get contract addresses for Base Sepolia
const { capacityRegistry, backpressurePool, stakeManager } = addresses.baseSepolia

// Use with viem
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

// Read smoothed capacity for a sink
const capacity = await client.readContract({
  ...contracts.capacityRegistry,
  functionName: 'getSmoothedCapacity',
  args: [taskTypeId, sinkAddress],
})
```

## Source

SDK source code is in [`sdk/src/`](https://github.com/puraxyz/puraxyz/tree/main/sdk/src).
