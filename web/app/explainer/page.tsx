import Mermaid from "../components/Mermaid";
import styles from "./page.module.css";

export const metadata = { title: "How It Works" };

export default function ExplainerPage() {
  return (
    <div className={styles.page}>
      <h1>How BPE Works - The Plain-Language Guide</h1>
      <p className={styles.subtitle}>
        <strong>No math degree required.</strong> This page explains Backpressure
        Economics (BPE) from scratch, with pictures.
      </p>

      <hr />

      <h2>The Problem: AI Agents Need to Pay Each Other</h2>
      <p>
        Imagine a world where AI agents do work for each other - and pay with
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

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    A[Translation Agent<br/>Sending $10/min] -->|payment stream| B[LLM Agent<br/>⚠️ At capacity!]
    C[Chat Agent<br/>Sending $5/min] -->|payment stream| B
    D[Writing Agent<br/>Sending $8/min] -->|payment stream| B

    style B fill:#ff6b6b,color:#fff`}
        />
      </div>

      <p>
        The LLM agent can only handle so much work. But the money keeps flowing
        in, whether the work gets done or not. It&apos;s like paying for a
        restaurant meal that never arrives because the kitchen is overwhelmed.
      </p>
      <p>
        <strong>In data networks, this is a solved problem</strong> - routers
        drop packets or reroute traffic when links are congested. But in payment
        networks? No one has built this. That&apos;s what BPE does.
      </p>

      <hr />

      <h2>Wait, Why Does This Need Crypto?</h2>
      <p>
        Fair question. If you&apos;re coming from the AI/ML world, you might
        wonder why any of this involves a blockchain. Here&apos;s the short
        version: <strong>BPE needs programmable money that no single party
        controls.</strong>
      </p>

      <h3>The properties that matter</h3>
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
        <strong>Programmable routing.</strong> The core of BPE is a smart
        contract that automatically splits incoming payment streams based on
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
        needing an integration partner. This means new domains (Nostr relays,
        Lightning channels, anything else) can plug into the same capacity
        infrastructure without anyone&apos;s permission.
      </p>

      <h3>Key concepts (quick glossary for AI developers)</h3>
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

      <h3>Where does BPE run?</h3>
      <p>
        BPE is deployed on <strong><a href="https://base.org">Base</a></strong>,
        an Ethereum Layer 2 network built by Coinbase. Base inherits
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

      <h2>The Solution: Backpressure Routing for Money</h2>
      <p>
        BPE borrows a brilliant idea from how the internet works:{" "}
        <strong>backpressure routing</strong>. The core idea is simple:
      </p>
      <blockquote>
        <strong>
          Send more money to the agents who have the most spare capacity.
        </strong>
      </blockquote>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    A[Translation Agent<br/>Sending $10/min] -->|$7/min| B[LLM Agent A<br/>✅ 70% free]
    A -->|$3/min| C[LLM Agent B<br/>⚠️ 30% free]

    style B fill:#51cf66,color:#fff
    style C fill:#ffd43b,color:#000`}
        />
      </div>

      <p>
        When Agent A has lots of spare capacity, it gets a bigger share of the
        payments. When Agent B is almost full, it gets less. The system
        automatically reroutes money toward whoever can actually do the work.
      </p>

      <hr />

      <h2>How Does It Actually Work?</h2>
      <p>
        There are five key ideas, and they form a pipeline:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    subgraph "1️⃣ DECLARE"
        S1[Each agent announces<br/>how much work it can handle]
    end

    subgraph "2️⃣ VERIFY"
        S2[The system checks<br/>if they're telling the truth]
    end

    subgraph "3️⃣ PRICE"
        S4[Busy agents become<br/>more expensive]
    end

    subgraph "4️⃣ ROUTE"
        S3[Payments flow to agents<br/>based on their capacity]
    end

    subgraph "5️⃣ BUFFER"
        S5[Overflow payments are<br/>held safely until capacity frees up]
    end

    S1 --> S2 --> S4 --> S3 --> S5

    style S1 fill:#339af0,color:#fff
    style S2 fill:#845ef7,color:#fff
    style S4 fill:#f76707,color:#fff
    style S3 fill:#51cf66,color:#fff
    style S5 fill:#ffd43b,color:#000`}
        />
      </div>

      <p>Let&apos;s walk through each one.</p>

      <hr />

      <h3>1️⃣ Declare: &quot;Here&apos;s How Much I Can Handle&quot;</h3>
      <p>
        Every AI agent that wants to receive payments (<strong>called a
        &quot;sink&quot;</strong>) tells the network how much work it can
        process. Think of it like a restaurant posting how many tables are open.
      </p>
      <p>
        But there&apos;s a catch - agents might lie to get more money. So
        declarations go through two safeguards:
      </p>
      <p>
        <strong>Stake to play.</strong> Every agent must put down a deposit (like
        a security deposit on an apartment). The more you deposit, the more
        capacity you&apos;re allowed to claim. This prevents someone from
        creating a thousand fake agents to steal payments.
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    A[Agent deposits<br/>100 tokens] -->|stake| B[Allowed to claim<br/>capacity of 10]
    C[Agent deposits<br/>400 tokens] -->|stake| D[Allowed to claim<br/>capacity of 20]

    style A fill:#e9ecef
    style C fill:#e9ecef
    style B fill:#339af0,color:#fff
    style D fill:#339af0,color:#fff`}
        />
      </div>

      <p>
        Notice something? Depositing 4x more only gives you 2x more capacity.
        This is by design - it makes the &quot;create fake identities&quot;
        attack unprofitable.
      </p>
      <p>
        <strong>Commit-reveal.</strong> Agents don&apos;t just blurt out their
        capacity. They first submit a sealed commitment (like a sealed auction
        bid), then reveal the actual number later. This prevents other agents
        from seeing your number and gaming the system.
      </p>

      <hr />

      <h3>2️⃣ Verify: &quot;Prove You Actually Did the Work&quot;</h3>
      <p>
        Declaring capacity is one thing. Actually doing the work is another. BPE
        has a built-in lie detector:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`sequenceDiagram
    participant Source as 📱 App (Source)
    participant Sink as 🤖 AI Agent (Sink)
    participant Chain as ⛓️ Blockchain

    Source->>Sink: Send task request
    Sink->>Sink: Do the work
    Sink->>Source: Return result + sign receipt
    Source->>Chain: Submit receipt (both signatures)
    Chain->>Chain: Count completions vs. declared capacity
    
    Note over Chain: If completions < 50% of declared capacity<br/>for 3 periods in a row → slash the deposit!`}
        />
      </div>

      <p>
        Every completed task produces a <strong>dual-signed receipt</strong> -
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

      <h3>3️⃣ Price: Busy Agents Cost More</h3>
      <p>
        Just like Uber&apos;s surge pricing, BPE makes busy agents more
        expensive:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    subgraph "Low demand"
        A1[Queue: 2 tasks waiting] --> B1["Price: $1.00/task"]
    end
    subgraph "Medium demand"
        A2[Queue: 10 tasks waiting] --> B2["Price: $1.80/task"]
    end
    subgraph "High demand"
        A3[Queue: 50 tasks waiting] --> B3["Price: $5.00/task"]
    end

    style B1 fill:#51cf66,color:#fff
    style B2 fill:#ffd43b,color:#000
    style B3 fill:#ff6b6b,color:#fff`}
        />
      </div>

      <p>The price has two parts:</p>
      <ul>
        <li>
          <strong>Base fee</strong> - goes up when demand is high across the
          board (like gas prices during a shortage)
        </li>
        <li>
          <strong>Queue premium</strong> - goes up for a specific agent when
          their personal queue is long
        </li>
      </ul>
      <p>
        This naturally pushes demand toward agents that have spare capacity,
        because they&apos;re cheaper.
      </p>

      <hr />

      <h3>4️⃣ Route: Money Flows Where Capacity Is</h3>
      <p>
        This is the magic step. A smart contract called the{" "}
        <strong>Backpressure Pool</strong> collects all incoming payment streams
        and redistributes them automatically.
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    P1[Source 1<br/>$5/min] --> Pool
    P2[Source 2<br/>$3/min] --> Pool
    P3[Source 3<br/>$7/min] --> Pool

    Pool["Backpressure Pool<br/>$15/min total"] --> S1
    Pool --> S2
    Pool --> S3

    S1["Agent A - 50% capacity<br/>Gets $7.50/min"]
    S2["Agent B - 30% capacity<br/>Gets $4.50/min"]
    S3["Agent C - 20% capacity<br/>Gets $3.00/min"]

    style Pool fill:#339af0,color:#fff
    style S1 fill:#51cf66,color:#fff
    style S2 fill:#51cf66,color:#fff
    style S3 fill:#51cf66,color:#fff`}
        />
      </div>

      <p>
        The pool divides money in proportion to each agent&apos;s verified
        capacity. Agents with more verified capacity get a bigger slice. This
        happens <strong>automatically and continuously</strong> - no middleman,
        no manual intervention.
      </p>
      <p>
        When capacity changes (an agent gets busier, or a new agent joins),
        anyone can trigger a <strong>rebalance</strong> to update the split.
      </p>

      <hr />

      <h3>5️⃣ Buffer: A Safety Net for Overflow</h3>
      <p>
        What if ALL agents are at capacity and money keeps coming in? Instead of
        losing it, BPE holds it in an <strong>escrow buffer</strong> - like a
        waiting room.
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    IN["Incoming: $20/min"] --> CHECK{Any capacity<br/>available?}
    CHECK -->|Yes| POOL["Backpressure Pool<br/>Routes to agents"]
    CHECK -->|No| BUFFER["Escrow Buffer<br/>Holds excess safely"]
    BUFFER -->|When capacity frees up| POOL

    style BUFFER fill:#ffd43b,color:#000
    style POOL fill:#51cf66,color:#fff`}
        />
      </div>

      <p>
        When capacity frees up, the buffer drains automatically. If the buffer
        itself fills up, sources get a clear signal: stop sending until things
        clear up.
      </p>

      <hr />

      <h2>The Big Picture</h2>
      <p>
        Here&apos;s how all the pieces fit together in one view:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    subgraph "Off-chain (fast, free)"
        ATTEST["Agents sign capacity<br/>attestations off-chain"]
    end

    subgraph "On-chain (secure, permanent)"
        AGG["Aggregator<br/>Batches attestations"] --> REG["Capacity Registry<br/>Tracks who can do what"]
        SM["Stake Manager<br/>Deposits & capacity caps"] --> REG
        REG --> POOL["Backpressure Pool<br/>Routes payments"]
        REG --> PRICE["Pricing Curve<br/>Dynamic fees"]
        POOL --> GDA["Superfluid Streams<br/>Continuous payments"]
        POOL --> BUF["Escrow Buffer<br/>Overflow safety"]
        COMP["Completion Tracker<br/>Verifies actual work"] -.->|slash if lying| SM
    end

    ATTEST --> AGG

    style ATTEST fill:#e9ecef
    style AGG fill:#845ef7,color:#fff
    style REG fill:#339af0,color:#fff
    style SM fill:#339af0,color:#fff
    style POOL fill:#51cf66,color:#fff
    style PRICE fill:#f76707,color:#fff
    style GDA fill:#51cf66,color:#fff
    style BUF fill:#ffd43b,color:#000
    style COMP fill:#ff6b6b,color:#fff`}
        />
      </div>

      <hr />

      <h2>Why Should I Care?</h2>
      <p>
        BPE matters because AI agents are starting to transact with each other
        autonomously - paying for compute, data, and services without humans in
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
            <td>Permissionless - just stake and register</td>
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

      <h2>Beyond AI Agents: Five Domains</h2>
      <p>
        The core BPE mechanism (declare, verify, price, route, buffer) is
        domain-agnostic. Anywhere there&apos;s a capacity-constrained service
        and a continuous payment flow, backpressure routing can improve
        allocation. Backproto extends BPE to five domains:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    subgraph "Core BPE"
        CORE["Capacity Registry<br/>Stake Manager<br/>Backpressure Pool<br/>Pricing Curve<br/>Completion Tracker<br/>Escrow Buffer<br/>Pipeline<br/>Aggregator"]
    end

    AI["🤖 AI Agents<br/>8 contracts"] --> CORE
    NOSTR["📡 Nostr Relays<br/>2 contracts"] --> CORE
    LN["⚡ Lightning<br/>3 contracts"] --> CORE
    DEM["💸 Demurrage<br/>2 contracts"] --> CORE
    OC["🐾 OpenClaw<br/>3 contracts"] --> CORE

    CORE --> PLAT["🌐 Platform Layer<br/>2 contracts<br/>Universal Adapter + Reputation"]

    style CORE fill:#339af0,color:#fff
    style AI fill:#51cf66,color:#fff
    style NOSTR fill:#845ef7,color:#fff
    style LN fill:#ffd43b,color:#000
    style DEM fill:#f76707,color:#fff
    style OC fill:#ff6b6b,color:#fff
    style PLAT fill:#e9ecef`}
        />
      </div>

      <hr />

      <h3>📡 Nostr Relays: Making Relay Operation Sustainable</h3>
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

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    subgraph "Relay Operators"
        R1["Relay A<br/>📡 High capacity"]
        R2["Relay B<br/>📡 Medium capacity"]
        R3["Relay C<br/>📡 Low capacity"]
    end

    R1 -->|capacity attestations| REG["Relay Capacity<br/>Registry"]
    R2 -->|capacity attestations| REG
    R3 -->|capacity attestations| REG

    REG --> POOL["Relay Payment Pool<br/>(Superfluid GDA)"]

    POOL -->|"60% of revenue"| R1
    POOL -->|"30% of revenue"| R2
    POOL -->|"10% of revenue"| R3

    USERS["Nostr Users<br/>💰 Subscription streams"] --> POOL

    style REG fill:#845ef7,color:#fff
    style POOL fill:#51cf66,color:#fff`}
        />
      </div>

      <p>
        The result: relay operators who invest in real capacity earn
        proportionally more. Operators who overcommit get less (and get slashed).
        Users get a reliable discovery mechanism for quality relays. We&apos;ve
        drafted <strong>NIP-XX</strong>, a Nostr Improvement Proposal to
        standardize this.
      </p>

      <hr />

      <h3>⚡ Lightning Network: Better Routing Through Capacity Signals</h3>
      <p>
        The <a href="https://lightning.network/">Lightning Network</a> enables
        instant Bitcoin payments through a network of payment channels. But
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
        smoothed using EWMA so a single bad report doesn&apos;t swing the data.
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

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    subgraph "Lightning Nodes"
        N1["Node A<br/>⚡ 5 BTC capacity"]
        N2["Node B<br/>⚡ 2 BTC capacity"]
        N3["Node C<br/>⚡ 0.5 BTC capacity"]
    end

    N1 -->|signed attestation| ORACLE["Lightning Capacity<br/>Oracle (EWMA)"]
    N2 -->|signed attestation| ORACLE
    N3 -->|signed attestation| ORACLE

    ORACLE --> RPOOL["Lightning Routing<br/>Pool"]

    RPOOL -->|"Most incentives"| N1
    RPOOL -->|"Some incentives"| N2
    RPOOL -->|"Fewer incentives"| N3

    ROUTER["Cross-Protocol<br/>Router"] --> LN["⚡ Lightning"]
    ROUTER --> SF["🌊 Superfluid"]
    ROUTER --> OC["⛓️ On-chain"]

    style ORACLE fill:#ffd43b,color:#000
    style RPOOL fill:#51cf66,color:#fff
    style ROUTER fill:#339af0,color:#fff`}
        />
      </div>

      <p>
        This runs on Base (L2) as a <strong>sidecar</strong> to Lightning. It
        doesn&apos;t change how Lightning works. It provides an external capacity
        signaling and incentive layer that pathfinding algorithms and node
        operators can use to make better decisions.
      </p>

      <hr />

      <h3>💸 Demurrage: Tokens That Lose Value Over Time</h3>
      <p>
        Most tokens just sit in wallets. In an agent economy, that&apos;s a
        problem: idle money means idle capacity.{" "}
        <strong>Demurrage</strong> is an old economic idea (proposed by Silvio
        Gesell in 1916) that puts a holding cost on currency, effectively
        encouraging people to spend it rather than hoard it.
      </p>
      <p>
        Backproto implements this as the <strong>DemurrageToken</strong>, a token
        whose balance continuously decays if you hold it without using it:
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    subgraph "Standard Token"
        A1["Day 1: 1000 tokens"] --> A2["Day 30: 1000 tokens"]
        A2 --> A3["Day 365: 1000 tokens"]
    end

    subgraph "Demurrage Token (5% annual decay)"
        B1["Day 1: 1000 tokens"] --> B2["Day 30: ~996 tokens"]
        B2 --> B3["Day 365: ~951 tokens"]
    end

    style A3 fill:#e9ecef
    style B3 fill:#ffd43b,color:#000`}
        />
      </div>

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

      <h3>🌐 Platform Layer: Plugging It All Together</h3>
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
          An AI agent operator who reliably runs a Lightning node too gets credit
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

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph TB
    AI["🤖 AI Agent<br/>Reputation: 85"] --> LEDGER
    RELAY["📡 Relay Operator<br/>Reputation: 92"] --> LEDGER
    LN["⚡ Lightning Node<br/>Reputation: 78"] --> LEDGER

    LEDGER["Reputation Ledger<br/>Cross-domain scoring"] --> SCORE["Combined Score<br/>Weighted average<br/>3× penalty for negatives"]

    SCORE --> DISCOUNT["Stake Discount<br/>Up to 50% off<br/>required deposit"]

    style LEDGER fill:#339af0,color:#fff
    style SCORE fill:#845ef7,color:#fff
    style DISCOUNT fill:#51cf66,color:#fff`}
        />
      </div>

      <p>
        The platform layer is what turns Backproto from &quot;a routing protocol
        for AI agents&quot; into &quot;a universal capacity coordination layer
        for decentralized networks.&quot;
      </p>

      <hr />

      <h3>🐾 OpenClaw Agents: Coordinating Skill Networks at Scale</h3>
      <p>
        <a href="https://openclaw.com/">OpenClaw</a> is the largest
        open-source AI agent framework (315k+ GitHub stars) with ClawHub, a
        marketplace of 700+ installable agent skills. As OpenClaw deployments
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

      <div className={styles.diagram}>
        <Mermaid
          chart={`sequenceDiagram
    participant Requester
    participant Agent as OpenClaw Agent
    participant Adapter as CapacityAdapter
    participant Verifier as CompletionVerifier
    participant Rep as ReputationBridge

    Agent->>Adapter: registerAgent(skillType, stake)
    Requester->>Agent: Assign task via ClawHub
    Agent->>Agent: Execute skill
    Agent->>Adapter: updateCapacity(throughput, latency, errorRate)
    Adapter->>Adapter: EWMA smooth, normalize score
    Agent->>Verifier: verifyExecution(agentSig, requesterSig)
    Verifier->>Verifier: Record completion on-chain
    Verifier->>Rep: reportCompletion(agent)
    Rep->>Rep: Update cross-domain reputation`}
        />
      </div>

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

      <h2>How This Helps Bitcoin</h2>
      <p>
        If you&apos;re in the Bitcoin ecosystem, the Lightning section above is
        where Backproto directly contributes. Here&apos;s the full picture.
      </p>

      <h3>The problem: Lightning routing is unreliable</h3>
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

      <h3>What Backproto adds</h3>
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

      <h3>The sidecar model</h3>
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

      <h3>Why this matters for Bitcoin adoption</h3>
      <p>
        Better routing means fewer failed payments. Fewer failed payments means
        a better user experience. A better user experience means more people and
        businesses adopt Lightning for everyday payments.
      </p>

      <div className={styles.diagram}>
        <Mermaid
          chart={`graph LR
    A["Real-time<br/>capacity signals"] --> B["Smarter<br/>routing"]
    B --> C["Fewer failed<br/>payments"]
    C --> D["Better<br/>Lightning UX"]
    D --> E["More Bitcoin<br/>adoption"]

    style A fill:#ffd43b,color:#000
    style B fill:#ffd43b,color:#000
    style C fill:#51cf66,color:#fff
    style D fill:#51cf66,color:#fff
    style E fill:#f76707,color:#fff`}
        />
      </div>

      <p>
        The economic incentive layer also addresses a structural problem:
        Lightning routing is somewhat of a public good (routers earn small fees
        relative to the capital they lock up). By providing streaming revenue
        proportional to verified capacity, Backproto makes routing more
        financially sustainable, which should attract more liquidity into the
        network.
      </p>

      <hr />

      <h2>Glossary</h2>

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
            <td><strong>ERC-20</strong></td>
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
            <td><strong>EIP-712</strong></td>
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

      <h2>Want to Go Deeper?</h2>

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
  );
}
