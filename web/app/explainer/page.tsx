import Image from "next/image";
import AnimatedDiagram from "../components/AnimatedDiagram";
import AnimatedSequence from "../components/AnimatedSequence";
import TableOfContents from "../components/TableOfContents";
import { Radio, Zap, Coins, Globe, PawPrint } from "lucide-react";
import styles from "./page.module.css";
import {
  problemDiagram, solutionDiagram, pipelineDiagram, stakeDiagram,
  verifySequence, priceDiagram, routeDiagram, bufferDiagram,
  bigPictureDiagram, domainsDiagram, lightningDiagram, nostrDiagram,
  demurrageDiagram, reputationDiagram, openclawSequence, bitcoinDiagram,
} from "./diagrams";

export const metadata = { title: "How It Works" };

const sections = [
  { id: "the-problem", label: "The Problem", level: 2 as const },
  { id: "why-crypto", label: "Why Crypto?", level: 2 as const },
  { id: "properties", label: "Properties that matter", level: 3 as const },
  { id: "key-concepts", label: "Key concepts", level: 3 as const },
  { id: "where-runs", label: "Where does BPE run?", level: 3 as const },
  { id: "the-solution", label: "The Solution", level: 2 as const },
  { id: "how-it-works", label: "How It Works", level: 2 as const },
  { id: "declare", label: "1. Declare", level: 3 as const },
  { id: "verify", label: "2. Verify", level: 3 as const },
  { id: "price", label: "3. Price", level: 3 as const },
  { id: "route", label: "4. Route", level: 3 as const },
  { id: "buffer", label: "5. Buffer", level: 3 as const },
  { id: "big-picture", label: "The Big Picture", level: 2 as const },
  { id: "why-care", label: "Why Should I Care?", level: 2 as const },
  { id: "five-domains", label: "Five Domains", level: 2 as const },
  { id: "lightning", label: "Lightning Network", level: 3 as const },
  { id: "nostr", label: "Nostr Relays", level: 3 as const },
  { id: "demurrage", label: "Demurrage", level: 3 as const },
  { id: "platform", label: "Platform Layer", level: 3 as const },
  { id: "openclaw", label: "OpenClaw Agents", level: 3 as const },
  { id: "bitcoin", label: "How This Helps Bitcoin", level: 2 as const },
  { id: "glossary", label: "Glossary", level: 2 as const },
  { id: "deeper", label: "Go Deeper", level: 2 as const },
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
        <Image src="/backproto.png" width={40} height={40} alt="" style={{ borderRadius: 8 }} />
        How BPE Works: The Plain-Language Guide
      </h1>
      <p className={styles.subtitle}>
        <strong>No math degree required.</strong> This page explains Backpressure
        Economics (BPE) from scratch, with pictures.
      </p>

      <hr />

      <h2 id="the-problem">The Problem: AI Agents Need to Pay Each Other</h2>
      <p>
        Imagine a world where AI agents do work for each other, paying with
        cryptocurrency in real-time, streaming tiny amounts every second, like a
        running meter.
      </p>
      <ul>
        <li>
          A <strong>translation agent</strong> pays an{" "}
          <strong>LLM agent</strong> to generate text
        </li>
        <li>
          A <strong>photo app</strong> pays an{" "}
          <strong>image generation agent</strong> to create pictures
        </li>
        <li>
          A <strong>search agent</strong> pays an{" "}
          <strong>embedding agent</strong> to understand text
        </li>
      </ul>
      <p>These payments flow continuously, like water through pipes.</p>
      <p>
        <strong>But here&apos;s the problem:</strong> what happens when an agent
        gets too busy?
      </p>

      <AnimatedDiagram {...problemDiagram} />

      <p>
        The LLM agent can only handle so much work. But the money keeps flowing
        in, whether the work gets done or not. It&apos;s like paying for a
        restaurant meal that never arrives because the kitchen is overwhelmed.
      </p>
      <p>
        <strong>In data networks, this is a solved problem.</strong> Routers
        drop packets or reroute traffic when links are congested. But in payment
        networks? No one has built this. That&apos;s what BPE does.
      </p>

      <hr />

      <h2 id="why-crypto">Wait, Why Does This Need Crypto?</h2>
      <p>
        Fair question. If you&apos;re coming from the AI/ML world, you might
        wonder why any of this involves a blockchain. Here&apos;s the short
        version: <strong>BPE needs programmable money that no single party
        controls.</strong>
      </p>

      <h3 id="properties">The properties that matter</h3>
      <p>
        <strong>Streaming payments.</strong> Agents need to pay each other
        continuously, not in lump sums. A translation agent pays an LLM agent a
        tiny amount every second the work is happening. This requires a payment
        system that supports real-time, per-second flows. That&apos;s what{" "}
        <a href="https://www.superfluid.finance/">Superfluid</a> does: it&apos;s
        a protocol for continuous token streams, where balances update every
        block without requiring a transaction for each payment.
      </p>
      <p>
        <strong>Programmable routing.</strong> The core of BPE is a{" "}
        <a href="https://en.wikipedia.org/wiki/Smart_contract">smart
        contract</a> that automatically splits incoming payment streams based on
        capacity data. Nobody has to approve the split. Nobody can censor it. The
        rules are in the code, and the code runs on a public blockchain where
        anyone can verify it. Try getting Stripe or PayPal to programmatically
        reroute payments to whichever AI agent has the most spare CPU.
      </p>
      <p>
        <strong>No platform risk.</strong> If your agent economy depends on a
        company&apos;s API, that company can change the rules, raise fees, or
        shut down. Smart contracts on a blockchain are permissionless: once
        deployed, they run exactly as written. No terms of service. No API key
        revocations.
      </p>
      <p>
        <strong>Composability.</strong> Every contract on the network can call
        every other contract. BPE&apos;s routing pools can plug into lending
        protocols, insurance contracts, or any other on-chain system without
        needing an integration partner. This means new domains (Lightning channels,
        Nostr relays, anything else) can plug into the same capacity
        infrastructure without anyone&apos;s permission.
      </p>

      <h3 id="key-concepts">Key concepts (quick glossary for AI developers)</h3>
      <table>
        <thead>
          <tr>
            <th>Concept</th>
            <th>What it is</th>
            <th>Why BPE needs it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Token</strong></td>
            <td>A programmable unit of value on a blockchain</td>
            <td>Payments between agents are denominated in tokens</td>
          </tr>
          <tr>
            <td><strong>Smart contract</strong></td>
            <td>A program that lives on a blockchain and executes automatically</td>
            <td>BPE&apos;s routing, pricing, and verification logic are all smart contracts</td>
          </tr>
          <tr>
            <td><strong>Staking</strong></td>
            <td>Locking up tokens as a security deposit</td>
            <td>Agents stake tokens to declare capacity; dishonesty costs them their deposit</td>
          </tr>
          <tr>
            <td><strong>Streaming payments</strong></td>
            <td>Continuous per-second token flows (not batch transfers)</td>
            <td>Agents get paid in real time, proportional to work done</td>
          </tr>
          <tr>
            <td><strong>Layer 2 (L2)</strong></td>
            <td>A faster, cheaper blockchain that inherits security from a main chain</td>
            <td>BPE runs on Base (an L2), so transactions cost fractions of a cent</td>
          </tr>
          <tr>
            <td><strong>Gas</strong></td>
            <td>The fee paid for each blockchain transaction</td>
            <td>On Base L2, gas costs are low enough for frequent capacity updates</td>
          </tr>
        </tbody>
      </table>

      <h3 id="where-runs">Where does BPE run?</h3>
      <p>
        BPE is deployed on <strong><a href="https://base.org">Base</a></strong>,
        an Ethereum{" "}
        <a href="https://en.wikipedia.org/wiki/Blockchain_layer_2">Layer 2</a>{" "}
        network built by Coinbase. Base inherits
        Ethereum&apos;s security guarantees while offering transaction fees under
        $0.01 and confirmation times around 2 seconds. This makes it practical
        for the frequent capacity updates, rebalancing, and attestation
        submissions that BPE requires.
      </p>
      <p>
        You don&apos;t need to understand Ethereum&apos;s internals to use BPE.
        The{" "}
        <a href="https://github.com/backproto/backproto/tree/main/sdk">
          TypeScript SDK
        </a>{" "}
        abstracts the blockchain interaction into straightforward function calls
        like <code>registerSink()</code>, <code>getPrice()</code>, and{" "}
        <code>rebalance()</code>.
      </p>

      <hr />

      <h2 id="the-solution">The Solution: Backpressure Routing for Money</h2>
      <p>
        BPE borrows a brilliant idea from how the internet works:{" "}
        <strong><a href="https://en.wikipedia.org/wiki/Backpressure_routing">backpressure routing</a></strong>. The core idea is simple:
      </p>
      <blockquote>
        <strong>
          Send more money to the agents who have the most spare capacity.
        </strong>
      </blockquote>

      <AnimatedDiagram {...solutionDiagram} />

      <p>
        When Agent A has lots of spare capacity, it gets a bigger share of the
        payments. When Agent B is almost full, it gets less. The system
        automatically reroutes money toward whoever can actually do the work.
      </p>

      <hr />

      <h2 id="how-it-works">How Does It Actually Work?</h2>
      <p>
        There are five key ideas, and they form a pipeline:
      </p>

      <AnimatedDiagram {...pipelineDiagram} />

      <p>Let&apos;s walk through each one.</p>

      <hr />

      <h3 id="declare"><StepNum n={1} /> Declare: &quot;Here&apos;s How Much I Can Handle&quot;</h3>
      <p>
        Every AI agent that wants to receive payments (<strong>called a
        &quot;sink&quot;</strong>) tells the network how much work it can
        process. Think of it like a restaurant posting how many tables are open.
      </p>
      <p>
        But there&apos;s a catch: agents might lie to get more money. So
        declarations go through two safeguards:
      </p>
      <p>
        <strong>Stake to play.</strong> Every agent must put down a deposit (like
        a security deposit on an apartment). The more you deposit, the more
        capacity you&apos;re allowed to claim. This prevents someone from
        creating a thousand fake agents to steal payments (a{" "}
        <a href="https://en.wikipedia.org/wiki/Sybil_attack">Sybil attack</a>).
      </p>

      <AnimatedDiagram {...stakeDiagram} />

      <p>
        Notice something? Depositing 4x more only gives you 2x more capacity.
        This is by design. It makes the &quot;create fake identities&quot;
        attack unprofitable.
      </p>
      <p>
        <strong><a href="https://en.wikipedia.org/wiki/Commitment_scheme">Commit-reveal</a>.</strong> Agents don&apos;t just blurt out their
        capacity. They first submit a sealed commitment (like a sealed auction
        bid), then reveal the actual number later. This prevents other agents
        from seeing your number and gaming the system.
      </p>

      <hr />

      <h3 id="verify"><StepNum n={2} /> Verify: &quot;Prove You Actually Did the Work&quot;</h3>
      <p>
        Declaring capacity is one thing. Actually doing the work is another. BPE
        has a built-in lie detector:
      </p>

      <AnimatedSequence {...verifySequence} />

      <p>
        Every completed task produces a <strong>dual-signed receipt</strong>:
        both the agent doing the work AND the agent requesting it must sign off.
        The blockchain counts these receipts and compares them to what the agent{" "}
        <em>claimed</em> it could do.
      </p>
      <p>
        <strong>
          If an agent claims it can handle 100 tasks per period but only
          completes 40?
        </strong>{" "}
        After three bad periods in a row, 10% of its deposit gets taken away.
        This makes lying about capacity a losing strategy.
      </p>

      <hr />

      <h3 id="price"><StepNum n={3} /> Price: Busy Agents Cost More</h3>
      <p>
        Just like Uber&apos;s{" "}
        <a href="https://en.wikipedia.org/wiki/Dynamic_pricing">surge pricing</a>, BPE makes busy agents more
        expensive:
      </p>

      <AnimatedDiagram {...priceDiagram} />

      <p>The price has two parts:</p>
      <ul>
        <li>
          <strong>Base fee:</strong> goes up when demand is high across the
          board (like gas prices during a shortage)
        </li>
        <li>
          <strong>Queue premium:</strong> goes up for a specific agent when
          their personal queue is long
        </li>
      </ul>
      <p>
        This naturally pushes demand toward agents that have spare capacity,
        because they&apos;re cheaper.
      </p>

      <hr />

      <h3 id="route"><StepNum n={4} /> Route: Money Flows Where Capacity Is</h3>
      <p>
        This is the magic step. A smart contract called the{" "}
        <strong>Backpressure Pool</strong> collects all incoming payment streams
        and redistributes them automatically.
      </p>

      <AnimatedDiagram {...routeDiagram} />

      <p>
        The pool divides money in proportion to each agent&apos;s verified
        capacity. Agents with more verified capacity get a bigger slice. This
        happens <strong>automatically and continuously</strong>, with no
        middleman, no manual intervention.
      </p>
      <p>
        When capacity changes (an agent gets busier, or a new agent joins),
        anyone can trigger a <strong>rebalance</strong> to update the split.
      </p>

      <hr />

      <h3 id="buffer"><StepNum n={5} /> Buffer: A Safety Net for Overflow</h3>
      <p>
        What if ALL agents are at capacity and money keeps coming in? Instead of
        losing it, BPE holds it in an <strong>escrow buffer</strong>, like a
        waiting room.
      </p>

      <AnimatedDiagram {...bufferDiagram} />

      <p>
        When capacity frees up, the buffer drains automatically. If the buffer
        itself fills up, sources get a clear signal: stop sending until things
        clear up.
      </p>

      <hr />

      <h2 id="big-picture">The Big Picture</h2>
      <p>
        Here&apos;s how all the pieces fit together in one view:
      </p>

      <AnimatedDiagram {...bigPictureDiagram} />

      <hr />

      <h2 id="why-care">Why Should I Care?</h2>
      <p>
        BPE matters because AI agents are starting to transact with each other
        autonomously, paying for compute, data, and services without humans in
        the loop. Today&apos;s payment systems can&apos;t handle this:
      </p>

      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Traditional Payments</th>
            <th>BPE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Agent gets overwhelmed</td>
            <td>Money wasted, work unfinished</td>
            <td>Money reroutes to available agents</td>
          </tr>
          <tr>
            <td>Agent lies about capacity</td>
            <td>No way to know</td>
            <td>Automatic detection and penalty</td>
          </tr>
          <tr>
            <td>New agent joins</td>
            <td>Manual integration</td>
            <td>Permissionless: just stake and register</td>
          </tr>
          <tr>
            <td>Demand spikes</td>
            <td>System breaks</td>
            <td>Prices rise, demand balances naturally</td>
          </tr>
          <tr>
            <td>Agent goes offline</td>
            <td>Payments lost</td>
            <td>Buffer holds funds, pool rebalances</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="five-domains">Beyond AI Agents: Five Domains</h2>
      <p>
        The core BPE mechanism (declare, verify, price, route, buffer) is
        domain-agnostic. Anywhere there&apos;s a capacity-constrained service
        and a continuous payment flow, backpressure routing can improve
        allocation. Backproto extends BPE to five domains:
      </p>

      <AnimatedDiagram {...domainsDiagram} />

      <hr />

      <h3 id="lightning"><Zap size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} /> Lightning Network: Better Routing Through Capacity Signals</h3>
      <p>
        The <a href="https://en.wikipedia.org/wiki/Lightning_Network">Lightning Network</a> enables
        instant Bitcoin payments through a network of{" "}
        <a href="https://en.wikipedia.org/wiki/Payment_channel">payment channels</a>. But
        routing payments through Lightning is unreliable: senders rely on stale
        gossip data about channel liquidity and have to probe routes by trial and
        error until one works.
      </p>
      <p>
        Backproto adds a <strong>real-time capacity signaling layer</strong> for
        Lightning, without modifying the Lightning protocol itself:
      </p>
      <p>
        <strong>LightningCapacityOracle.</strong> Node operators submit signed
        attestations of their aggregate outbound liquidity. These reports are
        smoothed using{" "}
        <a href="https://en.wikipedia.org/wiki/Exponential_smoothing">EWMA</a>{" "}
        so a single bad report doesn&apos;t swing the data.
        Operators only report aggregate capacity, not individual channel
        balances, preserving privacy.
      </p>
      <p>
        <strong>LightningRoutingPool.</strong> A BPE pool where Lightning nodes
        are weighted by their routing capacity. Nodes with more available
        liquidity and balanced channels earn more streaming revenue. This creates
        a direct economic incentive to keep channels well-funded and balanced.
      </p>
      <p>
        <strong>CrossProtocolRouter.</strong> A unified routing interface that
        selects the best payment protocol for each transaction:
      </p>
      <table>
        <thead>
          <tr>
            <th>Protocol</th>
            <th>Speed</th>
            <th>Reliability</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lightning</td>
            <td>~2 seconds</td>
            <td>95% success</td>
            <td>Instant, small payments</td>
          </tr>
          <tr>
            <td>Superfluid</td>
            <td>~4 seconds</td>
            <td>99% success</td>
            <td>Ongoing streaming payments</td>
          </tr>
          <tr>
            <td>On-chain</td>
            <td>~12 seconds</td>
            <td>99.99% success</td>
            <td>Large, high-assurance settlements</td>
          </tr>
        </tbody>
      </table>

      <AnimatedDiagram {...lightningDiagram} />

      <p>
        This runs on Base (L2) as a <strong>sidecar</strong> to Lightning. It
        doesn&apos;t change how Lightning works. It provides an external capacity
        signaling and incentive layer that pathfinding algorithms and node
        operators can use to make better decisions.
      </p>

      <hr />

      <h3 id="nostr"><Radio size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} /> Nostr Relays: Making Relay Operation Sustainable</h3>
      <p>
        <a href="https://nostr.com/">Nostr</a> is a decentralized social
        protocol. Messages are distributed through relays, servers operated by
        volunteers. Most relays run at a loss or depend on donations. Users have
        no way to discover which relays have capacity, and relays have no way to
        price their services based on actual load.
      </p>
      <p>
        Backproto adds an economic layer for Nostr relays using the same BPE
        primitives:
      </p>
      <ol>
        <li>
          Relay operators register and declare <strong>multi-dimensional
          capacity</strong>: throughput (events/sec), storage (GB), and bandwidth
          (Mbps)
        </li>
        <li>
          Capacity is verified through cryptographically signed attestations,
          smoothed over time to prevent gaming
        </li>
        <li>
          A payment pool distributes relay subscription revenue proportional to
          verified spare capacity
        </li>
        <li>
          <strong>Anti-spam pricing</strong> scales with congestion: publishing
          events costs more on busy relays (2x at 50% load, 4x at 80%)
        </li>
      </ol>

      <AnimatedDiagram {...nostrDiagram} />

      <p>
        The result: relay operators who invest in real capacity earn
        proportionally more. Operators who overcommit get less (and get slashed).
        Users get a reliable discovery mechanism for quality relays. We&apos;ve
        drafted <strong>NIP-XX</strong>, a Nostr Improvement Proposal to
        standardize this.
      </p>

      <hr />

      <h3 id="demurrage"><Coins size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} /> Demurrage: Tokens That Lose Value Over Time</h3>
      <p>
        Most tokens just sit in wallets. In an agent economy, that&apos;s a
        problem: idle money means idle capacity.{" "}
        <strong><a href="https://en.wikipedia.org/wiki/Demurrage_(currency)">Demurrage</a></strong> is an old economic idea (proposed by{" "}
        <a href="https://en.wikipedia.org/wiki/Silvio_Gesell">Silvio
        Gesell</a> in 1916) that puts a holding cost on currency, effectively
        encouraging people to spend it rather than hoard it.
      </p>
      <p>
        Backproto implements this as the <strong>DemurrageToken</strong>, a token
        whose balance continuously decays if you hold it without using it:
      </p>

      <AnimatedDiagram {...demurrageDiagram} />

      <p><strong>Key details:</strong></p>
      <ul>
        <li>
          Decay is <strong>continuous and exponential</strong>: your balance
          shrinks every second you hold it idle, at a configurable rate (default:
          5% per year)
        </li>
        <li>
          Decay only applies to <strong>idle holdings</strong>. Tokens locked in
          streaming agreements or staking contracts are exempt.
        </li>
        <li>
          The decayed tokens are recycled to a configurable recipient (e.g., a
          community treasury or the protocol itself)
        </li>
        <li>
          A companion contract, <strong>VelocityMetrics</strong>, tracks how fast
          tokens circulate through the economy on an hourly basis
        </li>
      </ul>
      <p>
        <strong>Why this matters for BPE:</strong> Demurrage is the stock-side
        complement to BPE&apos;s flow-side mechanism. BPE routes payments
        efficiently to where capacity exists. Demurrage ensures those payments
        actually get made, because holding tokens becomes a losing strategy. The
        two together create stronger circulation pressure than either alone.
      </p>

      <hr />

      <h3 id="platform"><Globe size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} /> Platform Layer: Plugging It All Together</h3>
      <p>
        With four different domains using BPE, there&apos;s a coordination
        problem: how do you share infrastructure and reputation across domains?
        That&apos;s what the platform layer handles.
      </p>
      <p>
        <strong>UniversalCapacityAdapter.</strong> A registry of domain adapters
        that normalizes capacity signals from any domain into a common format the
        core BPE contracts understand. This means a new domain (say,
        decentralized storage or compute marketplaces) can plug into Backproto by
        registering a single adapter contract.
      </p>
      <p>
        <strong>ReputationLedger.</strong> A cross-domain reputation system that
        makes your track record portable:
      </p>
      <ul>
        <li>
          An AI agent operator who also reliably runs a Lightning node gets credit
          for both
        </li>
        <li>
          <strong>Negative signals weigh 3x more than positive ones</strong>: one
          domain of bad behavior hurts your overall score disproportionately,
          making it harder for bad actors to hide behind good performance
          elsewhere
        </li>
        <li>
          Good cross-domain reputation earns{" "}
          <strong>up to 50% stake discounts</strong>: if you&apos;ve proven
          reliable in multiple domains, you need less collateral to participate
        </li>
      </ul>

      <AnimatedDiagram {...reputationDiagram} />

      <p>
        The platform layer is what turns Backproto from &quot;a routing protocol
        for AI agents&quot; into &quot;a universal capacity coordination layer
        for decentralized networks.&quot;
      </p>

      <hr />

      <h3 id="openclaw"><PawPrint size={20} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.4rem" }} /> OpenClaw Agents: Coordinating Skill Networks at Scale</h3>
      <p>
        <a href="https://openclaw.com/">OpenClaw</a> is the largest
        open-source AI agent framework (315k GitHub stars and growing) with ClawHub, a
        marketplace of installable agent skills. As OpenClaw deployments
        grow from single agents to multi-agent pipelines, a coordination
        problem emerges: which agent gets the next task, how do you verify it
        was completed, and how do you build trust across skill types?
      </p>
      <p>
        Backproto adds an economic coordination layer for OpenClaw agent
        networks using three purpose-built contracts:
      </p>
      <p><strong>How it works:</strong></p>
      <ol>
        <li>
          Agent operators register with a <strong>skill type</strong> (e.g.,
          research, code review, content generation) and stake tokens to declare
          capacity
        </li>
        <li>
          The <strong>OpenClawCapacityAdapter</strong> translates
          multi-dimensional skill metrics into a single normalized score:
          <ul>
            <li><strong>Throughput</strong> (tasks/epoch): weighted 50%</li>
            <li>
              <strong>Latency</strong> (ms): weighted 30%, inverse-scored (lower
              is better)
            </li>
            <li>
              <strong>Error rate</strong> (basis points): weighted 20%,
              inverse-scored
            </li>
          </ul>
          Scores are smoothed with EWMA (alpha=0.3) to resist gaming
        </li>
        <li>
          The <strong>OpenClawCompletionVerifier</strong> uses EIP-712
          dual-signature verification (agent + requester) to record skill
          executions on-chain, creating an immutable completion log
        </li>
        <li>
          The <strong>OpenClawReputationBridge</strong> feeds completion and
          failure events into the cross-domain ReputationLedger, making an
          agent&apos;s OpenClaw track record portable to other domains
        </li>
      </ol>

      <AnimatedSequence {...openclawSequence} />

      <p><strong>What this enables:</strong></p>
      <ul>
        <li>
          <strong>Capacity-weighted task routing</strong>: When a pipeline needs
          a research agent, Backproto routes to the agent with the most verified
          spare capacity, not just the cheapest or first-available
        </li>
        <li>
          <strong>Verifiable execution history</strong>: Dual-signature
          completion records provide an auditable log that ClawHub can reference
          for dispute resolution
        </li>
        <li>
          <strong>Portable reputation</strong>: An agent&apos;s reliability in
          one skill category carries over to others. Strong cross-domain
          reputation (OpenClaw + Lightning node + Nostr relay) earns up to 50%
          stake discounts
        </li>
        <li>
          <strong>Pipeline orchestration</strong>: Multi-stage agent pipelines
          (research -&gt; analysis -&gt; report) can efficiently allocate each
          stage to available agents using Backproto&apos;s Pipeline contract
        </li>
      </ul>
      <p>
        <strong>The sidecar model</strong>: Backproto does not modify
        OpenClaw&apos;s core. Agents opt in by installing a Backproto
        coordination skill that handles staking, capacity reporting, and
        completion attestation. The integration lives entirely on-chain on Base
        L2.
      </p>

      <hr />

      <h2 id="bitcoin">How This Helps Bitcoin</h2>
      <p>
        If you&apos;re in the Bitcoin ecosystem, the Lightning section above is
        where Backproto directly contributes. Here&apos;s the full picture.
      </p>

      <h3 id="lightning-routing">The problem: Lightning routing is unreliable</h3>
      <p>
        Lightning Network payments fail more often than they should. The root
        cause is stale routing information. Nodes advertise channel capacity
        through gossip, but this data is often minutes or hours old. When you try
        to route a payment, you&apos;re working with an outdated map. The
        result: probe failures, retries, and a poor user experience that
        discourages adoption.
      </p>
      <p>
        Node operators face a related problem. Keeping channels well-balanced
        (with liquidity on both sides) is essential for routing fees, but
        there&apos;s no standardized signal telling operators where demand is
        flowing or which channels need rebalancing.
      </p>

      <h3 id="backproto-adds">What Backproto adds</h3>
      <p>Backproto provides three things the Lightning ecosystem currently lacks:</p>
      <p>
        <strong>1. Real-time capacity signals.</strong> The{" "}
        <code>LightningCapacityOracle</code> collects signed capacity
        attestations from node operators, smooths them with EWMA to resist
        manipulation, and makes them available on-chain. This is aggregate
        outbound liquidity per node, not individual channel balances, so privacy
        is preserved. Pathfinding algorithms can query this for fresher data
        than gossip provides.
      </p>
      <p>
        <strong>2. Economic incentives for balanced channels.</strong> The{" "}
        <code>LightningRoutingPool</code> distributes streaming payment revenue
        to nodes proportional to their verified routing capacity. Nodes with
        more available liquidity earn more. This creates a direct financial
        incentive to keep channels funded and balanced, rather than relying on
        altruism or manual rebalancing.
      </p>
      <p>
        <strong>3. Cross-protocol settlement.</strong> The{" "}
        <code>CrossProtocolRouter</code> provides a single interface that routes
        payments across Lightning (instant, ~2s), Superfluid streaming
        (continuous, ~4s), and on-chain settlement (high assurance, ~12s). This
        means applications can use the best protocol for each payment type
        without managing three separate integrations.
      </p>

      <h3 id="sidecar">The sidecar model</h3>
      <p>
        Critically, Backproto <strong>does not modify the Lightning
        protocol</strong>. It runs on Base (an Ethereum L2) as a sidecar,
        providing an external capacity signaling and incentive layer. Lightning
        node operators can opt in by submitting capacity attestations.
        Pathfinding services can query the oracle. Nothing about Lightning&apos;s
        core architecture changes.
      </p>
      <p>
        This is important because the Lightning developer community is (rightly)
        conservative about protocol changes. Backproto offers improved routing
        without requiring a BOLT update, a node software fork, or consensus
        among Lightning implementations.
      </p>

      <h3 id="bitcoin-adoption">Why this matters for Bitcoin adoption</h3>
      <p>
        Better routing means fewer failed payments. Fewer failed payments means
        a better user experience. A better user experience means more people and
        businesses adopt Lightning for everyday payments.
      </p>

      <AnimatedDiagram {...bitcoinDiagram} />

      <p>
        The economic incentive layer also addresses a structural problem:
        Lightning routing is somewhat of a public good (routers earn small fees
        relative to the capital they lock up). By providing streaming revenue
        proportional to verified capacity, Backproto makes routing more
        financially sustainable, which should attract more liquidity into the
        network.
      </p>

      <hr />

      <h2 id="glossary">Glossary</h2>

      <h3>Core Concepts</h3>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Plain English</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sink</strong></td>
            <td>A service provider (AI agent, relay, Lightning node) that receives payment for doing work</td>
          </tr>
          <tr>
            <td><strong>Source</strong></td>
            <td>An app or agent that pays for work to be done</td>
          </tr>
          <tr>
            <td><strong>Task type</strong></td>
            <td>A category of work (e.g., &quot;text generation&quot;, &quot;image creation&quot;, &quot;relay storage&quot;)</td>
          </tr>
          <tr>
            <td><strong>Capacity</strong></td>
            <td>How much work a service provider can handle at once</td>
          </tr>
          <tr>
            <td><strong>Spare capacity</strong></td>
            <td>The difference between declared capacity and current workload. This drives routing.</td>
          </tr>
          <tr>
            <td><strong>Rebalance</strong></td>
            <td>Updating how payments are split based on current capacity across all participants</td>
          </tr>
          <tr>
            <td><strong>Epoch</strong></td>
            <td>A time window (typically 5 minutes) for measuring performance and updating prices</td>
          </tr>
          <tr>
            <td><strong>Pipeline</strong></td>
            <td>A multi-stage chain of pools where upstream congestion propagates backward</td>
          </tr>
        </tbody>
      </table>

      <h3>Crypto and Blockchain</h3>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Plain English</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Token</strong></td>
            <td>A programmable unit of value on a blockchain, like a digital dollar that code can move</td>
          </tr>
          <tr>
            <td><strong><a href="https://en.wikipedia.org/wiki/ERC-20">ERC-20</a></strong></td>
            <td>The most common token standard on Ethereum. Defines how tokens are transferred, approved, and tracked.</td>
          </tr>
          <tr>
            <td><strong>Super Token</strong></td>
            <td>A Superfluid-compatible token that supports streaming (continuous per-second flows) and distribution</td>
          </tr>
          <tr>
            <td><strong>Smart contract</strong></td>
            <td>A program that lives on a blockchain and executes automatically when conditions are met</td>
          </tr>
          <tr>
            <td><strong>Staking</strong></td>
            <td>Locking up tokens as a security deposit. In BPE, agents stake to declare capacity.</td>
          </tr>
          <tr>
            <td><strong>Slashing</strong></td>
            <td>Penalty: taking part of a participant&apos;s staked deposit for dishonest behavior</td>
          </tr>
          <tr>
            <td><strong>Gas</strong></td>
            <td>The small fee paid for each blockchain transaction. On Base L2, gas costs are fractions of a cent.</td>
          </tr>
          <tr>
            <td><strong>Base</strong></td>
            <td>An Ethereum Layer 2 network built by Coinbase. Low fees, fast confirmations, Ethereum security.</td>
          </tr>
          <tr>
            <td><strong>Layer 2 (L2)</strong></td>
            <td>A faster, cheaper blockchain that batches transactions and posts proofs to a main chain for security</td>
          </tr>
          <tr>
            <td><strong>Superfluid</strong></td>
            <td>A protocol for real-time token streaming. BPE uses its General Distribution Agreement (GDA) for payment routing.</td>
          </tr>
          <tr>
            <td><strong>GDA</strong></td>
            <td>General Distribution Agreement. Superfluid&apos;s mechanism for splitting a single payment stream among multiple recipients proportionally.</td>
          </tr>
        </tbody>
      </table>

      <h3>Technical Mechanisms</h3>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Plain English</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>EWMA</strong></td>
            <td>Exponentially Weighted Moving Average. A smoothing method that weights recent data more than old data, preventing sudden suspicious capacity changes.</td>
          </tr>
          <tr>
            <td><strong>Commit-reveal</strong></td>
            <td>A two-step process where you first submit a sealed (hashed) value, then reveal the actual value later. Prevents front-running.</td>
          </tr>
          <tr>
            <td><strong><a href="https://eips.ethereum.org/EIPS/eip-712">EIP-712</a></strong></td>
            <td>A standard for signing structured data off-chain. Used for capacity attestations and completion receipts.</td>
          </tr>
          <tr>
            <td><strong>Attestation</strong></td>
            <td>A cryptographically signed statement (e.g., &quot;I have 500 units of capacity&quot;). Verified on-chain.</td>
          </tr>
          <tr>
            <td><strong>Sybil resistance</strong></td>
            <td>Protection against an attacker creating many fake identities. BPE&apos;s concave stake cap (square root) makes splitting unprofitable.</td>
          </tr>
        </tbody>
      </table>

      <h3>Domain-Specific</h3>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Plain English</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Demurrage</strong></td>
            <td>A holding cost on currency that causes idle balances to decay over time, incentivizing circulation</td>
          </tr>
          <tr>
            <td><strong>Velocity</strong></td>
            <td>How fast money circulates through the economy. Measured per epoch in BPE&apos;s VelocityMetrics contract.</td>
          </tr>
          <tr>
            <td><strong>NIP</strong></td>
            <td>Nostr Implementation Possibility. A specification for how Nostr software should implement a feature.</td>
          </tr>
          <tr>
            <td><strong>Nostr relay</strong></td>
            <td>A server that stores and distributes Nostr events (messages). Currently lacks a sustainable revenue model.</td>
          </tr>
          <tr>
            <td><strong>Lightning Network</strong></td>
            <td>A layer on top of Bitcoin for instant, low-fee payments through a network of payment channels</td>
          </tr>
          <tr>
            <td><strong>Channel capacity</strong></td>
            <td>The amount of Bitcoin locked in a Lightning channel, determining how much can be routed through it</td>
          </tr>
          <tr>
            <td><strong>Cross-protocol routing</strong></td>
            <td>Selecting the best payment protocol (Lightning, streaming, on-chain) based on speed, cost, and reliability</td>
          </tr>
          <tr>
            <td><strong>Reputation ledger</strong></td>
            <td>A cross-domain scoring system that makes your track record portable across BPE domains</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="deeper">Want to Go Deeper?</h2>

      <h3>Academic &amp; Formal</h3>
      <ul className={styles.links}>
        <li>
          <a href="https://backproto.io/paper">Research Paper</a>: formal model,
          proofs, and evaluation
        </li>
        <li>
          <a href="/paper/introduction">Paper: Introduction</a>: problem
          statement and contributions
        </li>
        <li>
          <a href="/paper/protocol">Paper: Protocol Design</a>: technical
          details of each smart contract
        </li>
      </ul>

      <h3>Implementation</h3>
      <ul className={styles.links}>
        <li>
          <a href="/docs/contracts">Smart Contracts</a>: the Solidity code, 17
          contracts deployed on Base Sepolia
        </li>
        <li>
          <a href="/docs/sdk">TypeScript SDK</a>: build with BPE in TypeScript,
          13 action modules
        </li>
        <li>
          <a href="/docs/simulation">Simulation</a>: Python simulation showing
          95.7% allocation efficiency
        </li>
      </ul>

      <h3>Domain-Specific</h3>
      <ul className={styles.links}>
        <li>
          <a href="https://github.com/backproto/backproto/blob/main/docs/nips/NIP-XX-backpressure-relay-economics.md">
            NIP-XX Specification
          </a>
          : the Nostr relay economics standard
        </li>
        <li>
          <a href="https://github.com/backproto/backproto">
            GitHub Repository
          </a>
          : all code, MIT licensed
        </li>
      </ul>
    </div>
    </div>
  );
}
