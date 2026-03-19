# Community post templates

Adapt for each platform. Match the tone and norms of each community.

---

## Hacker News: Show HN

Title: Show HN: Backproto — backpressure routing from network theory, applied to AI agent payments

Body:

I have been working on applying backpressure routing (Tassiulas-Ephremides, 1992) to payment flows between AI agents.

Streaming payment protocols let agents send money continuously, but there is no congestion control. When a downstream agent hits capacity, payments keep arriving. No reroute. No throttle. No feedback signal. Data networks solved this decades ago with TCP and backpressure scheduling. Agent payment networks have not.

Backproto makes receiver-side capacity a first-class protocol primitive. Agents stake tokens to declare capacity (with a concave sqrt cap that makes Sybil splitting unprofitable), actual performance is tracked via dual-signed completion receipts, and a smart contract pool distributes incoming payment streams proportional to verified spare capacity. Overflow goes to escrow. Dynamic pricing (EIP-1559-style) makes congested agents expensive.

The math is from Lyapunov drift analysis, provably throughput-optimal for any stabilizable demand vector. Simulations show 95.7% allocation efficiency vs 93.5% for round-robin.

Part of a three-project stack: Buildlog (buildlog.ai) captures agent workflows, VR (vr.dev) verifies outcomes, Backproto routes payments to verified capacity.

What is deployed:

- 22 contracts on Base Sepolia (L2), 213 passing tests
- TypeScript SDK with 18 action modules
- Live router dashboard
- Research paper with formal proofs

Tech: Solidity 0.8.26, Superfluid GDA, EIP-712 attestations, off-chain aggregation (83.5% gas reduction), Base L2.

This is testnet-stage. Looking for feedback on the mechanism design from anyone working on multi-agent systems or payment routing.

Website: https://backproto.io
GitHub: https://github.com/backproto/backproto
Paper: https://backproto.io/paper
Explainer: https://backproto.io/explainer

---

## LangChain Discord (#general or #research)

Subject: Flow control for agent-to-agent payments

I built a protocol for routing payments between AI agents based on actual spare capacity. The problem: when agents pay each other via streaming payments, overloaded agents keep receiving money without doing the work.

Backproto adapts backpressure routing (Tassiulas-Ephremides, 1992) to handle this. Agents declare capacity, the protocol verifies completions, and payments automatically reroute to agents that have room.

It is part of a stack: Buildlog captures what agents do, VR verifies outcomes, and Backproto routes the money.

Live on Base Sepolia with 22 contracts and a TypeScript SDK.

- Docs: https://backproto.io
- Explainer: https://backproto.io/explainer
- GitHub: https://github.com/backproto/backproto

What would this need to look like for it to be useful in your agent stack?

---

## Farcaster (/base channel)

Shipped Backproto on Base Sepolia. Payment routing for AI agent economies.

22 contracts. 213 tests. TypeScript SDK with 18 modules.

Agents declare capacity, stake tokens, get verified. Payments stream proportional to spare capacity. Overloaded agents get rerouted around. Overflow sits in escrow.

Part of a stack with Buildlog (workflow capture) and VR (verification).

Research modules extend the core to Lightning routing, Nostr relay economics, and demurrage tokens.

backproto.io | github.com/backproto/backproto

---

## Reddit (r/LangChain or r/MachineLearning)

Title: Flow control for AI agent payments — adapting network routing to multi-agent economies

Body:

I've been working on a problem that matters more as multi-agent systems grow: what happens when agents pay each other and some agents get overloaded?

Streaming payment protocols have no congestion control. If three agents all pay the same LLM service and that service hits capacity, the money keeps flowing. No reroute. No throttle. No feedback.

I adapted backpressure routing (Tassiulas-Ephremides, 1992) to monetary flows:

- Agents stake tokens to declare capacity (Sybil-resistant via concave sqrt cap)
- Actual completions are tracked with dual-signed receipts
- A smart contract pool routes payments proportional to verified spare capacity
- Dynamic pricing (EIP-1559 style) makes overloaded agents expensive
- Overflow goes to escrow instead of being lost

Backproto is one layer in a three-project stack. Buildlog (buildlog.ai) captures agent workflows and execution trails. VR (vr.dev) verifies that outcomes actually changed system state. Backproto routes payments to agents with verified spare capacity.

Simulations show 95.7% allocation efficiency vs 93.5% round-robin. Formal throughput optimality proof via Lyapunov drift analysis.

22 contracts on Base Sepolia, 213 tests, TypeScript SDK.

- Explainer: https://backproto.io/explainer
- GitHub (MIT): https://github.com/backproto/backproto
- Paper: https://backproto.io/paper

