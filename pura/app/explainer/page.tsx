import AnimatedDiagram from "../components/AnimatedDiagram";
import AnimatedSequence from "../components/AnimatedSequence";
import TableOfContents from "../components/TableOfContents";
import { Radio, Zap, Coins, Globe, PawPrint, Thermometer } from "lucide-react";
import styles from "./page.module.css";
import {
  problemDiagram, solutionDiagram, pipelineDiagram, stakeDiagram,
  verifySequence, priceDiagram, routeDiagram, bufferDiagram,
  bigPictureDiagram, domainsDiagram, lightningDiagram, nostrDiagram,
  demurrageDiagram, reputationDiagram, openclawSequence, bitcoinDiagram,
  fourPlanesDiagram, fiveObjectsDiagram, thermoDiagram,
  dvmAdapterDiagram, settlementRailsDiagram, shadowModeDiagram,
  circuitBreakerSequence,
} from "./diagrams";

export const metadata = { title: "How It Works" };

const sections = [
  { id: "use-cases", label: "What Pura does", level: 2 as const },
  { id: "the-problem", label: "The problem", level: 2 as const },
  { id: "four-planes", label: "Four architectural planes", level: 2 as const },
  { id: "five-objects", label: "Five standard objects", level: 2 as const },
  { id: "step-by-step", label: "Step by step", level: 2 as const },
  { id: "declare", label: "1. Declare", level: 3 as const },
  { id: "verify", label: "2. Verify", level: 3 as const },
  { id: "price", label: "3. Price", level: 3 as const },
  { id: "route", label: "4. Route", level: 3 as const },
  { id: "buffer", label: "5. Buffer", level: 3 as const },
  { id: "thermo", label: "Thermodynamic layer", level: 2 as const },
  { id: "temperature", label: "Temperature oracle", level: 3 as const },
  { id: "boltzmann", label: "Boltzmann routing", level: 3 as const },
  { id: "virial", label: "Virial ratio", level: 3 as const },
  { id: "demurrage", label: "Adaptive demurrage", level: 3 as const },
  { id: "osmotic", label: "Osmotic pressure", level: 3 as const },
  { id: "breaker", label: "Circuit breaker", level: 3 as const },
  { id: "dvm-adapters", label: "DVM adapters", level: 2 as const },
  { id: "settlement", label: "Settlement rails", level: 2 as const },
  { id: "shadow", label: "Shadow mode", level: 2 as const },
  { id: "domains", label: "Research domains", level: 2 as const },
  { id: "lightning", label: "Lightning", level: 3 as const },
  { id: "nostr", label: "Nostr relays", level: 3 as const },
  { id: "platform", label: "Platform layer", level: 3 as const },
  { id: "openclaw", label: "OpenClaw agents", level: 3 as const },
  { id: "glossary", label: "Glossary", level: 2 as const },
  { id: "deeper", label: "Go deeper", level: 2 as const },
];

function StepNum({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "var(--accent-dim)",
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "var(--accent-hover)",
        marginRight: "0.4rem",
        verticalAlign: "text-bottom",
      }}
    >
      {n}
    </span>
  );
}

