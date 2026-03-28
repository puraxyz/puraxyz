"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { generateSeedState } from "@/lib/seed";

interface RelayInfo {
  pubkey: string;
  operator: string;
  capacity: string;
  registered: boolean;
}

interface RelayState {
  relays: RelayInfo[];
  antiSpamMinimums: { write: string; read: string; store: string };
  totalRelays: number;
  chainId: number;
  seed?: boolean;
}

export default function Home() {
  const [state, setState] = useState<RelayState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        if (data.relays && data.relays.length > 0) {
          setState(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // skip
    }
    setState((prev) => prev?.seed ? prev : generateSeedState());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 30_000);
    return () => clearInterval(interval);
  }, [fetchState]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading…</span>
      </div>
    );
  }

  const explorerBase =
    state?.chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◈</span> Relay.Gold
        </h1>
        <nav className={styles.headerNav}>
          <a
            href="https://pura.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            Pura
          </a>
          <a
            href="https://pura.xyz/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            Docs
          </a>
          <a
            href="https://github.com/puraxyz/puraxyz/tree/main/relay-dash"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            GitHub
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        Nostr relay capacity dashboard · Built on{" "}
        <a href="https://pura.xyz" target="_blank" rel="noopener noreferrer">
          Pura
        </a>
      </p>

      {state?.seed && (
        <div className={styles.seedBanner}>
          ◈ Simulated data · Connect providers for live metrics
        </div>
      )}

      {state && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Relays</div>
            <div className={styles.statValue}>{state.totalRelays}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Write min</div>
            <div className={styles.statValue}>{state.antiSpamMinimums.write}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Read min</div>
            <div className={styles.statValue}>{state.antiSpamMinimums.read}</div>
          </div>
        </div>
      )}

      {state && state.relays.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pubkey</th>
              <th>Operator</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {state.relays.map((r) => (
              <tr key={r.pubkey}>
                <td className={`${styles.mono} ${styles.truncate}`}>
                  {r.pubkey}
                </td>
                <td className={`${styles.mono} ${styles.truncate}`}>
                  {r.operator ? (
                    <a
                      href={`${explorerBase}/address/${r.operator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {r.operator}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{r.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.empty}>
          No relays registered yet. Run <code>npm run setup</code> to seed demo
          data on Base Sepolia.
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Register a relay</h3>
        <pre className={styles.compact}>{`import { relay, getAddresses } from "@puraxyz/sdk";

const addrs = getAddresses(84532);
await relay.registerRelay(walletClient, addrs,
  nostrPubkey,
  { eventsPerSecond: 500n, storageGB: 100n, bandwidthMbps: 200n }
);
await relay.joinRelayPool(walletClient, addrs, 0, nostrPubkey);`}</pre>
      </section>

      <section className={styles.faq}>
        <h3 className={styles.faqTitle}>Common questions</h3>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>What is Relay.Gold?</h4>
          <p className={styles.faqA}>
            A dashboard for Nostr relay operators who register their spare
            capacity on-chain. The Pura protocol reads that capacity,
            weights it with an exponential moving average, and distributes
            payment streams proportionally. Relay operators earn based on
            verified spare capacity rather than flat fees.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>How does anti-spam pricing work?</h4>
          <p className={styles.faqA}>
            Each pool type (write, read, store) has a minimum payment floor.
            Clients opening a Superfluid stream to the relay pool must meet
            this minimum. The floor is set by relay operators through
            governance, and it prevents zero-cost spam without blocking
            legitimate low-volume users.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>What are the three pool types?</h4>
          <p className={styles.faqA}>
            RELAY_WRITE (0) covers event submission. RELAY_READ (1) covers
            subscription and query traffic. RELAY_STORE (2) covers long-term
            storage. A relay can join one or more pools depending on what
            services it provides.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>Can I run this myself?</h4>
          <p className={styles.faqA}>
            Yes. Fork the repo, deploy your own relay-dash, and point it at
            your own relay fleet. See the{" "}
            <a
              href="https://github.com/puraxyz/puraxyz/tree/main/relay-dash"
              target="_blank"
              rel="noopener noreferrer"
            >
              README
            </a>{" "}
            for setup instructions.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Relay.Gold · Powered by{" "}
          <a href="https://pura.xyz" target="_blank" rel="noopener noreferrer">
            Pura
          </a>
          {" · "}
          <a href={explorerBase} target="_blank" rel="noopener noreferrer">
            {state?.chainId === 8453 ? "Base" : "Base Sepolia"}
          </a>
          {" · "}
          <a
            href="https://pura.xyz/paper"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paper
          </a>
        </p>
      </footer>
    </main>
  );
}
