"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

interface ProviderStatus {
  provider: string;
  available: boolean;
  buckets: Record<string, { requests: number; failures: number; avgLatencyMs: number }>;
}

interface StatusData {
  status: string;
  timestamp: string;
  providers: ProviderStatus[];
}

const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.pura.xyz";

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setLastUpdate(new Date().toLocaleTimeString());
        } else {
          setError(`Gateway returned ${res.status}`);
        }
      } catch {
        setError("Could not reach gateway");
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Provider status</h1>
        <p className={styles.subtitle}>
          Real-time availability and latency for each LLM provider routed through the Pura gateway.
          Data comes from actual routed requests, updated every 15 seconds.
        </p>
      </header>

      <hr className={styles.divider} />

      {error && (
        <section className={styles.section}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--red)", padding: "0.6rem", border: "1px solid var(--red)", borderRadius: "var(--radius)" }}>
            {error}
          </div>
        </section>
      )}

      {data && (
        <>
          <section className={styles.section}>
            <div className={styles.statsBar}>
              <span style={{ color: data.status === "operational" ? "var(--green)" : "var(--amber)" }}>
                {data.status === "operational" ? "● operational" : "● degraded"}
              </span>
              <span className={styles.statsBarSep}>│</span>
              <span>{data.providers.length} providers</span>
              <span className={styles.statsBarSep}>│</span>
              <span>last update: {lastUpdate}</span>
            </div>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>provider</th>
                  <th>status</th>
                  <th>1m reqs</th>
                  <th>1m avg latency</th>
                  <th>1h reqs</th>
                  <th>1h avg latency</th>
                  <th>24h reqs</th>
                </tr>
              </thead>
              <tbody>
                {data.providers.map((p) => {
                  const b1m = p.buckets["1m"];
                  const b1h = p.buckets["1h"];
                  const b24h = p.buckets["24h"];
                  return (
                    <tr key={p.provider}>
                      <td>{p.provider}</td>
                      <td style={{ color: p.available ? "var(--green)" : "var(--red)" }}>
                        {p.available ? "up" : "down"}
                      </td>
                      <td>{b1m?.requests ?? 0}</td>
                      <td>{b1m?.avgLatencyMs ? `${Math.round(b1m.avgLatencyMs)}ms` : "—"}</td>
                      <td>{b1h?.requests ?? 0}</td>
                      <td>{b1h?.avgLatencyMs ? `${Math.round(b1h.avgLatencyMs)}ms` : "—"}</td>
                      <td>{b24h?.requests ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      {!data && !error && (
        <section className={styles.section}>
          <p className={styles.wait}>connecting to gateway...</p>
        </section>
      )}
    </main>
  );
}
