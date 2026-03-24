# OpenClaw Grant — Application

## Project name

Pura

## One-liner

LLM routing gateway distributed as an OpenClaw skill, with on-chain capacity contracts and Lightning settlement.

## Summary

Pura is an LLM gateway that routes inference across four providers (OpenAI, Anthropic, Groq, Gemini), scores task complexity, picks the cheapest capable model, and settles per-request on Lightning.

The gateway ships as an OpenClaw skill. When a user installs the skill, they get pre-configured routing rules, provider fallback chains, and per-request billing without manual API key management. The skill author defines the routing policy; the end user gets a working LLM endpoint.

The on-chain layer on Base (35 contracts, 319 tests) handles capacity registration, completion verification, and backpressure-based payment distribution. The research paper formalizes the routing algorithm with throughput-optimality proofs.

## Technical contribution

1. Cost-based routing: the gateway scores each request for task complexity (cheap/mid/premium) and routes to the cheapest provider in that tier. Simple prompts go to Groq Llama 3.3 at $0.00059/1K tokens. Code generation goes to GPT-4o. Long-context analysis goes to Claude Sonnet. Gemini catches overflow.

2. OpenClaw skill packaging: a Pura skill bundles routing config, provider preferences, and budget limits into a single installable unit. The install script provisions an API key and configures the endpoint. No manual provider setup.

3. On-chain capacity contracts: CapacityRegistry stores multi-dimensional capacity vectors. BackpressurePool (Superfluid GDA) distributes payments proportional to verified spare capacity. CompletionTracker verifies dual-signed completion receipts. StakeManager enforces concave sqrt caps (Sybil-resistant).

4. Off-chain attestation batching: BLS signature aggregation reduces on-chain verification cost by 83.5%. Capacity proofs are collected off-chain and submitted as aggregated roots.

5. Lightning settlement: per-request payment via LNbits. No subscriptions. Agents fund via LNURL and pay exactly what they use.

## What is deployed?

35 contracts on Base Sepolia (12 core verified on Basescan). 319 passing tests across all contracts. TypeScript SDK with 23 action modules. Gateway live at api.pura.xyz with four providers.

Free tier: 5,000 requests. After that, fund via Lightning invoice.

Simulation results (50 agents, 100 time steps):
- 95.7% allocation efficiency vs 93.5% round-robin
- 3x throughput under burst demand
- Stable operation under adversarial capacity reporting

## OpenClaw integration

The openclaw-skill/ directory contains:
- SKILL.md: skill manifest with capabilities, configuration schema, and usage instructions
- scripts/install.sh: provisions API key, validates connectivity
- scripts/test.sh: verifies routing across all four providers

Skill installation: `openclaw install pura-gateway`

## Research paper

Full paper with formal proofs at https://pura.xyz/paper. Covers backpressure routing theory, protocol design, contract architecture, simulation results, and security analysis.

## What the grant would fund

1. OpenClaw skill marketplace listing and developer documentation
2. Mainnet deployment of core contracts on Base
3. External security audit of core contracts
4. Gateway infrastructure (hosting, provider API costs for free tier)
5. Framework-specific skill variants (LangChain, CrewAI, AutoGen)

## Team

Solo builder. Background in software engineering. Building full-time.

## Links

- Website: https://pura.xyz
- GitHub (MIT): https://github.com/puraxyz/puraxyz
- Gateway docs: https://pura.xyz/docs/getting-started-gateway
- Paper: https://pura.xyz/paper
- OpenClaw skill: openclaw-skill/SKILL.md
