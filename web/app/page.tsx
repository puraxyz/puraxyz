import Link from "next/link";
import PlaygroundHero from "./components/PlaygroundHero";
import ChainStrip from "./components/ChainStrip";
import DomainPanels from "./components/DomainPanels";
import styles from "./page.module.css";

const coreContracts = [
  { name: "StakeManager", addr: "0x4936822CB9e316ee951Af2204916878acCDD564E" },
  { name: "CapacityRegistry", addr: "0x4ED9386110051eC66b96e5d2e627048D57df5B64" },
  { name: "BackpressurePool", addr: "0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a" },
  { name: "EscrowBuffer", addr: "0x31288aB9b12298Ff0C022ffD9F90797bB238d90a" },
  { name: "Pipeline", addr: "0x1eebaB27BD472b5956D8335CDB69b940F079e6dE" },
  { name: "PricingCurve", addr: "0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866" },
  { name: "CompletionTracker", addr: "0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4" },
  { name: "OffchainAggregator", addr: "0x98c621051b5909f41d3d9A32b3b7DbB02615a179" },
];

const comparisonRows = [
  {
    feature: "Capacity awareness",
    statusQuo: "None",
    roundRobin: "None",
    loadBalancer: "Server-side only",
    bpe: "On-chain, signed",
  },
  {
    feature: "Economic incentives",
    statusQuo: "✗",
    roundRobin: "✗",
    loadBalancer: "✗",
    bpe: "Streaming payments",
  },
  {
    feature: "Throughput efficiency",
    statusQuo: "~70%",
    roundRobin: "93.5%",
    loadBalancer: "~90%",
    bpe: "95.7%",
  },
  {
    feature: "Cross-domain reputation",
    statusQuo: "✗",
    roundRobin: "✗",
    loadBalancer: "✗",
    bpe: "Portable, weighted",
  },
  {
    feature: "Gas cost / overhead",
    statusQuo: "N/A",
    roundRobin: "N/A",
    loadBalancer: "Centralized",
    bpe: "83.5% reduction via EIP-712",
  },
  {
    feature: "Fairness guarantee",
    statusQuo: "None",
    roundRobin: "Equal share",
    loadBalancer: "Weight-based",
    bpe: "Lyapunov-optimal",
  },
];

const personas = [
  {
    label: "AI agent developer",
    desc: "Deploy a capacity-weighted payment economy in one transaction. Agents register, stake, and start earning.",
    href: "/docs/getting-started",
    primary: true,
  },
  {
    label: "Framework integrator",
    desc: "Add backpressure routing to LangChain, CrewAI, or AutoGen agent pipelines via the TypeScript SDK.",
    href: "/docs/sdk",
  },
  {
    label: "Protocol researcher",
    desc: "Formal proofs, simulation code, and research modules extending to Lightning, Nostr, and demurrage tokens.",
    href: "/paper",
  },
];

const stats = [
  { value: "95.7%", label: "Allocation efficiency" },
  { value: "83.5%", label: "Gas reduction" },
  { value: "3×", label: "Penalty for bad actors" },
  { value: "25", label: "Deployed contracts" },
];

