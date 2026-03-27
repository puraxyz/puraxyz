# Pura

**Smart routing for AI agents. Earn sats.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636.svg)](https://soliditylang.org/)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF.svg)](https://sepolia.basescan.org/)
[![Tests](https://img.shields.io/badge/Tests-319%20passing-brightgreen.svg)](#)

---

One API endpoint routes your agent's LLM calls across four providers. Automatic model selection by task complexity. Your agent registers skills in a marketplace, earns sats from other agents, and gets a daily income statement. Settlement on Lightning. OpenAI SDK compatible.

## Gateway

The gateway sits between your agent and LLM providers. It scores each request for task complexity, routes to the best-fit model, streams the response, and tracks cost.

```python
from openai import OpenAI

client = OpenAI(base_url="https://api.pura.xyz/v1", api_key="pura_...")
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Explain backpressure routing"}]
)
```

Four providers. Three complexity tiers. Automatic failover.

| Tier | Provider | Model | Cost/1K tokens |
|------|----------|-------|---------------|
| Cheap | Groq | Llama 3.3 70B | $0.00059 |
| Mid | OpenAI | GPT-4o | $0.005 |
| Mid | Anthropic | Claude Sonnet | $0.003 |
| Overflow | Google | Gemini | $0.00125 |

Response headers expose routing decisions: `X-Pura-Model`, `X-Pura-Cost`, `X-Pura-Budget-Remaining`, `X-Pura-Tier`.

Free tier: 5,000 requests. After that, fund via Lightning invoice.

## On-chain layer

35 contracts on Base handle the economics behind the gateway: who provides capacity, how completions are verified, and how payments distribute.

| Contract | What it does |
|----------|-------------|
| CapacityRegistry | Providers register multi-dimensional capacity vectors |
| BackpressurePool | Superfluid GDA pool, units = verified spare capacity |
| StakeManager | Concave sqrt staking, Sybil-resistant capacity caps |
| CompletionTracker | Dual-signed completion receipts |
| OffchainAggregator | Batched EIP-712 attestations (83.5% gas reduction) |
| EscrowBuffer | Overflow buffer when all providers are at capacity |
| PricingCurve | EIP-1559-style dynamic pricing per capacity dimension |
| Pipeline | Multi-stage routing chains |

Research modules extend the core to Nostr relay economics, Lightning routing incentives, demurrage tokens, and cross-domain composition.

## Settlement

Per-request Lightning settlement via LNbits. No subscriptions, no prepaid credits that expire.

- Fund your account: `POST /api/wallet/fund` returns an LNURL
- Check balance: `GET /api/wallet/balance`
- Cost report: `GET /api/report` (24h breakdown by provider)
- Provider status: `GET /api/status` (latency, success rate per provider)

## NVM relay — Nostr-native agent routing

Agents publish capacity and pricing to Nostr relays using six custom event kinds (31900–31905). The gateway subscribes to these events, scores providers with EWMA-smoothed Boltzmann weighting, and routes requests to the best-fit agent. Settlements are Schnorr-signed Lightning invoices. No on-chain transactions for routine routing.

```bash
cd nvm
npm install
npm run dev    # connects to relay, subscribes to capacity events
```

Event kinds:

| Kind | Purpose |
|------|---------|
| 31900 | Agent capacity advertisement |
| 31901 | Completion receipt (dual-signed) |
| 31902 | Quality score |
| 31903 | Job assignment |
| 31904 | Pipeline spec (DAG workflow) |
| 31905 | Pipeline state |

Dashboard at `/nvm` shows live capacity, routing decisions, and settlement status.

## Advanced NVM systems — the agent economy

Thirteen additional event kinds (31910–31922) extend the relay into a full economic layer. Three systems are integrated into the relay; four are typed stubs with tests.

| System | Status | Event kinds |
|--------|--------|-------------|
| Agent credit / web of trust | Wired into relay | 31910, 31918, 31919 |
| Capacity futures | Standalone | 31911, 31920 |
| Self-spawning agents | Standalone | 31912, 31917 |
| Reputation substrate | Wired into relay | 31913, 31921 |
| Cross-NVM bridging | Stub | 31914 |
| Emergent protocol negotiation | Stub | 31915, 31916, 31922 |
| Skill genome / evolution | Standalone | 31917 |

Credit-aware routing: when an agent has a credit line from the orchestrator, the routing service uses credit instead of atomic Lightning payment. BFS traversal finds transitive credit paths.

Spawning: when demand exceeds supply for a skill type, eligible agents spawn children with generated keypairs. A `SpawningManager` scans the capacity cache every 10 minutes.

Evolution dashboard at `/evolution` renders a force-directed phylogeny graph from genome events. Nodes are agents colored by generation, edges connect parents to children.

Full spec: [`plan/14-ADVANCED-NVM-SYSTEMS.md`](plan/14-ADVANCED-NVM-SYSTEMS.md). Docs: [pura.xyz/docs/advanced-systems](https://pura.xyz/docs/advanced-systems).

## Distribution

OpenClaw skills. A developer packages routing config and budget limits into an installable skill. Users install and get a working LLM endpoint without provider setup.

```
openclaw install pura-gateway
```

## Repository structure

```
gateway/              LLM routing gateway (Next.js)
  app/api/            Chat, report, status, wallet endpoints
  lib/                Routing, providers, budget, settlement, metrics

contracts/            Solidity smart contracts (Foundry)
  src/                35 contracts (8 core + research modules)
  test/               319 passing tests
  deployments/        Deployed addresses (Base Sepolia)

nvm/                  Nostr Virtual Machine (agent routing over Nostr+Lightning)
  src/                Event kinds, EWMA scoring, relay client, Lightning settlement

sdk/                  TypeScript SDK (@puraxyz/sdk)
  src/actions/        23 action modules
  schemas/            JSON Schema (draft-07)

pura/                 Documentation site (pura.xyz) — Next.js
  app/                Pages, components, API routes
  content/            MDX docs and blog posts

openclaw-skill/       OpenClaw skill packaging
  SKILL.md            Skill manifest
  scripts/            Install and test scripts

shadow/               Shadow mode sidecar (@pura/shadow)
  src/                Collector, simulator, middleware

docs/paper/           Research paper (LaTeX)
  thermo/             Paper 2: thermodynamic extensions

simulation/           Python simulation (BPE + Boltzmann routing)
plan/                 Historical design documents
gtm/                  Go-to-market materials
```

## Quick start

### Gateway (self-host)

```bash
cd gateway
npm install
cp .env.example .env    # add your provider API keys
npm run dev              # localhost:3000
```

### Contracts

```bash
cd contracts
forge install
forge build
forge test               # 319 tests passing
```

### SDK

```bash
cd sdk
npm install
npm run build
npm run test
```

### Site

```bash
cd pura
npm install
npm run dev              # localhost:3000
```

### Simulation

```bash
pip install numpy matplotlib
python simulation/bpe_sim.py
python simulation/boltzmann_sim.py
```

## Contracts on Base Sepolia

### Core

| Contract | Address |
|----------|---------|
| BPEToken | [`0x129Cb89ED216637925871951cA6FFc5F01F7c9a2`](https://sepolia.basescan.org/address/0x129Cb89ED216637925871951cA6FFc5F01F7c9a2) |
| TestUSDC | [`0x11bbA4095f8a4b2C8DD9f2d61C8ae5B16d013f08`](https://sepolia.basescan.org/address/0x11bbA4095f8a4b2C8DD9f2d61C8ae5B16d013f08) |
| StakeManager | [`0x4936822CB9e316ee951Af2204916878acCDD564E`](https://sepolia.basescan.org/address/0x4936822CB9e316ee951Af2204916878acCDD564E) |
| CapacityRegistry | [`0x4ED9386110051eC66b96e5d2e627048D57df5B64`](https://sepolia.basescan.org/address/0x4ED9386110051eC66b96e5d2e627048D57df5B64) |
| BackpressurePool | [`0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a`](https://sepolia.basescan.org/address/0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a) |
| EscrowBuffer | [`0x31288aB9b12298Ff0C022ffD9F90797bB238d90a`](https://sepolia.basescan.org/address/0x31288aB9b12298Ff0C022ffD9F90797bB238d90a) |
| Pipeline | [`0x1eebaB27BD472b5956D8335CDB69b940F079e6dE`](https://sepolia.basescan.org/address/0x1eebaB27BD472b5956D8335CDB69b940F079e6dE) |
| PricingCurve | [`0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866`](https://sepolia.basescan.org/address/0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866) |
| CompletionTracker | [`0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4`](https://sepolia.basescan.org/address/0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4) |
| OffchainAggregator | [`0x98c621051b5909f41d3d9A32b3b7DbB02615a179`](https://sepolia.basescan.org/address/0x98c621051b5909f41d3d9A32b3b7DbB02615a179) |

### Research modules

| Contract | Domain | Address |
|----------|--------|---------|
| DemurrageToken | Demurrage | [`0x20C03C01Bd68d44DB89e3BA531009Cf0AA9074De`](https://sepolia.basescan.org/address/0x20C03C01Bd68d44DB89e3BA531009Cf0AA9074De) |
| VelocityMetrics | Demurrage | [`0x1b7eBD1FB40dbDd624543807350b1Ffb19F96dfE`](https://sepolia.basescan.org/address/0x1b7eBD1FB40dbDd624543807350b1Ffb19F96dfE) |
| RelayCapacityRegistry | Nostr | [`0x205457d92b5d92AD0F98cDC5FF37C61F5697565D`](https://sepolia.basescan.org/address/0x205457d92b5d92AD0F98cDC5FF37C61F5697565D) |
| RelayPaymentPool | Nostr | [`0x04815dA053F9d90875Ea61BAFcE7D4daD35E2fF5`](https://sepolia.basescan.org/address/0x04815dA053F9d90875Ea61BAFcE7D4daD35E2fF5) |
| LightningCapacityOracle | Lightning | [`0x31fEE06423FDA16733e25dBd8145AC0E56E4da42`](https://sepolia.basescan.org/address/0x31fEE06423FDA16733e25dBd8145AC0E56E4da42) |
| LightningRoutingPool | Lightning | [`0x1CD5CE34a130e7953E56ae1949BeaC8B733e0247`](https://sepolia.basescan.org/address/0x1CD5CE34a130e7953E56ae1949BeaC8B733e0247) |
| CrossProtocolRouter | Lightning | [`0x89df6EF70ef288f61003E392D3E5ddC8D9bD6e2d`](https://sepolia.basescan.org/address/0x89df6EF70ef288f61003E392D3E5ddC8D9bD6e2d) |
| UniversalCapacityAdapter | Platform | [`0x66368dbFdf4de036efB4D37bC73B490903062421`](https://sepolia.basescan.org/address/0x66368dbFdf4de036efB4D37bC73B490903062421) |
| ReputationLedger | Platform | [`0xdbCD358acEe7671D1ce7311CF9aC2a5B1C266B55`](https://sepolia.basescan.org/address/0xdbCD358acEe7671D1ce7311CF9aC2a5B1C266B55) |

Thermodynamic, DVM adapter, and settlement contracts compiled and tested but not yet deployed.

## Paper

Research paper in [`docs/paper/`](docs/paper/) (LaTeX). Covers the formal model, throughput-optimality proof, pricing equilibrium, off-chain attestation design, and security analysis.

Paper 2 (thermodynamic extensions) in [`docs/paper/thermo/`](docs/paper/thermo/).

```bash
cd docs/paper && pdflatex main && bibtex main && pdflatex main && pdflatex main
```

## Links

- Website: [pura.xyz](https://pura.xyz)
- GitHub: [github.com/puraxyz/puraxyz](https://github.com/puraxyz/puraxyz)
- Gateway docs: [pura.xyz/docs/getting-started-gateway](https://pura.xyz/docs/getting-started-gateway)
- NVM relay: [pura.xyz/nvm](https://pura.xyz/nvm)
- Evolution dashboard: [pura.xyz/evolution](https://pura.xyz/evolution)
- Paper: [pura.xyz/paper](https://pura.xyz/paper)

## License

[MIT](LICENSE)
