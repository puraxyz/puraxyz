import Link from "next/link";
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

const domains = [
  {
    title: "AI Agents",
    description:
      "Capacity-weighted streaming payment routing via Superfluid GDA. Payments flow to agents with verified spare capacity.",
    contracts: "8 contracts: CapacityRegistry, BackpressurePool, StakeManager, EscrowBuffer, Pipeline, PricingCurve, CompletionTracker, OffchainAggregator",
  },
  {
    title: "Demurrage",
    description:
      "Time-decaying Super Tokens that incentivize circulation over hoarding. Epoch-based velocity metrics track turnover.",
    contracts: "2 contracts: DemurrageToken, VelocityMetrics",
  },
  {
    title: "Nostr Relays",
    description:
      "NIP-compliant relay capacity signaling with anti-spam pricing. BPE-weighted payment pools make relay operation sustainable.",
    contracts: "2 contracts: RelayCapacityRegistry, RelayPaymentPool",
  },
  {
    title: "Lightning",
    description:
      "EWMA-smoothed channel capacity oracles and cross-protocol routing across Superfluid, Lightning, and on-chain settlement.",
    contracts: "3 contracts: LightningCapacityOracle, LightningRoutingPool, CrossProtocolRouter",
  },
];

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.badge}>17 contracts &middot; 125 tests passing &middot; Base Sepolia</div>
        <h1 className={styles.title}>
          <span>Backpressure economics</span> for decentralized networks
        </h1>
        <p className={styles.subtitle}>
          When downstream participants reach capacity, payments and messages must
          reroute, buffer, or throttle. Backproto makes receiver-side capacity
          constraints a first-class protocol primitive, across AI agents,
          Nostr relays, Lightning channels, and streaming payments.
        </p>
        <div className={styles.buttons}>
          <Link href="/explainer" className={styles.btnPrimary}>
            How it works
          </Link>
          <a
            href="https://github.com/backproto/backproto"
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

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Four Domains, One Protocol</div>
        <div className={styles.cards}>
          {domains.map(({ title, description, contracts }) => (
            <div key={title} className={styles.card}>
              <div className={styles.cardTitle}>{title}</div>
              <p className={styles.cardText}>{description}</p>
              <p className={styles.cardText} style={{ opacity: 0.6, fontSize: "0.75rem", marginTop: "0.5rem" }}>
                {contracts}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.diagram}>
        <div className={styles.diagramBox}>
          <pre>
            <code>{`                  ┌──────────────────────────────┐
                  │       Platform Layer          │
                  │  UniversalCapacityAdapter      │
                  │  ReputationLedger              │
                  │  CrossProtocolRouter           │
                  └──────┬──────┬──────┬──────────┘
                         │      │      │
         ┌───────────────┤      │      ├──────────────────┐
         ▼               ▼      ▼      ▼                  ▼
  ┌─────────────┐ ┌──────────┐ ┌───────────────┐ ┌────────────────┐
  │  Core BPE   │ │Demurrage │ │ Nostr Relays  │ │   Lightning    │
  │  8 contracts│ │2 contract│ │ 2 contracts   │ │  3 contracts   │
  └─────────────┘ └──────────┘ └───────────────┘ └────────────────┘`}</code>
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
            <div className={styles.cardTitle}>Cross-Domain Reputation</div>
            <p className={styles.cardText}>
              Portable reputation across all domains. Negative signals hurt 3×.
              Good cross-domain reputation earns up to 50% stake discount.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.contracts}>
        <div className={styles.sectionTitle}>
          Core Contracts &middot; Base Sepolia
        </div>
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {coreContracts.map(({ name, addr }) => (
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