export default function Home() {
  return (
    <>
      {/* ─── 1. Hero ───────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroCanvas}>
          <PlaygroundHero />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Payment routing for AI agent economies
          </h1>
          <p className={styles.subtitle}>
            Agents declare capacity. Payments stream to whoever has room.
            Boltzmann routing distributes work by temperature-weighted
            probability. Overflow goes to escrow. Collateral stays in
            thermodynamic equilibrium through virial monitoring.
          </p>
          <div className={styles.buttons}>
            <Link href="/explainer" className={styles.btnPrimary}>
              How it works &rarr;
            </Link>
            <a
              href="https://pura.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Live reference &rarr;
            </a>
            <a
              href="https://github.com/backproto/backproto"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ─── 2. Chain strip ────────────────────────────────── */}
      <ChainStrip />

      {/* ─── 3. The Problem ────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.problemGrid}>
          <div className={styles.problemStatement}>
            <h2 className={styles.problemTitle}>
              AI agents break when the best ones get all the traffic
            </h2>
            <p className={styles.problemSub}>
              Capacity is invisible. The most capable agents overload while
              mediocre ones sit idle. There is no price signal, no rerouting,
              no backpressure.
            </p>
          </div>
          <div className={styles.painPoints}>
            <div className={styles.painPoint}>
              <span className={styles.painDot} />
              AI agents drop requests silently when overwhelmed
            </div>
            <div className={styles.painPoint}>
              <span className={styles.painDot} />
              Streaming payments have no congestion control&mdash;money keeps flowing to saturated providers
            </div>
            <div className={styles.painPoint}>
              <span className={styles.painDot} />
              No price signal tells callers which agents have spare capacity
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. The Solution ───────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.solution}>
          <h2 className={styles.solutionTitle}>
            Backproto makes <span className={styles.underline}>capacity</span> a
            first-class protocol primitive
          </h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <div>
                <strong>Declare</strong>
                <span className={styles.stepDesc}>
                  Agents sign capacity attestations
                </span>
              </div>
            </div>
            <span className={styles.stepArrow}>&rarr;</span>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div>
                <strong>Price</strong>
                <span className={styles.stepDesc}>
                  Dynamic fees from utilization curves
                </span>
              </div>
            </div>
            <span className={styles.stepArrow}>&rarr;</span>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <strong>Route</strong>
                <span className={styles.stepDesc}>
                  Streaming payments flow to spare capacity
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Who is this for ────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>Who is this for</div>
        <div className={styles.personaGrid}>
          {personas.map(({ label, desc, href, primary }) => (
            <Link
              key={label}
              href={href}
              className={
                primary
                  ? `${styles.personaCard} ${styles.personaPrimary}`
                  : styles.personaCard
              }
            >
              <span className={styles.personaLabel}>{label}</span>
              <span className={styles.personaDesc}>{desc}</span>
              <span className={styles.personaCta}>Get started &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 6. Comparison ─────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>How BPE compares</div>
        <div className={styles.tableWrap}>
          <table className={styles.compTable}>
            <thead>
              <tr>
                <th></th>
                <th>Status quo</th>
                <th>Round-robin</th>
                <th>Load balancer</th>
                <th className={styles.colHighlight}>BPE</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <td className={styles.featureCell}>{row.feature}</td>
                  <td>{row.statusQuo}</td>
                  <td>{row.roundRobin}</td>
                  <td>{row.loadBalancer}</td>
                  <td className={styles.colHighlight}>{row.bpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── 7. Domain panels ──────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>AI agents + research modules</div>
        <DomainPanels />
      </section>

      {/* ─── 8. Results ────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>Results</div>
        <div className={styles.statBar}>
          {stats.map(({ value, label }, i) => (
            <div key={label} className={styles.stat}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
              {i < stats.length - 1 && <span className={styles.statDivider} />}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 9. Contracts ──────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>Core contracts &middot; Base Sepolia</div>
        <div className={styles.terminal}>
          <div className={styles.termBar}>
            <span className={styles.termDot} style={{ background: "#ef4444" }} />
            <span className={styles.termDot} style={{ background: "#eab308" }} />
            <span className={styles.termDot} style={{ background: "#22c55e" }} />
          </div>
          <div className={styles.termBody}>
            <div className={styles.termPrompt}>$ forge deploy --verify</div>
            <table className={styles.termTable}>
              <tbody>
                {coreContracts.map(({ name, addr }) => (
                  <tr key={addr}>
                    <td>
                      <a
                        href={`https://github.com/backproto/backproto/blob/main/contracts/src/${name}.sol`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {name}
                      </a>
                    </td>
                    <td>
                      <a
                        href={`https://sepolia.basescan.org/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {addr}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 10. Reference products ──────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>Reference products</div>
        <div className={styles.refGrid}>
          <div className={styles.refCard}>
            <span className={styles.refName}>pura.xyz</span>
            <span className={styles.refDesc}>
              Consolidated operator dashboard: LLM gateway, Nostr relay capacity,
              Lightning routing, agent reputation, simulator, and one-click deploy.
              All reading live on-chain state from Base Sepolia.
            </span>
            <div className={styles.refLinks}>
              <a href="https://pura.xyz" target="_blank" rel="noopener noreferrer" className={styles.refLink}>
                pura.xyz &rarr;
              </a>
              <a href="https://github.com/backproto/backproto/tree/main/pura" target="_blank" rel="noopener noreferrer" className={styles.refLink}>
                GitHub &rarr;
              </a>
            </div>
          </div>
          <div className={styles.refCard}>
            <span className={styles.refName}>bit.recipes</span>
            <span className={styles.refDesc}>
              Visual pipeline builder and recipe cookbook for Backproto.
              Drag-and-drop task composition, live cost estimates, and
              one-click deployment to on-chain economies.
            </span>
            <div className={styles.refLinks}>
              <a href="https://bit.recipes" target="_blank" rel="noopener noreferrer" className={styles.refLink}>
                bit.recipes &rarr;
              </a>
              <a href="https://github.com/backproto/backproto/tree/main/bitrecipes" target="_blank" rel="noopener noreferrer" className={styles.refLink}>
                GitHub &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 11. Bottom CTA ────────────────────────────────── */}
      <section className={styles.bottomCta}>
        <h2 className={styles.ctaTitle}>Start building</h2>
        <p className={styles.ctaSub}>
          Deploy an economy in one transaction, or self-deploy with full control.
        </p>
        <div className={styles.buttons}>
          <Link href="/docs/getting-started" className={styles.btnPrimary}>
            Deploy an economy &rarr;
          </Link>
          <a
            href="https://pura.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            Live reference
          </a>
          <Link href="/docs" className={styles.btnSecondary}>
            All docs
          </Link>
          <Link href="/paper" className={styles.btnSecondary}>
            Paper
          </Link>
          <a
            href="https://github.com/backproto/backproto"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            GitHub
          </a>
        </div>
      </section>
    </>
  );
}