export default function ExplainerPage() {
  return (
    <div className={styles.layout}>
      <TableOfContents sections={sections} />
      <div className={styles.page}>
      <h1 className={styles.heading}>
        How Pura Works
      </h1>
      <p className={styles.subtitle}>
        Pick your use case below, then scroll down for the full protocol
        mechanics. No math degree required.
      </p>

      <hr />

      {/* ────────────────── USE CASE PATHS ────────────────── */}

      <h2 id="use-cases">What Pura does</h2>

      <h3><Zap size={16} style={{ verticalAlign: "text-bottom" }} /> LLM gateway</h3>
      <p>
        You run AI agents that call LLMs. You want to pay less per request
        without managing four different provider APIs. Pura scores each request
        by complexity and routes it to the best provider for the task.
        Simple lookups go to Groq or Gemini. Reasoning goes to Anthropic or
        OpenAI. You get cost headers on every response and a nightly spend
        report.
      </p>
      <p>
        One line change: swap your base URL to <code>api.pura.xyz</code>.
        Everything else in your OpenAI SDK code stays the same.
      </p>
      <p><a href="/gateway">Gateway quick start →</a></p>

      <h3><Radio size={16} style={{ verticalAlign: "text-bottom" }} /> Nostr relay operator</h3>
      <p>
        You run a Nostr relay. You want to monetize it without spamming your
        users with subscription prompts. Pura lets you declare your relay&apos;s
        capacity on-chain, receive flow-weighted payments through a Superfluid
        stream, and have your relay&apos;s throughput verified cryptographically.
        Busier relays earn proportionally more.
      </p>
      <p><a href="#domains">Nostr relay details →</a></p>

      <h3><Coins size={16} style={{ verticalAlign: "text-bottom" }} /> Lightning node operator</h3>
      <p>
        You run a Lightning node. Channel rebalancing costs money and time.
        Pura can read your node&apos;s channel capacity on-chain, route rebalancing
        flows through the backpressure algorithm, and settle fees via your
        existing Lightning channels. The protocol treats your node like any other
        service provider that declares capacity and earns proportional to work
        done.
      </p>
      <p><a href="#lightning">Lightning integration details →</a></p>

      <h3><PawPrint size={16} style={{ verticalAlign: "text-bottom" }} /> AI agent framework</h3>
      <p>
        You build AI agents with OpenClaw, LangChain, or a custom stack. Your
        agents need LLM inference, and you want cost control without hardcoding
        provider logic. Install the Pura OpenClaw skill or point your HTTP
        client at the gateway. Your agents get automatic model selection,
        budget caps, and spend tracking across every agent in your fleet.
      </p>
      <p><a href="/docs/getting-started-openclaw">OpenClaw skill docs →</a></p>

      <hr />

      {/* ────────────────── THE PROBLEM ────────────────── */}

      <h2 id="the-problem">The problem: AI agents need to pay each other</h2>
      <p>
        AI agents do work for each other and pay in real time: a translation
        agent pays an LLM, a photo app pays an image generator, a search agent
        pays an embedding service. These payments stream continuously, like water
        through pipes.
      </p>
      <p>
        What happens when an agent gets too busy? The money keeps flowing in
        whether the work gets done or not. Paying for a meal that never arrives
        because the kitchen is overwhelmed.
      </p>

      <AnimatedDiagram {...problemDiagram} />

      <p>
        Data networks solved this decades ago. Routers drop packets or reroute
        traffic when links are congested. Payment networks have no equivalent.
        Pura builds one.
      </p>
      <p>
        The core idea comes from{" "}
        <a href="https://en.wikipedia.org/wiki/Backpressure_routing">backpressure
        routing</a>: send more money to agents with the most spare capacity.
        When Agent A has room, it gets a bigger share. When Agent B is slammed,
        it gets less. The system reroutes money toward whoever can actually do
        the work.
      </p>

      <AnimatedDiagram {...solutionDiagram} />

      <hr />

      {/* ─────────────── FOUR PLANES ─────────────────── */}

      <h2 id="four-planes">Four architectural planes</h2>
      <p>
        Pura is organized into four stacked planes. Data flows upward from
        capacity reports to settlement. Control signals flow downward as
        backpressure when any plane is saturated.
      </p>

      <AnimatedDiagram {...fourPlanesDiagram} />

      <table>
        <thead>
          <tr><th>Plane</th><th>Contracts</th><th>Job</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Capacity</td>
            <td><code>CapacityRegistry</code>, <code>StakeManager</code></td>
            <td>Agents declare and stake against how much work they can handle</td>
          </tr>
          <tr>
            <td>Verification</td>
            <td><code>CompletionTracker</code></td>
            <td>Dual-signed receipts prove work was actually done</td>
          </tr>
          <tr>
            <td>Pricing</td>
            <td><code>PricingCurve</code>, <code>TemperatureOracle</code></td>
            <td>Dynamic fees rise with congestion, fall with spare capacity</td>
          </tr>
          <tr>
            <td>Settlement</td>
            <td><code>BackpressurePool</code>, <code>PaymentPool</code></td>
            <td>Money moves via Lightning, Superfluid streaming, or direct ERC-20</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* ─────────────── FIVE OBJECTS ────────────────── */}

      <h2 id="five-objects">Five standard objects</h2>
      <p>
        Every interaction in Pura produces one or more of five typed objects.
        They flow left to right through the system, each one feeding the next
        contract.
      </p>

      <AnimatedDiagram {...fiveObjectsDiagram} />

      <table>
        <thead>
          <tr><th>Object</th><th>Who creates it</th><th>What it carries</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>JobIntent</td>
            <td>Source (buyer)</td>
            <td>Task type, max price, deadline</td>
          </tr>
          <tr>
            <td>CapacityAttestation</td>
            <td>Sink (provider)</td>
            <td>EWMA-smoothed capacity, EIP-712 signature, epoch number</td>
          </tr>
          <tr>
            <td>VerificationReceipt</td>
            <td>Source + Sink</td>
            <td>Dual-signed proof that the work completed</td>
          </tr>
          <tr>
            <td>PriceSignal</td>
            <td>PricingCurve</td>
            <td>Base fee + queue premium for this task type at this moment</td>
          </tr>
          <tr>
            <td>SettlementReceipt</td>
            <td>PaymentPool</td>
            <td>Which rail was used, amount, preimage or stream ID</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* ──────────────── STEP BY STEP ───────────────── */}

      <h2 id="step-by-step">Step by step</h2>
      <p>
        Five operations form a pipeline. Each feeds into the next.
      </p>

      <AnimatedDiagram {...pipelineDiagram} />

      <hr />

      <h3 id="declare"><StepNum n={1} /> Declare: &quot;here&apos;s how much I can handle&quot;</h3>
      <p>
        Every sink tells the network its capacity, like a restaurant posting
        how many tables are open. Two safeguards prevent lying.
      </p>
      <p>
        Agents deposit collateral to play. The more you
        deposit, the more capacity you can claim. But the relationship is
        concave (square root), so depositing 4x more only allows 2x more
        capacity. This makes{" "}
        <a href="https://en.wikipedia.org/wiki/Sybil_attack">Sybil attacks</a>{" "}
        unprofitable.
      </p>

      <AnimatedDiagram {...stakeDiagram} />

      <p>
        A{" "}
        <a href="https://en.wikipedia.org/wiki/Commitment_scheme">commit-reveal</a>{" "}
        scheme prevents front-running: agents submit a sealed commitment first,
        then reveal the real number later.
      </p>

      <hr />

      <h3 id="verify"><StepNum n={2} /> Verify: &quot;prove you did the work&quot;</h3>
      <p>
        Declaring capacity is easy. Doing the work is the hard part. Pura has a
        built-in lie detector:
      </p>

      <AnimatedSequence {...verifySequence} />

      <p>
        Every completed task produces a dual-signed receipt: both the agent
        doing the work and the agent requesting it must sign off. The blockchain
        counts receipts and compares them to declared capacity.
      </p>
      <p>
        If an agent claims it can handle 100 tasks per epoch but only completes
        40? After three bad epochs, 10% of its deposit gets slashed. Lying about
        capacity is a losing strategy.
      </p>

      <hr />

      <h3 id="price"><StepNum n={3} /> Price: busy agents cost more</h3>
      <p>
        Like{" "}
        <a href="https://en.wikipedia.org/wiki/Dynamic_pricing">surge pricing</a>,
        Pura makes busy agents more expensive:
      </p>

      <AnimatedDiagram {...priceDiagram} />

      <p>The price has two parts:</p>
      <ul>
        <li>
          <strong>Base fee</strong> goes up when aggregate demand is high
        </li>
        <li>
          <strong>Queue premium</strong> goes up for a specific agent when
          its personal queue is long
        </li>
      </ul>
      <p>
        Demand naturally flows toward agents with spare capacity because they
        are cheaper.
      </p>

      <hr />

      <h3 id="route"><StepNum n={4} /> Route: money flows where capacity is</h3>
      <p>
        The <code>BackpressurePool</code> collects incoming payment streams and
        redistributes them automatically. Agents with more verified capacity get
        a bigger slice. No middleman, no manual intervention.
      </p>

      <AnimatedDiagram {...routeDiagram} />

      <p>
        When capacity changes (an agent gets busy, or a new one joins), anyone
        can trigger a rebalance to update the split.
      </p>

      <hr />

      <h3 id="buffer"><StepNum n={5} /> Buffer: a safety net for overflow</h3>
      <p>
        When all agents are at capacity and money keeps coming in, the{" "}
        <code>EscrowBuffer</code> holds it. When capacity frees up, the buffer
        drains automatically. If the buffer itself fills, sources get a clear
        signal: stop sending.
      </p>

      <AnimatedDiagram {...bufferDiagram} />

      <hr />

      {/* ────────────── THERMODYNAMIC LAYER ──────────── */}

      <h2 id="thermo">
        <Thermometer size={22} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        Thermodynamic layer
      </h2>
      <p>
        The five-step pipeline treats capacity as a signal and money as a
        conserved flow. The thermodynamic layer adds six mechanisms that recast
        the protocol as a physical system: variance becomes temperature, capital
        ratios become virial equilibrium, and overload triggers circuit breakers.
      </p>
      <p>
        Three new contracts (<code>TemperatureOracle</code>,{" "}
        <code>VirialMonitor</code>, <code>SystemStateEmitter</code>) plus
        modifications to <code>BackpressurePool</code>, <code>Pipeline</code>,
        and <code>DemurrageToken</code> implement the framework.
      </p>

      <AnimatedDiagram {...thermoDiagram} />

      <hr />

      <h3 id="temperature">Temperature oracle</h3>
      <p>
        In statistical mechanics, temperature measures the width of the energy
        distribution across microstates. Pura defines an analogous economic
        temperature <em>τ</em> from the variance of capacity attestations within
        an epoch.
      </p>
      <p>
        Let <em>σ²</em> be the EWMA-smoothed variance of declared capacities
        across all active sinks, and <em>σ²<sub>max</sub></em> the governance-set
        maximum expected variance. Then:
      </p>
      <blockquote>
        τ = τ<sub>min</sub> + (τ<sub>max</sub> − τ<sub>min</sub>) · σ² / σ²<sub>max</sub>
      </blockquote>
      <p>
        Defaults: τ<sub>min</sub> = 0.5, τ<sub>max</sub> = 5.0. When all
        providers report identical capacity, σ² → 0 and τ → τ<sub>min</sub>,
        producing near-deterministic routing. When capacity reports diverge, τ
        rises, spreading flow across more sinks.
      </p>
      <p>
        The floor of 0.5 prevents an oscillation trap where two sinks with
        nearly equal capacity alternate as the sole recipient each epoch.
      </p>

      <hr />

      <h3 id="boltzmann">Boltzmann routing</h3>
      <p>
        Classical BPE assigns pool shares proportional to smoothed capacity
        times square-root-of-stake. Boltzmann routing replaces this with a
        probabilistic allocation: the share for sink <em>i</em> with spare
        capacity <em>c<sub>i</sub></em> is:
      </p>
      <blockquote>
        P(i) = exp(c<sub>i</sub> / τ) / Σ<sub>j</sub> exp(c<sub>j</sub> / τ)
      </blockquote>
      <p>
        Computing <code>exp(x)</code> on-chain is expensive. The contracts use a
        first-order Taylor approximation (1 + c/τ), accurate when c/τ &lt; 1,
        which is the common case since spare capacity is a fraction of
        τ<sub>max</sub>. Full Boltzmann weights are computed off-chain, signed
        under <a href="https://eips.ethereum.org/EIPS/eip-712">EIP-712</a>, and
        submitted via <code>BackpressurePool.rebalanceWithShares()</code>.
      </p>
      <p>
        On-chain, submitted shares are blended with a uniform exploration term:
      </p>
      <blockquote>
        share<sub>i</sub> = (1 − ε) · P(i) + ε · (1/N)
      </blockquote>
      <p>
        ε defaults to 5% (capped at 20%). The exploration term guarantees every
        connected sink gets at least ε/N of the flow, preventing starvation
        even at low temperature.
      </p>

      <hr />

      <h3 id="virial">Virial ratio and capital equilibrium</h3>
      <p>
        In celestial mechanics, the{" "}
        <a href="https://en.wikipedia.org/wiki/Virial_theorem">virial theorem</a>{" "}
        relates kinetic and potential energy: 2K + U = 0 at equilibrium. Pura
        adapts this to bound capital:
      </p>
      <blockquote>
        V = 2T / (S + E)
      </blockquote>
      <p>
        <em>T</em> is epoch throughput (total tokens that flowed through pools),{" "}
        <em>S</em> is total staked capital, <em>E</em> is total escrowed
        capital. The equilibrium target is V = 1.0: throughput and bound capital
        are balanced.
      </p>
      <ul>
        <li>V &gt; 1: system is under-capitalized relative to throughput (a &quot;bull&quot; phase)</li>
        <li>V &lt; 1: excess capital is locked with too little activity (stagnant)</li>
      </ul>
      <p>
        The <code>VirialMonitor</code> contract stores V and exposes two
        advisory functions: <code>recommendedDemurrageRate()</code> and{" "}
        <code>recommendedStakeAdjustment()</code>.
      </p>

      <hr />

      <h3 id="demurrage">
        <Coins size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        Adaptive demurrage
      </h3>
      <p>
        The <code>DemurrageToken</code> is an ERC-20 wrapper that applies
        continuous decay to idle balances. Given a decay rate λ and elapsed
        time Δt since last rebase:
      </p>
      <blockquote>
        balance<sub>real</sub> = balance<sub>nominal</sub> · e<sup>−λΔt</sup>
      </blockquote>
      <p>
        On-chain, a linear approximation avoids the exponential. At the default
        5%/year rate with hourly rebases, the approximation error is below
        6 × 10<sup>−6</sup>.
      </p>
      <p>
        When <code>adaptiveDecayEnabled</code> is true and a{" "}
        <code>VirialMonitor</code> is attached, the decay rate tracks the
        monitor&apos;s recommendation instead of a fixed λ. This closes a
        feedback loop: low activity (V &lt; 1) raises demurrage, pushing idle
        tokens into staking or spending, which raises throughput, which raises V
        back toward equilibrium.
      </p>

      <AnimatedDiagram {...demurrageDiagram} />

      <p>
        <a href="https://en.wikipedia.org/wiki/Demurrage_(currency)">Demurrage</a>{" "}
        is the stock-side complement to BPE&apos;s flow-side routing. BPE routes
        payments to where capacity exists. Demurrage ensures those payments get
        made, because holding tokens becomes a losing strategy. The two together
        create stronger circulation pressure than either alone.
      </p>

      <hr />

      <h3 id="osmotic">Osmotic escrow pressure</h3>
      <p>
        The <code>EscrowBuffer</code> stores overflow payments when all sinks
        are saturated. Pressure is defined as:
      </p>
      <blockquote>
        P = L / M
      </blockquote>
      <p>
        <em>L</em> is the current buffer level, <em>M</em> the configured
        maximum. P ranges from 0 (empty) to 1 (full). The buffer emits a{" "}
        <code>PressureChanged</code> event on every deposit. Draining is
        permissionless: any caller can trigger <code>drain(taskTypeId)</code>,
        which distributes buffered tokens proportionally by capacity.
      </p>

      <hr />

      <h3 id="breaker">Circuit breaker</h3>
      <p>
        The <code>Pipeline</code> contract composes multiple pool stages into a
        sequential workflow. Each stage carries a circuit breaker with five
        phases:
      </p>

      <table>
        <thead>
          <tr><th>Phase</th><th>Trigger</th></tr>
        </thead>
        <tbody>
          <tr><td>Steady</td><td>Default healthy state</td></tr>
          <tr><td>Bull</td><td>V &gt; 1.5</td></tr>
          <tr><td>Shock</td><td>P &gt; 0.80 or V &lt; 0.2</td></tr>
          <tr><td>Recovery</td><td>τ &gt; 3.0 and V &lt; 0.8</td></tr>
          <tr><td>Collapse</td><td>P &gt; 0.95 or V &gt; 5.0</td></tr>
        </tbody>
      </table>

      <AnimatedSequence {...circuitBreakerSequence} />

      <p>
        When a stage collapses, the pipeline decouples it: upstream effective
        capacity is capped at the downstream throughput observed before
        collapse, halting new flow into the failed segment. Recovery occurs when
        the stage&apos;s throughput ratio returns above 20% and escrow pressure
        drops below 90%.
      </p>
      <p>
        Decoupling prevents cascade failure. A bottleneck in stage 3 of a
        5-stage pipeline no longer starves stages 1 and 2 of routing
        information.
      </p>

      <hr />

      {/* ────────────────── DVM ADAPTERS ─────────────── */}

      <h2 id="dvm-adapters">DVM adapters</h2>
      <p>
        <a href="https://github.com/nostr-protocol/nips/blob/master/90.md">NIP-90</a>{" "}
        Data Vending Machines already handle user-facing AI jobs on Nostr (kinds
        5000-5250). Pura provides three adapter contracts that bridge any
        existing DVM into the protocol without changing the DVM&apos;s own code.
      </p>

      <AnimatedDiagram {...dvmAdapterDiagram} />

      <ul>
        <li>
          <code>DVMCapacityAdapter</code> translates the DVM&apos;s capacity
          metrics (throughput, latency, error rate) into a normalized capacity
          score, EWMA-smoothed with α=0.3
        </li>
        <li>
          <code>DVMCompletionVerifier</code> uses EIP-712 dual-signature
          verification to record NIP-90 job completions on-chain
        </li>
        <li>
          <code>DVMPricingCurve</code> feeds verified completions into the
          PricingCurve so the DVM&apos;s per-job fee tracks real congestion
        </li>
      </ul>
      <p>
        Operators install a Pura sidecar that handles staking, capacity
        reporting, and attestation. The DVM itself runs unchanged.
      </p>

      <hr />

      {/* ────────────── SETTLEMENT RAILS ─────────────── */}

      <h2 id="settlement">Settlement rails</h2>
      <p>
        Pura does not mandate a single payment mechanism. The{" "}
        <code>PaymentPool</code> selects the best rail for each settlement:
      </p>

      <AnimatedDiagram {...settlementRailsDiagram} />

      <table>
        <thead>
          <tr><th>Rail</th><th>Speed</th><th>Reliability</th><th>Best for</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Lightning HTLC</td>
            <td>~2s</td>
            <td>95%</td>
            <td>Instant small payments (sats)</td>
          </tr>
          <tr>
            <td>Superfluid GDA</td>
            <td>continuous</td>
            <td>99%</td>
            <td>Ongoing per-second streaming</td>
          </tr>
          <tr>
            <td>Direct ERC-20</td>
            <td>~4s</td>
            <td>99.99%</td>
            <td>Large per-job settlements</td>
          </tr>
        </tbody>
      </table>
      <p>
        The <code>CrossProtocolRouter</code> exposes a single interface so
        applications use whatever rail fits without managing three integrations.
      </p>

      <hr />

      {/* ────────────────── SHADOW MODE ──────────────── */}

      <h2 id="shadow">Shadow mode</h2>
      <p>
        You don&apos;t have to go on-chain to start using Pura. The{" "}
        <code>@puraxyz/shadow</code> sidecar runs locally alongside your
        service and simulates the full BPE pipeline: EWMA smoothing, Boltzmann
        routing, temperature and virial calculations, circuit breaker phases.
      </p>

      <AnimatedDiagram {...shadowModeDiagram} />

      <p>
        Shadow mode is free, has zero blockchain dependencies, and feeds a
        monitor dashboard showing τ, V, and phase state in real time. When
        you&apos;re ready, a single registration call moves your service
        on-chain. The sidecar model means you can evaluate the protocol&apos;s
        behavior against your actual workload before committing capital.
      </p>

      <hr />

      {/* ──────────────── RESEARCH DOMAINS ───────────── */}

      <h2 id="domains">Research domains</h2>
      <p>
        The core mechanism (declare, verify, price, route, buffer) is
        domain-agnostic. Anywhere there is a capacity-constrained service
        and a continuous payment flow, backpressure routing can improve
        allocation. Beyond AI agents, Pura extends to four research domains:
      </p>

      <AnimatedDiagram {...domainsDiagram} />

      <hr />

      <h3 id="lightning">
        <Zap size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        Lightning Network
      </h3>
      <p>
        <a href="https://en.wikipedia.org/wiki/Lightning_Network">Lightning</a>{" "}
        enables instant Bitcoin payments through{" "}
        <a href="https://en.wikipedia.org/wiki/Payment_channel">payment channels</a>,
        but routing is unreliable. Senders rely on stale gossip data about
        channel liquidity and probe routes by trial and error.
      </p>
      <p>
        Pura adds a real-time capacity signaling layer without modifying the
        Lightning protocol:
      </p>
      <ul>
        <li>
          <code>LightningCapacityOracle</code>: node operators submit signed
          EWMA-smoothed attestations of aggregate outbound liquidity (not
          individual channel balances, so privacy is preserved)
        </li>
        <li>
          <code>LightningRoutingPool</code>: a BPE pool where nodes are
          weighted by routing capacity. Nodes with more available liquidity and
          balanced channels earn more streaming revenue.
        </li>
        <li>
          <code>CrossProtocolRouter</code>: selects Lightning (~2s), Superfluid
          (~4s), or on-chain (~12s) per payment
        </li>
      </ul>

      <AnimatedDiagram {...lightningDiagram} />

      <p>
        This runs on Base as a sidecar to Lightning. Pathfinding algorithms can
        query the oracle for fresher data than gossip provides. Node operators
        get streaming revenue proportional to verified capacity, which makes
        routing more financially sustainable and should attract more liquidity
        into the network.
      </p>

      <hr />

      <h3 id="nostr">
        <Radio size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        Nostr relays
      </h3>
      <p>
        <a href="https://nostr.com/">Nostr</a> messages are distributed through
        relays operated mostly by volunteers. Most run at a loss. Users have no
        way to discover which relays have capacity, and relays have no way to
        price services based on actual load.
      </p>
      <p>
        Pura adds an economic layer using the same BPE primitives:
      </p>
      <ol>
        <li>
          Relay operators register and declare multi-dimensional capacity:
          throughput (events/sec), storage (GB), bandwidth (Mbps)
        </li>
        <li>
          Capacity is verified through signed attestations, EWMA-smoothed
        </li>
        <li>
          A payment pool distributes subscription revenue proportional to
          verified spare capacity
        </li>
        <li>
          Anti-spam pricing scales with congestion: publishing events costs more
          on busy relays (2x at 50% load, 4x at 80%)
        </li>
      </ol>

      <AnimatedDiagram {...nostrDiagram} />

      <p>
        Relay operators who invest in real capacity earn proportionally more.
        Operators who overcommit get less and get slashed. We&apos;ve drafted
        NIP-XX to standardize this.
      </p>

      <hr />

      <h3 id="platform">
        <Globe size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        Platform layer
      </h3>
      <p>
        With four domains sharing BPE infrastructure, there is a coordination
        problem: how do you share reputation across domains?
      </p>
      <p>
        <code>UniversalCapacityAdapter</code> normalizes capacity signals from
        any domain into a common format. A new domain (decentralized storage,
        compute marketplaces) plugs in by registering a single adapter contract.
      </p>
      <p>
        <code>ReputationLedger</code> makes track records portable:
      </p>
      <ul>
        <li>
          An AI agent operator who also runs a Lightning node gets credit for
          both
        </li>
        <li>
          Negative signals weigh 3x more than positive ones. One domain of bad
          behavior hurts the overall score disproportionately.
        </li>
        <li>
          Good cross-domain reputation earns up to 50% stake discounts
        </li>
      </ul>

      <AnimatedDiagram {...reputationDiagram} />

      <hr />

      <h3 id="openclaw">
        <PawPrint size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} />
        OpenClaw agents
      </h3>
      <p>
        <a href="https://openclaw.com/">OpenClaw</a> is a large open-source
        agent framework with ClawHub, a marketplace of installable agent skills.
        As deployments grow from single agents to multi-agent pipelines, a
        coordination problem appears: which agent gets the next task, how do you
        verify completion, how do you build trust across skill types?
      </p>
      <p>
        Pura adds economic coordination with three contracts:
      </p>
      <ol>
        <li>
          <code>OpenClawCapacityAdapter</code> translates multi-dimensional
          skill metrics (throughput 50%, latency 30%, error rate 20%) into a
          single normalized score, EWMA-smoothed with α=0.3
        </li>
        <li>
          <code>OpenClawCompletionVerifier</code> uses EIP-712 dual-signature
          verification to record skill executions on-chain
        </li>
        <li>
          <code>OpenClawReputationBridge</code> feeds completion and failure
          events into the cross-domain ReputationLedger
        </li>
      </ol>

      <AnimatedSequence {...openclawSequence} />

      <p>
        Agents opt in by installing a Pura coordination skill that handles
        staking, capacity reporting, and attestation. The integration runs
        entirely on Base L2. OpenClaw&apos;s core is unchanged.
      </p>

      <hr />

      {/* ───────────────── GLOSSARY ──────────────────── */}

      <h2 id="glossary">Glossary</h2>

      <h3>Core concepts</h3>
      <table>
        <thead>
          <tr><th>Term</th><th>Plain English</th></tr>
        </thead>
        <tbody>
          <tr><td>Sink</td><td>A service provider (AI agent, relay, Lightning node) that receives payment for doing work</td></tr>
          <tr><td>Source</td><td>An app or agent that pays for work to be done</td></tr>
          <tr><td>Task type</td><td>A category of work (text generation, image creation, relay storage)</td></tr>
          <tr><td>Capacity</td><td>How much work a provider can handle at once</td></tr>
          <tr><td>Spare capacity</td><td>Declared capacity minus current workload. This drives routing.</td></tr>
          <tr><td>Rebalance</td><td>Updating how payments are split based on current capacity across all participants</td></tr>
          <tr><td>Epoch</td><td>A time window (typically 5 min) for measuring performance and updating prices</td></tr>
          <tr><td>Pipeline</td><td>A multi-stage chain of pools where upstream congestion propagates backward</td></tr>
        </tbody>
      </table>

      <h3>Thermodynamic</h3>
      <table>
        <thead>
          <tr><th>Term</th><th>Plain English</th></tr>
        </thead>
        <tbody>
          <tr><td>τ (temperature)</td><td>Measures variance across capacity reports. High τ = diverse capacities, routing spreads wide. Low τ = uniform capacities, routing concentrates.</td></tr>
          <tr><td>V (virial ratio)</td><td>Throughput divided by bound capital. V = 1 is equilibrium. V &gt; 1 is under-capitalized (bull). V &lt; 1 is over-capitalized (stagnant).</td></tr>
          <tr><td>P (osmotic pressure)</td><td>Buffer fill level (0 to 1). Drives drain and circuit breaker triggers.</td></tr>
          <tr><td>Boltzmann weight</td><td>exp(c/τ): sinks with more spare capacity get exponentially more flow, modulated by temperature.</td></tr>
          <tr><td>Adaptive demurrage</td><td>Decay rate on idle token balances that varies with the virial ratio. Pushes idle capital into circulation.</td></tr>
          <tr><td>Circuit breaker</td><td>Five-phase state machine (Steady → Bull → Shock → Recovery/Collapse) that decouples pipeline stages under stress.</td></tr>
        </tbody>
      </table>

      <h3>Crypto and blockchain</h3>
      <table>
        <thead>
          <tr><th>Term</th><th>Plain English</th></tr>
        </thead>
        <tbody>
          <tr><td>Token</td><td>A programmable unit of value on a blockchain</td></tr>
          <tr><td><a href="https://en.wikipedia.org/wiki/ERC-20">ERC-20</a></td><td>The standard token interface on Ethereum. Defines transfer, approval, balance queries.</td></tr>
          <tr><td>Super Token</td><td>A Superfluid-compatible token that supports streaming (continuous per-second flows)</td></tr>
          <tr><td>Smart contract</td><td>A program on a blockchain that executes automatically when conditions are met</td></tr>
          <tr><td>Staking</td><td>Locking tokens as collateral. In Pura, agents stake to declare capacity.</td></tr>
          <tr><td>Slashing</td><td>Penalty: taking part of a stake for dishonest behavior</td></tr>
          <tr><td>Gas</td><td>Fee paid per blockchain transaction. On Base L2, fractions of a cent.</td></tr>
          <tr><td>Base</td><td>An Ethereum L2 built by Coinbase. Low fees, fast confirmations, Ethereum security.</td></tr>
          <tr><td>Layer 2</td><td>A chain that batches transactions and posts proofs to a main chain for security</td></tr>
          <tr><td>Superfluid</td><td>Protocol for real-time token streaming. Pura uses its GDA for payment routing.</td></tr>
          <tr><td>GDA</td><td>General Distribution Agreement. Superfluid&apos;s mechanism for splitting a stream among recipients proportionally.</td></tr>
        </tbody>
      </table>

      <h3>Technical mechanisms</h3>
      <table>
        <thead>
          <tr><th>Term</th><th>Plain English</th></tr>
        </thead>
        <tbody>
          <tr><td>EWMA</td><td>Exponentially Weighted Moving Average. Weights recent data more, preventing sudden suspicious capacity changes.</td></tr>
          <tr><td>Commit-reveal</td><td>Two-step process: submit a sealed hash, then reveal the value. Prevents front-running.</td></tr>
          <tr><td><a href="https://eips.ethereum.org/EIPS/eip-712">EIP-712</a></td><td>Standard for signing structured data off-chain. Used for attestations and receipts.</td></tr>
          <tr><td>Attestation</td><td>A signed statement (&quot;I have 500 units of capacity&quot;). Verified on-chain.</td></tr>
          <tr><td>Sybil resistance</td><td>Protection against fake identities. Pura&apos;s concave stake cap (square root) makes splitting unprofitable.</td></tr>
          <tr><td>NIP</td><td>Nostr Implementation Possibility. A specification for Nostr protocol features.</td></tr>
        </tbody>
      </table>

      <hr />

      {/* ─────────────────── GO DEEPER ───────────────── */}

      <h2 id="deeper">Go deeper</h2>

      <h3>Academic</h3>
      <ul className={styles.links}>
        <li>
          <a href="https://pura.xyz/paper">Research paper</a>: formal model,
          proofs, evaluation
        </li>
        <li>
          <a href="/paper/introduction">Paper: introduction</a>: problem
          statement and contributions
        </li>
        <li>
          <a href="/paper/protocol">Paper: protocol design</a>: contract-level
          technical details
        </li>
        <li>
          <a href="/paper/thermodynamic">Paper: thermodynamic extensions</a>:
          τ, Boltzmann, virial, demurrage, osmotic pressure, circuit breakers
        </li>
      </ul>

      <h3>Implementation</h3>
      <ul className={styles.links}>
        <li>
          <a href="/docs/contracts">Smart contracts</a>: 35 contracts deployed
          on Base Sepolia
        </li>
        <li>
          <a href="/docs/sdk">TypeScript SDK</a>: build with Pura in
          TypeScript, 23 action modules
        </li>
        <li>
          <a href="/docs/simulation">Simulation</a>: Python simulation showing
          95.7% allocation efficiency
        </li>
      </ul>

      <h3>Domain-specific</h3>
      <ul className={styles.links}>
        <li>
          <a href="https://github.com/puraxyz/puraxyz/blob/main/docs/nips/NIP-XX-backpressure-relay-economics.md">
            NIP-XX specification
          </a>:
          Nostr relay economics standard
        </li>
        <li>
          <a href="https://github.com/puraxyz/puraxyz">
            GitHub repository
          </a>:
          all code, MIT licensed
        </li>
      </ul>
    </div>
    </div>
  );
}
