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

      <h2>Glossary</h2>
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
            <td>An AI agent that receives payment for doing work</td>
          </tr>
          <tr>
            <td><strong>Source</strong></td>
            <td>An app or agent that pays for work to be done</td>
          </tr>
          <tr>
            <td><strong>Task type</strong></td>
            <td>A category of work (e.g., &quot;text generation&quot;, &quot;image creation&quot;)</td>
          </tr>
          <tr>
            <td><strong>Capacity</strong></td>
            <td>How much work an agent can handle at once</td>
          </tr>
          <tr>
            <td><strong>Stake</strong></td>
            <td>A security deposit agents put down to participate</td>
          </tr>
          <tr>
            <td><strong>Slash</strong></td>
            <td>Penalty - taking part of an agent&apos;s deposit for bad behavior</td>
          </tr>
          <tr>
            <td><strong>EWMA</strong></td>
            <td>A smoothing method that prevents sudden, suspicious capacity changes</td>
          </tr>
          <tr>
            <td><strong>Rebalance</strong></td>
            <td>Updating how payments are split based on current capacity</td>
          </tr>
          <tr>
            <td><strong>Epoch</strong></td>
            <td>A time window (5 minutes) for measuring agent performance</td>
          </tr>
          <tr>
            <td><strong>Stream</strong></td>
            <td>A continuous payment flow (like a salary paid every second)</td>
          </tr>
          <tr>
            <td><strong>GDA</strong></td>
            <td>General Distribution Agreement - Superfluid&apos;s tech for splitting a stream among multiple recipients</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>Want to Go Deeper?</h2>
      <ul className={styles.links}>
        <li>
          <a href="/paper/introduction">Paper - Introduction</a> - the academic
          version, with formal proofs
        </li>
        <li>
          <a href="/paper/protocol">Protocol Design</a> - technical details of
          each smart contract
        </li>
        <li>
          <a href="/docs/contracts">Implementation</a> - the actual Solidity
          code, deployed on Base Sepolia
        </li>
        <li>
          <a href="/docs/sdk">SDK</a> - build with BPE in TypeScript
        </li>
      </ul>
    </div>
  );
}