Two questions:
1. At what point in your agent pipeline would you need flow control for payments?
2. What is the minimum integration that would make you try it?

---

## Superfluid Discord (#ecosystem)

Subject: GDA use case — capacity-weighted routing for AI agent payments

I built a protocol that uses GDA in a way that might be interesting to this community. Backproto dynamically adjusts GDA member units based on verified spare capacity, turning GDA pools into real-time allocation engines instead of static distribution.

How it uses Superfluid:

- BackpressurePool wraps GDA, updating member units on each capacity rebalance
- EscrowBuffer handles overflow when all agents are at capacity
- Off-chain attestation aggregation cuts gas by 83.5%

The core handles AI agent payment routing. Research modules extend the GDA pattern to Nostr relay economics and Lightning routing incentives, each with their own GDA pool.

22 contracts on Base Sepolia. 213 tests. TypeScript SDK.

Any advice on rapid unit rebalancing across dynamic capacity changes? Interested in gotchas when multiple GDA pools share the same Super Token.

- Docs: https://backproto.io
- GitHub: https://github.com/backproto/backproto

---

## Base Discord (#builders)

Subject: Backproto — payment routing for AI agents on Base

Shipped a protocol on Base Sepolia that does capacity-weighted payment routing for AI agent economies.

22 contracts, 213 tests:

- Core: 8 contracts for capacity-weighted streaming payments via Superfluid GDA
- Research modules: demurrage tokens, Nostr relay economics, Lightning routing, cross-domain composition

Results: 95.7% allocation efficiency, 83.5% gas savings via off-chain attestation batching

Part of a three-project stack: Buildlog (agent workflow capture) + VR (outcome verification) + Backproto (payment routing).

TypeScript SDK with 18 action modules.

- Docs: https://backproto.io
- GitHub: https://github.com/backproto/backproto
- Basescan: https://sepolia.basescan.org/address/0x8e999a246afea241cf3c1d400dd7786cf591fa88

Looking for feedback from builders. Happy to walk anyone through the testnet.

---

## Nostr community (deferred until AI agent traction is established)

Subject: NIP-XX draft — backpressure economics for relay sustainability

Note: Post this only after AI agent domain has at least one external pilot. The Nostr relay integration is a research module. Lead with the general mechanism, not Nostr-specific features.

I wrote a NIP spec (NIP-XX) that applies backpressure routing to Nostr relay economics.

Relays declare multi-dimensional capacity (events/sec, storage, bandwidth). Capacity is verified through signed attestations. Payments stream proportionally to verified capacity via Superfluid GDA pools. Anti-spam pricing scales with congestion.

This is part of Backproto, a protocol I originally built for AI agent payment routing. The same mechanism applies anywhere there are capacity-constrained participants and continuous payment flows.

Two Nostr-specific contracts are deployed on Base Sepolia: RelayCapacityRegistry and RelayPaymentPool.

NIP-XX spec: github.com/backproto/backproto (docs/nips/)
Docs: backproto.io

Would relay operators integrate this? What is the minimum economic incentive that makes relay operation worth it?

---

## Lightning community (deferred until AI agent traction is established)

Note: Post only after AI agent domain has traction. Lightning integration is a research module.

Subject: Backpressure routing for Lightning channel capacity signaling

I have been applying backpressure routing (Tassiulas-Ephremides) to Lightning liquidity management.

Payment routing in Lightning relies on stale gossip data. Senders probe routes until one works. There is no real-time capacity signal telling you which channels have liquidity.

Backproto adds an on-chain capacity oracle on Base (L2) where node operators submit signed attestations of channel capacity, EWMA-smoothed to resist manipulation. A routing pool recommends optimal paths by capacity score. A cross-protocol router unifies streaming, instant, and on-chain settlement.

This runs as a sidecar to Lightning. It does not modify the Lightning protocol itself.

- GitHub: https://github.com/backproto/backproto
- Paper: https://backproto.io/paper

---

## LinkedIn post 1: the problem

When AI agents pay each other with streaming payments, there is no congestion control.

Three agents stream money to the same LLM service. That service hits capacity. The money keeps flowing. No reroute. No throttle. No feedback signal.

Data networks solved this in 1992. Routers drop packets. TCP throttles senders. Backpressure signals propagate upstream.

Payment networks for AI agents have no equivalent.

I built one. Backproto adapts backpressure routing to monetary flows between AI agents. Payments automatically reroute to agents with verified spare capacity. Overloaded agents get less. Available agents get more.

22 contracts on Base. 213 tests. TypeScript SDK. MIT licensed.

backproto.io

---

## LinkedIn post 2: the stack

