"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../monitor.module.css";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.pura.xyz";

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/economy", label: "economy" },
  { href: "/monitor/providers", label: "providers" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

interface SkillPrice { avgPrice: number; count: number }
interface LeaderboardEntry { agentId: string; earnings: number; quality: number }
interface RecentTask {
  taskId: string; skillType: string; status: string;
  assignedTo: string | null; createdAt: number; qualityRating: number | null;
}
interface EconomyData {
  totalAgents: number; totalSkills: number; totalTasks: number;
  completedTasks: number; totalSatsTransacted: number;
  skillPrices: Record<string, SkillPrice>;
  recentTasks: RecentTask[];
  leaderboard: LeaderboardEntry[];
}

function fmtSats(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function truncId(v: string): string {
  return v.length <= 10 ? v : v.slice(0, 6) + "\u2026" + v.slice(-4);
}

export default function MonitorEconomyPage() {
  const [data, setData] = useState<EconomyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/economy`);
        if (res.ok && active) { setData(await res.json()); setError(null); }
      } catch { if (active) setError("Gateway unreachable"); }
    }
    poll();
    const iv = setInterval(poll, 10_000);
    return () => { active = false; clearInterval(iv); };
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
            className={t.href === "/monitor/economy" ? s.tabActive : s.tab}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{error}</p>}

      {/* aggregate stats */}
      <div className={s.statsRow}>
        <div className={s.stat}>
          <div className={s.statLabel}>agents</div>
          <div className={s.statValue}>{data?.totalAgents ?? 0}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>skills</div>
          <div className={s.statValue}>{data?.totalSkills ?? 0}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>tasks</div>
          <div className={s.statValue}>{data?.totalTasks ?? 0}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>completed</div>
          <div className={s.statValue}>{data?.completedTasks ?? 0}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>GDP (sats)</div>
          <div className={s.statValue}>{fmtSats(data?.totalSatsTransacted ?? 0)}</div>
        </div>
      </div>

      {/* skill prices */}
      <div className={s.section}>
        <div className={s.sectionHead}>skill prices</div>
        {data && Object.keys(data.skillPrices).length > 0 ? (
          <table className={s.tbl}>
            <thead><tr><th>skill</th><th>avg price</th><th>providers</th></tr></thead>
            <tbody>
              {Object.entries(data.skillPrices).map(([type, info]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{fmtSats(info.avgPrice)} sats</td>
                  <td>{info.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>No skills registered yet.</p>
        )}
      </div>

      {/* leaderboard */}
      <div className={s.section}>
        <div className={s.sectionHead}>leaderboard</div>
        {data && data.leaderboard.length > 0 ? (
          <table className={s.tbl}>
            <thead><tr><th>#</th><th>agent</th><th>earnings</th><th>quality</th></tr></thead>
            <tbody>
              {data.leaderboard.map((e, i) => (
                <tr key={e.agentId}>
                  <td>{i + 1}</td>
                  <td>{truncId(e.agentId)}</td>
                  <td>{fmtSats(e.earnings)} sats</td>
                  <td>{e.quality.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>No earnings yet.</p>
        )}
      </div>

      {/* recent tasks */}
      <div className={s.section}>
        <div className={s.sectionHead}>recent tasks</div>
        {data && data.recentTasks.length > 0 ? (
          <table className={s.tbl}>
            <thead><tr><th>task</th><th>skill</th><th>status</th><th>agent</th><th>quality</th></tr></thead>
            <tbody>
              {data.recentTasks.map((t) => (
                <tr key={t.taskId}>
                  <td>{truncId(t.taskId)}</td>
                  <td>{t.skillType}</td>
                  <td>{t.status}</td>
                  <td>{t.assignedTo ? truncId(t.assignedTo) : "\u2014"}</td>
                  <td>{t.qualityRating !== null ? t.qualityRating.toFixed(2) : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>No tasks yet.</p>
        )}
      </div>
    </main>
  );
}
