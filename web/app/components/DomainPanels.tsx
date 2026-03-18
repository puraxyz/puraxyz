"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./DomainPanels.module.css";

const domains = [
  {
    id: "ai",
    title: "AI Agents",
    color: "#0d9488",
    description:
      "Capacity-weighted streaming payment routing via Superfluid GDA. Payments flow proportionally to agents with verified spare capacity. Overloaded agents automatically receive less.",
    contracts: [
      "CapacityRegistry",
      "BackpressurePool",
      "StakeManager",
      "EscrowBuffer",
      "Pipeline",
      "PricingCurve",
      "CompletionTracker",
      "OffchainAggregator",
    ],
    docsHref: "/docs/contracts",
  },
  {
    id: "demurrage",
    title: "Demurrage",
    color: "#d97706",
    description:
      "Time-decaying Super Tokens that incentivize circulation over hoarding. Epoch-based velocity metrics enforce turnover. Idle balances shrink, active participants thrive.",
    contracts: ["DemurrageToken", "VelocityMetrics"],
    docsHref: "/docs/contracts",
  },
  {
    id: "lightning",
    title: "Lightning",
    color: "#a16207",
    description:
      "EWMA-smoothed channel capacity oracles bridge Lightning routing data on-chain. Cross-protocol routing coordinates Superfluid streams, Lightning channels, and on-chain settlement in a single payment path.",
    contracts: [
      "LightningCapacityOracle",
      "LightningRoutingPool",
      "CrossProtocolRouter",
    ],
    docsHref: "/docs/contracts",
  },
  {
    id: "nostr",
    title: "Nostr Relays",
    color: "#6366f1",
    description:
      "NIP-compliant relay capacity signaling with anti-spam pricing. BPE-weighted payment pools make relay operation sustainable. Relays earn in proportion to the capacity they actually provide.",
    contracts: ["RelayCapacityRegistry", "RelayPaymentPool"],
    docsHref: "/docs/contracts",
  },
];

export default function DomainPanels() {
  const [active, setActive] = useState(0);
  const d = domains[active];

  return (
    <div className={styles.panels}>
      <nav className={styles.tabs}>
        {domains.map((dom, i) => (
          <>
            {i === 1 && (
              <span key="divider" className={styles.tabDivider}>
                Research modules
              </span>
            )}
            <button
              key={dom.id}
              className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
              style={
                i === active
                  ? { borderLeftColor: dom.color, color: "#fff" }
                  : undefined
              }
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
            >
              <span
                className={styles.tabDot}
                style={{ background: dom.color, opacity: i === active ? 1 : 0.3 }}
              />
              {dom.title}
            </button>
          </>
        ))}
      </nav>
      <div className={styles.detail} key={d.id}>
        <h3 className={styles.detailTitle} style={{ color: d.color }}>
          {d.title}
        </h3>
        <p className={styles.detailDesc}>{d.description}</p>
        <div className={styles.contractList}>
          {d.contracts.map((c) => (
            <code key={c} className={styles.contractName}>
              {c}
            </code>
          ))}
        </div>
        <Link href={d.docsHref} className={styles.docsLink}>
          Read docs &rarr;
        </Link>
      </div>
    </div>
  );
}