I have been building three projects in parallel. They look separate but they are one system.

Buildlog (buildlog.ai) records what AI agents do. MCP integration, execution trails, workflow capture.

VR (vr.dev) verifies that outcomes actually changed system state.

Backproto (backproto.io) routes payments to agents with verified spare capacity. Overloaded agents get rerouted around. Fakers get slashed.

The connection: Buildlog captures the work. VR confirms it happened. Backproto routes the money accordingly.

If an agent claims to have done the work and VR says otherwise, the completion receipt never gets signed and Backproto stops sending payments. The three layers reinforce each other.

All three are live or in development. Open source. Base L2.

---

## LinkedIn post 3: why capacity matters for agents

Most discussions about AI agent economics focus on pricing. How much should Agent A charge for a task? What is the market rate for an LLM call?

The harder problem is capacity. When ten clients all want the same agent and that agent can only serve three concurrently, what happens to the other seven?

Today the answer is: they wait, they retry, or they fail silently. There is no protocol-level mechanism to tell senders "this agent is full, try that one instead."

Backproto makes capacity a first-class primitive. Agents declare how much work they can handle, the protocol verifies actual completion rates, and payments stream proportional to spare capacity. When an agent fills up, its price rises (EIP-1559 style) and demand shifts to agents with room.

The math comes from network routing theory (Tassiulas-Ephremides, 1992). The implementation is 22 Solidity contracts on Base with a TypeScript SDK.

backproto.io/explainer

---

## Twitter / Bluesky / Nostr — drop-now posts (March 2026)

Each block below is one standalone post. Pick and choose, reorder, or adapt.

---

### 1. The reference product (Mandalay)

Built a reference product on top of Backproto.

Mandalay is a single endpoint that routes your LLM calls across OpenAI, Anthropic, and others, weighted by on-chain capacity signals.

One curl. Automatic failover. No vendor lock-in.

mandalay.dev

---

### 2. The router, explained simply

Your app calls one API. Behind it, a router checks which LLM providers actually have capacity right now, verified on-chain.

Payments stream to whoever can do the work. Overloaded providers get less. Available ones get more.

That's Mandalay. backproto.io

---

### 3. Why capacity matters more than price

Everyone optimizes LLM costs. Nobody optimizes for capacity.

When three apps hit the same provider and it's saturated, your requests fail silently. No reroute. No signal. Just timeouts.

Backproto makes capacity a first-class protocol primitive. Agents declare it, the chain verifies it, payments route accordingly.

backproto.io/explainer

---

### 4. The stack

The stack:

- Buildlog: records what agents do
- VR: verifies the outcomes actually happened
- Backproto: routes payments to agents with verified spare capacity

Buildlog captures. VR confirms. Backproto pays.

Fakers get slashed. Overloaded agents get rerouted around.

---

### 5. The one-liner use case

If you're building anything that calls multiple LLM providers, you need a router that knows which ones actually have capacity.

Which provider actually has capacity right now? That is the question.

mandalay.dev

---

### 6. What's deployed

Shipped on Base Sepolia:

- 22 contracts, 213 tests passing
- TypeScript SDK with 18 modules
- Live gateway with API key generation
- Animated capacity dashboard
- Research paper with formal proofs

All MIT. github.com/backproto/backproto

---

### 7. The internet analogy

The internet works because routers know when a link is congested. Packets get rerouted. Senders get throttled. Backpressure propagates.

AI agent payments have no equivalent. Money streams in whether the work gets done or not.

I adapted the algorithm that solved this for data networks (1992) and applied it to money.

backproto.io

---

### 8. For the agent builders

Building multi-agent systems? The hard part isn't orchestration. It's what happens when a downstream agent hits capacity.

Backproto gives you protocol-level flow control. Declare capacity, verify completions, route payments to whoever has room.

Works with any streaming payment system. 22 contracts on Base. SDK ready.

---

### 9. Dynamic pricing angle

When an LLM provider fills up, the base fee rises (EIP-1559 style). Demand naturally shifts to providers with room.

No human rebalancing. No cron jobs checking health endpoints. The price signal IS the routing signal.

That's the core of Backproto's pricing curve. backproto.io/explainer

---

### 10. The Mandalay quick start

