"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../monitor.module.css";

const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.pura.xyz";

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/economy", label: "economy" },
  { href: "/monitor/providers", label: "providers" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

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

export default function MonitorProvidersPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        if (res.ok) {
          setData(await res.json());
          setLastUpdate(new Date().toLocaleTimeString());
        } else {
          setError(`Gateway returned ${res.status}`);
        }
      } catch {
        setError("Could not reach gateway");
      }
    }
    poll();
    const iv = setInterval(poll, 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── MONITOR</span>
        <hr className={s.rule} />
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={t.href === "/monitor/providers" ? s.tabActive : s.tab}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && (
        <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{error}</p>
      )}

      {data && (
        <>
          <div className={s.statsRow}>
            <div className={s.stat}>
              <div className={s.statLabel}>system</div>
              <div className={s.statValue} style={{ color: data.status === "operational" ? "var(--green)" : "var(--amber)" }}>
                {data.status === "operational" ? "operational" : "degraded"}
              </div>
            </div>
            <div className={s.stat}>
              <div className={s.statLabel}>providers</div>
              <div className={s.statValue}>{data.providers.length}</div>
            </div>
            <div className={s.stat}>
              <div className={s.statLabel}>last update</div>
              <div className={s.statValue}>{lastUpdate}</div>
            </div>
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}>provider status</div>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>provider</th>
                  <th>status</th>
                  <th>1m reqs</th>
                  <th>1m latency</th>
                  <th>1h reqs</th>
                  <th>1h latency</th>
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
                      <td>{b1m?.avgLatencyMs ? `${Math.round(b1m.avgLatencyMs)}ms` : "\u2014"}</td>
                      <td>{b1h?.requests ?? 0}</td>
                      <td>{b1h?.avgLatencyMs ? `${Math.round(b1h.avgLatencyMs)}ms` : "\u2014"}</td>
                      <td>{b24h?.requests ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && !error && (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>connecting to gateway...</p>
      )}
    </main>
  );
}
