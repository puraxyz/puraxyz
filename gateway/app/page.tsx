"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import styles from "./page.module.css";

interface SinkState {
  name: string;
  configured: boolean;
  address?: string;
  units?: string;
  completionRate?: string;
  completions?: string;
  price?: string;
}

interface GatewayState {
  providers: string[];
  sinks: SinkState[];
  pool: string | null;
  baseFee: string;
  chainId: number;
  keys: { total: number; totalRequests: number; withWallet: number };
}

export default function Home() {
  const [state, setState] = useState<GatewayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyLabel, setKeyLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) setState(await res.json());
    } catch {
      // skip
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 30_000);
    return () => clearInterval(interval);
  }, [fetchState]);

  async function handleGenerateKey(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGeneratedKey("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: keyLabel }),
      });
      const data = await res.json();
      if (data.key) {
        setGeneratedKey(data.key);
        setKeyLabel("");
        fetchState();
      }
    } catch {
      // skip
    } finally {
      setGenerating(false);
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
          <span className={styles.logo}>◆</span> Mandalay
        </h1>
        <a
          href="https://github.com/backproto/backproto/tree/main/gateway"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          GitHub
        </a>
      </header>

      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>
          Capacity-routed <span>LLM gateway</span>
        </h2>
        <p className={styles.heroSub}>
          Multi-provider API that routes requests based on on-chain capacity weights.
          Powered by Backproto on Base.
        </p>
      </section>

      {/* Key generation */}
      <section className={styles.keySection}>
        <form className={styles.keyForm} onSubmit={handleGenerateKey}>
          <input
            type="text"
            className={styles.keyInput}
            placeholder="Label (optional)"
            value={keyLabel}
            onChange={(e) => setKeyLabel(e.target.value)}
            maxLength={64}
          />
          <button
            type="submit"
            className={styles.keyButton}
            disabled={generating}
          >
            {generating ? "…" : "Get API Key"}
          </button>
        </form>
        {generatedKey && (
          <>
            <div className={styles.keyResult}>{generatedKey}</div>
            <p className={styles.keyWarning}>
              ⚠ Copy this key now — it will not be shown again.
            </p>
          </>
        )}
      </section>

      {/* Stats */}
      {state && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Providers</div>
            <div className={styles.statValue}>{state.providers.length}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Total Requests</div>
            <div className={styles.statValue}>{state.keys.totalRequests}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>API Keys</div>
            <div className={styles.statValue}>{state.keys.total}</div>
          </div>
        </div>
      )}

      {/* Provider cards */}
      {state && (
        <div className={styles.providers}>
          {state.sinks.map((sink) => (
            <div key={sink.name} className={styles.providerCard}>
              <div className={styles.providerName}>
                <span
                  className={styles.providerDot}
                  style={{
                    background: sink.configured ? "var(--green)" : "var(--text-dim)",
                  }}
                />
                {sink.name}
              </div>
              {sink.configured && (
                <dl className={styles.providerMeta}>
                  <dt>Units</dt>
                  <dd>{sink.units ?? "—"}</dd>
                  <dt>Completions</dt>
                  <dd>{sink.completions ?? "—"}</dd>
                  <dt>Price</dt>
                  <dd>{sink.price ?? "—"}</dd>
                </dl>
              )}
              {!sink.configured && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  Not configured
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage */}
      <section className={styles.usage}>
        <h3 className={styles.usageTitle}>Quick start</h3>
        <pre>{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "http://localhost:3100"}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`}</pre>
      </section>

      <footer className={styles.footer}>
        <p>
          Mandalay · Capacity-routed on{" "}
          <a href={explorerBase} target="_blank" rel="noopener noreferrer">
            {state?.chainId === 8453 ? "Base" : "Base Sepolia"}
          </a>
          {state?.pool && (
            <>
              {" · "}
              <a
                href={`${explorerBase}/address/${state.pool}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pool ↗
              </a>
            </>
          )}
        </p>
      </footer>
    </main>
  );
}