```
curl mandalay.dev/api/chat \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

One endpoint. Routes across providers by on-chain capacity. Automatic failover.

Get a key at mandalay.dev.

---

## LinkedIn posts (March 2026)

Post from personal account, "I" voice. Space 2-3 days apart. Put all URLs in the first comment, not in the body (LinkedIn suppresses reach on posts with links). Hook must land in the first two lines. LinkedIn truncates after ~210 characters.

---

### LinkedIn 1. The reliability problem (post first)

AI agents are starting to pay each other in real time. What nobody built is the failure mode.

Three applications call the same LLM provider. That provider hits capacity. The requests fail silently. No reroute. No feedback. No signal telling you to try somewhere else. The money keeps streaming in whether the work gets done or not.

Data networks solved this exact problem in 1992. Routers detect congestion. TCP throttles the sender. Backpressure propagates upstream. The internet works because congestion is a first-class concept in the protocol.

I built the same thing for AI agent payments. It is called Backproto. Agents declare how much work they can handle. The protocol verifies actual completions. Payments automatically route to whoever has spare capacity. Overloaded agents get rerouted around.

22 smart contracts on a public testnet. TypeScript SDK. Research paper with formal proofs. All open source.

If you are building anything where multiple services call the same downstream provider, this is the plumbing layer that does not exist yet.

(Link in comments.)

---

### LinkedIn 2. The Mandalay product (post second)

I built a single API endpoint that routes LLM calls across OpenAI, Anthropic, and other providers based on which one actually has capacity right now.

It is called Mandalay. You call one endpoint. Behind it, a router checks real-time capacity, verified on-chain. If one provider is saturated, your request goes to the next one. Automatic failover. No code changes. No vendor lock-in.

This started as a research project in network routing theory. I spent a year building the protocol layer (capacity verification, payment routing, dynamic pricing). Then I realized: nobody will use a protocol until they can see it working. So I built the reference product on top of it.

One curl command. Multiple providers. Capacity-aware routing.

Looking for developers to try it and tell me what breaks.

(Link in comments.)

---

### LinkedIn 3. Building in public (post third)

I shipped 22 smart contracts, a TypeScript SDK, a research paper, a live gateway product, and a full documentation site. Solo.

Here is what I actually learned:

The hardest part was not the code. It was deciding what the product was. I started with a protocol: formal proofs, simulation framework, 213 passing tests. Academically clean. Nobody could tell me what it did in one sentence.

So I built Mandalay on top of it. One API endpoint that routes your LLM calls to whichever provider has capacity. Now the one-sentence version exists: "like a load balancer for LLMs, but the capacity signals are verified on-chain."

The protocol still matters. The math guarantees throughput optimality. But the protocol is not the product. The product is: your API calls do not fail when a provider gets overloaded.

If you are building infrastructure and nobody is using it, the problem might not be the infrastructure. It might be that you have not built the thing people can try in 30 seconds.

---

### LinkedIn 4. The stack (post fourth)

I have been building three projects in parallel. They sound separate but they solve one problem.

The problem: when AI agents do work for each other and money changes hands, there is no way to verify the work happened, no way to route payments to agents that actually have capacity, and no record of what was done.

Here is how I solved each piece:

Buildlog captures what agents do. Execution trails, workflow recording, full audit log of agent actions.

VR verifies that outcomes actually changed system state. On-chain evidence that state changed.

Backproto routes payments based on verified spare capacity. Agents that do the work get paid. Agents that fake it get caught. Overloaded agents get rerouted around.

The three layers reinforce each other. Buildlog captures the work. VR confirms it happened. Backproto routes the money accordingly.

All open source. Looking for feedback from anyone building multi-agent systems.

(Links in comments.)

---

## HN retry (schedule for early April 2026)

Angle: lead with the product, not the protocol math. The March 2026 Show HN led with Tassiulas-Ephremides and Lyapunov proofs. Too academic for HN's "show me what it does" culture.

Title: Show HN: Mandalay – one API for multiple LLM providers with capacity-aware routing

Body:

I built Mandalay, an API gateway that routes LLM calls across multiple providers (OpenAI, Anthropic, others) based on which one actually has capacity right now.

You call one endpoint. Behind it, a router checks real-time provider capacity and sends your request to whichever provider can handle it. If one provider is saturated, you get automatic failover. No code changes.

Quick start:

    curl mandalay.dev/api/chat \
      -H "Authorization: Bearer YOUR_KEY" \
      -d '{"messages":[{"role":"user","content":"Hello"}]}'

What makes this different from just round-robin load balancing: the capacity signals are verified on-chain (Base L2). Providers stake tokens to declare capacity, completions are tracked, and the routing weights update automatically. There is a research paper with the formal proofs if you want the math.

The protocol underneath (Backproto) adapts backpressure routing from network theory. But the product is just: your LLM calls do not fail when a provider is overloaded.

Open source, MIT licensed. Looking for feedback from anyone calling multiple LLM providers.

Website: https://mandalay.dev
GitHub: https://github.com/backproto/backproto
Paper: https://backproto.io/paper
