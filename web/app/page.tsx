import Link from "next/link";
import BackpressureFlow from "./components/BackpressureFlow";
import ChainStrip from "./components/ChainStrip";
import DomainPanels from "./components/DomainPanels";
import styles from "./page.module.css";

const coreContracts = [
  { name: "StakeManager", addr: "0xdc26b147030f635a2f8ac466d28a88b3b33ca6b3" },
  { name: "CapacityRegistry", addr: "0x6f58f28c0a270c198c65cff5c5a7ba9d86088948" },
  { name: "BackpressurePool", addr: "0x8e999a246afea241cf3c1d400dd7786cf591fa88" },
  { name: "EscrowBuffer", addr: "0x8d2f5b40315cccf9b7aa10869c035f9c7a0a3160" },
  { name: "Pipeline", addr: "0xbc2c20d75ab5a03f592bcfdb7d8c40fdd3f7afa7" },
  { name: "PricingCurve", addr: "0x11522daf010c08d5d26a2b1369567279a27338e3" },
  { name: "CompletionTracker", addr: "0xff3dab79a53ffd11bae041e094ed0b6217acfc3c" },
  { name: "OffchainAggregator", addr: "0xa70993d6d4cb5e4cf5ee8ddcbfde875e55a937fa" },
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
    desc: "Deploy a capacity-weighted payment economy in one transaction",
    href: "/docs/getting-started",
    primary: true,
  },
  {
    label: "Nostr relay operator",
    desc: "Earn streaming revenue proportional to declared capacity",
    href: "/docs/getting-started-relay",
  },
  {
    label: "Lightning node runner",
    desc: "Route payments based on real-time channel liquidity",
    href: "/docs/getting-started-lightning",
  },
  {
    label: "DeFi protocol builder",
    desc: "Time-decaying tokens, quality scoring, nested economies",
    href: "/docs/getting-started-defi",
  },
  {
    label: "Platform integrator",
    desc: "Plug any capacity signal into BPE with cross-domain reputation",
    href: "/docs/getting-started-platform",
  },
];

const stats = [
  { value: "95.7%", label: "Allocation efficiency" },
  { value: "83.5%", label: "Gas reduction" },
  { value: "3×", label: "Penalty for bad actors" },
  { value: "22", label: "Deployed contracts" },
];

export default function Home() {
  return (
    <>
      {/* ─── 1. Hero ───────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroCanvas}>
          <BackpressureFlow />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Capacity-aware routing for decentralized networks
          </h1>
          <p className={styles.subtitle}>
            When nodes hit capacity, payments reroute. Backproto makes
            backpressure a protocol primitive.
          </p>
          <div className={styles.buttons}>
            <Link href="/explainer" className={styles.btnPrimary}>
              How it works &rarr;
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
        </div>
      </section>

      {/* ─── 2. Chain strip ────────────────────────────────── */}
      <ChainStrip />

      {/* ─── 3. The Problem ────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.problemGrid}>
          <div className={styles.problemStatement}>
            <h2 className={styles.problemTitle}>
              Networks break when the best nodes get all the traffic
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
              Lightning channels fail at peak routing&mdash;40% failure rates
            </div>
            <div className={styles.painPoint}>
              <span className={styles.painDot} />
              Nostr relays have no way to signal congestion or earn fairly
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
        <div className={styles.label}>Four domains, one protocol</div>
        <DomainPanels />
      </section>

      {/* ─── 8. Results ────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.label}>Key results</div>
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

      {/* ─── 10. Bottom CTA ────────────────────────────────── */}
      <section className={styles.bottomCta}>
        <h2 className={styles.ctaTitle}>Start building</h2>
        <p className={styles.ctaSub}>
          Deploy an economy in one transaction, or self-deploy with full control.
        </p>
        <div className={styles.buttons}>
          <Link href="/docs/getting-started" className={styles.btnPrimary}>
            Deploy an economy &rarr;
          </Link>
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
