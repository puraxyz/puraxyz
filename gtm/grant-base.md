# Base Ecosystem Fund — Grant Application

## Project name

Pura

## One-liner

LLM routing gateway with on-chain capacity contracts and Lightning settlement, deployed on Base.

## What does it do?

Pura is an LLM gateway that routes inference requests across multiple providers (OpenAI, Anthropic, Groq, Gemini), picks the cheapest model capable of handling each request, and settles per-request on Lightning.

The gateway is the product. The on-chain layer on Base handles the economics: capacity registration, completion verification, backpressure routing, and payment distribution. Agents get one API endpoint that works like the OpenAI SDK but with automatic failover, cost optimization, and transparent per-request billing.

The problem it solves: every AI agent hard-codes one LLM provider. When that provider raises prices, rate-limits, or goes down, the agent breaks. Pura makes provider selection automatic and economically optimal.

## Why Base?

Gas costs. The on-chain layer needs to verify completions and update capacity registrations frequently. Base L2 makes this economically viable at $0.001-0.01 per on-chain operation.

The routing contracts (CapacityRegistry, BackpressurePool, CompletionTracker) are already deployed on Base Sepolia with 12 core contracts verified on Basescan.

## What is deployed?

35 Solidity contracts on Base Sepolia (12 core contracts verified on Basescan, remainder are research modules). 319 passing tests. TypeScript SDK with 23 action modules.

The gateway is live at api.pura.xyz with four LLM providers. It scores task complexity across three tiers (cheap/mid/premium), routes accordingly, and tracks cost per request. Free tier is 5,000 requests.

Core contracts:
- CapacityRegistry: providers register with multi-dimensional capacity vectors
- BackpressurePool: distributes payments proportional to verified spare capacity via Superfluid GDA
- CompletionTracker: dual-signed completion receipts
- StakeManager: concave sqrt staking (Sybil-resistant capacity caps)
- OffchainAggregator: batched EIP-712 attestations (83.5% gas reduction)

Router contract: 0x8e999a246afea241cf3c1d400dd7786cf591fa88

## Results

- 95.7% allocation efficiency in simulation (vs 93.5% round-robin baseline)
- 83.5% gas reduction via off-chain attestation batching
- Gateway routes ~80% of simple requests to Groq at 10x lower cost than GPT-4o
- Throughput-optimal under any stabilizable demand vector (formal proof in research paper)

## Distribution

OpenClaw skill format. Developers package gateway routing configs as installable skills. Users install a skill and get LLM routing without manual provider setup.

## Team

Solo builder. Background in software engineering. Building full-time.

- GitHub: github.com/puraxyz/puraxyz
- Paper: pura.xyz/paper

## What the grant would fund

1. Mainnet deployment of core contracts on Base (gas + initial pool seeding)
2. External audit of the 5 core contracts
3. Gateway infrastructure (hosting, provider API costs for free tier)
4. SDK developer experience (interactive playground, framework integrations)

## Timeline

- Month 1: Mainnet deploy, gateway hardening, first external integration
- Month 2: External audit engagement, OpenClaw skill marketplace listing
- Month 3: Two pilot integrations running, public cost comparison benchmarks

## Links

- Website: https://pura.xyz
- GitHub: https://github.com/puraxyz/puraxyz
- Gateway docs: https://pura.xyz/docs/getting-started-gateway
- Paper: https://pura.xyz/paper
- Basescan: https://sepolia.basescan.org/address/0x8e999a246afea241cf3c1d400dd7786cf591fa88
