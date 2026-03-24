"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import styles from "./page.module.css";
import { generateSeedState } from "@/lib/seed";

interface NodeInfo {
  pubkey: string;
  capacity: string;
  fee: string;
  active: boolean;
}

interface RouteResult {
  nodes: string[];
  allocations: string[];
  fees: string[];
}

interface LightningState {
  nodes: NodeInfo[];
  totalNodes: number;
  chainId: number;
  seed?: boolean;
}

export default function Home() {
  const [state, setState] = useState<LightningState | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("100000");
  const [maxNodes, setMaxNodes] = useState("5");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
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

  async function handleFindRoute(e: FormEvent) {
    e.preventDefault();
    setRouting(true);
    setRoute(null);
    try {
      const params = new URLSearchParams({ amount, maxNodes });
      const res = await fetch(`/api/route?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRoute(data.route);
      }
    } catch {
      // skip
    } finally {
      setRouting(false);
    }
  }

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
          <span className={styles.logo}>⚡</span> Lightning.Gold
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
            href="https://pura.xyz/explainer"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            Docs
          </a>
          <a
            href="https://github.com/puraxyz/puraxyz/tree/main/lightning-dash"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            GitHub
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        Lightning routing dashboard · Built on{" "}
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
            <div className={styles.statLabel}>Nodes</div>
            <div className={styles.statValue}>{state.totalNodes}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Total capacity</div>
            <div className={styles.statValue}>
              {state.nodes
                .reduce((s, n) => s + BigInt(n.capacity), 0n)
                .toLocaleString()}{" "}
              sat
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg fee</div>
            <div className={styles.statValue}>
              {state.nodes.length > 0
                ? (
                    Number(
                      state.nodes.reduce((s, n) => s + BigInt(n.fee), 0n),
                    ) / state.nodes.length
                  ).toFixed(0)
                : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Route explorer */}
      <section className={styles.routeForm}>
        <h3 className={styles.sectionTitle}>Route explorer</h3>
        <form onSubmit={handleFindRoute}>
          <div className={styles.routeInputs}>
            <input
              type="number"
              className={styles.input}
              placeholder="Amount (sats)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
            <input
              type="number"
              className={styles.input}
              placeholder="Max nodes"
              value={maxNodes}
              onChange={(e) => setMaxNodes(e.target.value)}
              min="1"
              max="20"
            />
            <button
              type="submit"
              className={styles.button}
              disabled={routing}
            >
              {routing ? "…" : "Find route"}
            </button>
          </div>
        </form>
        {route && (
          <div className={styles.routeResult}>
            {route.nodes.length > 0
              ? route.nodes
                  .map(
                    (n, i) =>
                      `${n.slice(0, 10)}… → ${route.allocations[i]} sat (fee: ${route.fees[i]})`,
                  )
                  .join("\n")
              : "No route found. Register nodes first."}
          </div>
        )}
      </section>

      {state && state.nodes.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Node</th>
              <th>Capacity (sat)</th>
              <th>Fee</th>
            </tr>
          </thead>
          <tbody>
            {state.nodes.map((n) => (
              <tr key={n.pubkey}>
                <td className={`${styles.mono} ${styles.truncate}`}>
                  {n.pubkey}
                </td>
                <td>{BigInt(n.capacity).toLocaleString()}</td>
                <td>{n.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.empty}>
          No Lightning nodes registered yet. Run <code>npm run setup</code> to
          seed demo data on Base Sepolia.
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Register a node</h3>
        <pre className={styles.compact}>{`import { lightning, getAddresses } from "@puraxyz/sdk";

const addrs = getAddresses(84532);
await lightning.registerNode(walletClient, addrs, nodePubkey, 5_000_000n);
await lightning.joinRoutingPool(walletClient, addrs, nodePubkey);`}</pre>
      </section>

      <section className={styles.faq}>
        <h3 className={styles.faqTitle}>Common questions</h3>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>What is Lightning.Gold?</h4>
          <p className={styles.faqA}>
            A dashboard for Lightning node operators who publish their channel
            capacity on-chain. Pura reads that capacity, applies
            exponential smoothing to filter stale data, and computes optimal
            multi-hop routes weighted by real liquidity rather than gossip.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>How does route finding work?</h4>
          <p className={styles.faqA}>
            The route explorer calls <code>getOptimalRoute</code> on
            the LightningRoutingPool contract. It returns an ordered set of
            nodes, per-node allocation in sats, and the fee each node charges.
            The algorithm splits the payment across nodes proportional to their
            smoothed capacity.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>Why on-chain capacity signals?</h4>
          <p className={styles.faqA}>
            Lightning gossip is slow and unreliable for probing channel
            balances. On-chain signals let node operators commit to their
            available liquidity with a stake. If the capacity is stale or
            wrong, the operator&apos;s stake is at risk. This gives routers
            stronger guarantees than gossip alone.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>Can I self-host this?</h4>
          <p className={styles.faqA}>
            Yes. Fork the repo and deploy your own instance. See the{" "}
            <a
              href="https://github.com/puraxyz/puraxyz/tree/main/lightning-dash"
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
          Lightning.Gold · Powered by{" "}
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
