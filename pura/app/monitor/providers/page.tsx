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
  configured: boolean;
  available: boolean;
  observedRecently: boolean;
  status: "active" | "idle" | "degraded" | "unconfigured";
  buckets: Array<{
    window: string;
    requests: number;
    failures: number;
    successRate: number;
    avgLatencyMs: number;
  }>;
}

interface StatusData {
  status: string;
  timestamp: string;
  summary: {
    configured: number;
    active: number;
    degraded: number;
    unconfigured: number;
  };
  providers: ProviderStatus[];
}

function bucketFor(
  provider: ProviderStatus,
  window: string,
) {
  return provider.buckets.find((bucket) => bucket.window === window);
}

function statusLabel(status: ProviderStatus["status"]) {
  if (status === "active") return "active";
  if (status === "idle") return "configured / idle";
  if (status === "degraded") return "degraded";
  return "not configured";
}

function statusClass(status: ProviderStatus["status"]) {
  if (status === "active") return s.good;
  if (status === "idle") return s.warn;
  if (status === "degraded") return s.bad;
  return s.dim;
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

      <div className={s.sourceNote}>
        <span className={s.sourceLabel}>data source</span>
        <span className={s.sourceValue}>live gateway API</span>
        <span className={s.sourceCopy}>
          Pulled from api.pura.xyz/api/status every 15 seconds. "Active" means configured and recently observed. "Not configured" means implemented in code, but not live on this gateway.
        </span>
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
              <div className={s.statValue}>{data.summary.configured}</div>
            </div>
            <div className={s.stat}>
              <div className={s.statLabel}>active now</div>
              <div className={s.statValue}>{data.summary.active}</div>
            </div>
            <div className={s.stat}>
              <div className={s.statLabel}>last update</div>
              <div className={s.statValue}>{lastUpdate}</div>
            </div>
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}>provider status</div>
            <p className={s.helper}>
              This page separates provider code support from actual live routing. A provider can exist in Pura and still be inactive on this deployment.
            </p>
            <div className={s.tableWrap}>
              <table className={s.tbl}>
                <thead>
                  <tr>
                    <th>provider</th>
                    <th>status</th>
                    <th>configured</th>
                    <th>5m reqs</th>
                    <th>5m success</th>
                    <th>5m latency</th>
                    <th>24h reqs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.map((p) => {
                    const b5m = bucketFor(p, "5m");
                    const b24h = bucketFor(p, "24h");
                    return (
                      <tr key={p.provider}>
                        <td>{p.provider}</td>
                        <td className={statusClass(p.status)}>{statusLabel(p.status)}</td>
                        <td>{p.configured ? "yes" : "no"}</td>
                        <td>{b5m?.requests ?? 0}</td>
                        <td>
                          {b5m && b5m.requests > 0
                            ? `${Math.round(b5m.successRate * 100)}%`
                            : p.configured
                              ? "no recent traffic"
                              : "\u2014"}
                        </td>
                        <td>
                          {b5m?.requests
                            ? `${Math.round(b5m.avgLatencyMs)}ms`
                            : p.configured
                              ? "no recent traffic"
                              : "\u2014"}
                        </td>
                        <td>{b24h?.requests ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!data && !error && (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>connecting to gateway...</p>
      )}
    </main>
  );
}
