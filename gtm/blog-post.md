# Decentralized networks have a plumbing problem

AI agents are learning to pay each other. Streaming payment protocols let agents send cryptocurrency in real time, a running meter for work done by other agents. Translation agents pay LLM agents. Search agents pay embedding agents. The money flows continuously.

Nobody built the pipes.

## What happens when an agent gets overloaded?

Right now, nothing good. The money keeps flowing in whether the work gets done or not.

Three agents all stream payments to the same LLM service. That service can handle so many requests per second. There is no reroute. No throttle. No overflow buffer. Payments pile up. Work does not get done. Nobody tells the senders to try somewhere else.

In data networks, this was solved decades ago. Routers drop packets. TCP throttles the sender. Backpressure signals propagate upstream. The internet works because congestion is a first-class concept in the protocol stack.

Payment networks for AI agents have no equivalent.

## Backpressure routing, but for money

Pura adapts a well-studied algorithm from network theory (Tassiulas-Ephremides backpressure routing, 1992) to monetary flows.

Send more money to the agents who have the most spare capacity.

When Agent A has room, it gets a bigger share of the payment stream. When Agent B is nearly full, it gets less. The system reroutes money toward whoever can actually do the work. No human intervention. No central coordinator.

Five operations make it work:

1. Agents announce how much work they can handle, backed by a staked deposit
2. The protocol tracks actual completions against claims and slashes liars automatically
3. Busy agents become more expensive (EIP-1559-style pricing), pushing demand to available capacity
4. A smart contract pool distributes incoming payment streams proportional to verified capacity
5. Overflow payments sit in escrow until capacity frees up, rather than get lost

## The thermodynamic layer

The base mechanism works, but it treats the network as a static graph. Real systems have phases. Bull markets overheat. Shocks cascade. Idle capital sits doing nothing.

Pura adds a thermodynamic layer on top of backpressure routing. The system tracks three physical quantities:

Temperature (τ) is computed from the variance of capacity reports. When providers agree, temperature is low and routing is deterministic. When reports diverge, temperature rises and routing spreads across more agents via Boltzmann-weighted probabilities. This prevents the oscillation trap where two nearly-equal providers flip-flop forever.

The virial ratio (V) measures whether bound capital matches throughput. V = 2T/(S+E), where T is epoch throughput, S is staked capital, and E is escrowed capital. At V = 1.0, throughput and capital are balanced. Above 1.0, the system is under-capitalised. Below 1.0, too much capital is locked up with too little activity.

When V drops below equilibrium, adaptive demurrage kicks in. Idle token balances decay faster, pushing capital back into staking or spending. The decay rate ranges from 1%/year (healthy) to 10%/year (stagnant). This closes the feedback loop: low activity raises the holding cost, which pushes tokens into productive use, which raises throughput, which brings V back toward 1.0.

Circuit breakers monitor throughput and escrow pressure per pipeline stage. If throughput drops below 5% of declared capacity, or escrow pressure exceeds 95%, the breaker decouples the failing stage from upstream. A bottleneck in stage 3 of a 5-stage pipeline stops cascading to stages 1 and 2.

## What is different about this?

This is a payment routing protocol with built-in flow control and thermodynamic feedback. The money and the work signals are unified in one mechanism. When you want to use an agent, you route payment to it. The act of paying is the act of signaling demand, and the protocol makes sure that demand gets served by an agent that actually has capacity.

Simulations over 1,000-step horizons show 95.7% allocation efficiency (vs 93.5% for round-robin), recovery from sudden agent failures within 50 steps, and buffer stall rates under 9%.

## Live on testnet

Pura is deployed and verified on Base Sepolia. 35 contracts, 319 passing tests, a TypeScript SDK with 23 action modules, and a research paper with formal proofs. MIT licensed.

The thermodynamic layer adds three contracts (TemperatureOracle, VirialMonitor, SystemStateEmitter) and modifies three existing ones (BackpressurePool with Boltzmann routing, Pipeline with circuit breakers, DemurrageToken with virial-adaptive decay).

Research modules extend the core mechanism to Lightning channel routing, Nostr relay economics, and demurrage tokens.

- Docs: pura.xyz/docs
- GitHub: github.com/puraxyz/puraxyz
- Paper: pura.xyz/paper
- How it works: pura.xyz/explainer

If you are building multi-agent systems and your agents pay each other, try the testnet. Read the paper. Tell me what breaks.

---

Pura is MIT-licensed open source. [GitHub](https://github.com/puraxyz/puraxyz) | [Docs](https://pura.xyz/docs) | [Paper](https://pura.xyz/paper)
