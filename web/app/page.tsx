import Link from "next/link";
import styles from "./page.module.css";

const contracts = [
  { name: "StakeManager", addr: "0xdc26b147030f635a2f8ac466d28a88b3b33ca6b3" },
  { name: "CapacityRegistry", addr: "0x6f58f28c0a270c198c65cff5c5a7ba9d86088948" },
  { name: "BackpressurePool", addr: "0x8e999a246afea241cf3c1d400dd7786cf591fa88" },
  { name: "EscrowBuffer", addr: "0x8d2f5b40315cccf9b7aa10869c035f9c7a0a3160" },
  { name: "Pipeline", addr: "0xbc2c20d75ab5a03f592bcfdb7d8c40fdd3f7afa7" },
  { name: "PricingCurve", addr: "0x11522daf010c08d5d26a2b1369567279a27338e3" },
  { name: "CompletionTracker", addr: "0xff3dab79a53ffd11bae041e094ed0b6217acfc3c" },
  { name: "OffchainAggregator", addr: "0xa70993d6d4cb5e4cf5ee8ddcbfde875e55a937fa" },
];

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.badge}>Live on Base Sepolia</div>
        <h1 className={styles.title}>
          <span>Backpressure economics</span> for agent payments
        </h1>
        <p className={styles.subtitle}>
          When AI agents pay each other via streaming payments, there is no flow
          control. Spilt adapts backpressure routing from network theory so
          payments automatically flow to agents with spare capacity.
        </p>
        <div className={styles.buttons}>
          <Link href="/explainer" className={styles.btnPrimary}>
            How it works
          </Link>
          <a
            href="https://github.com/spiltdev/spilt"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            View on GitHub
          </a>
          <Link href="/paper" className={styles.btnSecondary}>
            Read the paper
          </Link>
        </div>
      </section>

      <div className={styles.diagram}>
        <div className={styles.diagramBox}>
          <pre>
            <code>{`CapacityRegistry <─── StakeManager
  (EWMA, commit-reveal)     (stake, sqrt cap)
        │
        ▼
  BackpressurePool ──→ Superfluid GDA Pool
  (rebalance)            (streaming distribution)
        │
        ├──→ EscrowBuffer     (overflow hold)
        └──→ Pipeline          (multi-stage chains)

  PricingCurve          (EIP-1559-style dynamic fees)
  CompletionTracker     (statistical capacity verification)
  OffchainAggregator    (batched EIP-712 attestations)`}</code>
          </pre>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Key Results</div>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Throughput Optimal</div>
            <p className={styles.cardText}>
              Proof via Lyapunov drift analysis that every stabilisable demand
              vector is served with bounded overflow buffers.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span className={styles.metric}>95.7%</span> Efficiency
            </div>
            <p className={styles.cardText}>
              Allocation efficiency vs 93.5% for round-robin under steady load
              across 1,000-step simulation horizons.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span className={styles.metric}>83.5%</span> Gas Reduction
            </div>
            <p className={styles.cardText}>
              Off-chain attestation aggregation via batched EIP-712 signatures
              cuts on-chain costs dramatically.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Sybil Resistant</div>
            <p className={styles.cardText}>
              Concave capacity cap: splitting stake across identities is always
              unprofitable. Truthful reporting is a Bayesian-Nash equilibrium.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.contracts}>
        <div className={styles.sectionTitle}>
          Deployed Contracts &middot; Base Sepolia
        </div>
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(({ name, addr }) => (
              <tr key={addr}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <a
                    href={`https://sepolia.basescan.org/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <code>{addr}</code>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
