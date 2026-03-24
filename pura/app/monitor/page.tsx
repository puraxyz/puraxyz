"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import s from "./monitor.module.css";

interface ShadowMetrics {
  totalRequests: number;
  totalCompletions: number;
  totalFailures: number;
  totalTimeouts: number;
  completionRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  throughput: number;
  sinks: Record<
    string,
    {
      requests: number;
      completions: number;
      failures: number;
      avgLatencyMs: number;
      throughput: number;
    }
  >;
}

interface SimResult {
  shadowReroutedCount: number;
  shadowRevenueDeltaMsat: number;
  shadowPriceSignalCount: number;
  sinkComparison: Record<
    string,
    { actualShare: number; bpeShare: number; delta: number }
  >;
  bpePricePerSink: Record<string, number>;
}

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

function seedMetrics(): ShadowMetrics {
  const t = Date.now();
  const sin = (p: number) => Math.sin((2 * Math.PI * t) / p);
  return {
    totalRequests: Math.round(2400 + 600 * sin(300_000)),
    totalCompletions: Math.round(2200 + 500 * sin(300_000)),
    totalFailures: Math.round(80 + 40 * sin(420_000)),
    totalTimeouts: Math.round(20 + 15 * sin(540_000)),
    completionRate: 0.92 + 0.04 * sin(300_000),
    avgLatencyMs: Math.round(145 + 55 * sin(360_000)),
    p95LatencyMs: Math.round(380 + 120 * sin(360_000)),
    throughput: +(36 + 12 * sin(300_000)).toFixed(1),
    sinks: {
      "relay-alpha": {
        requests: Math.round(900 + 200 * sin(300_000)),
        completions: Math.round(860 + 180 * sin(300_000)),
        failures: Math.round(20 + 10 * sin(420_000)),
        avgLatencyMs: Math.round(80 + 30 * sin(360_000)),
        throughput: +(14 + 4 * sin(300_000)).toFixed(1),
      },
      "dvm-translate": {
        requests: Math.round(700 + 250 * sin(360_000)),
        completions: Math.round(640 + 200 * sin(360_000)),
        failures: Math.round(35 + 20 * sin(420_000)),
        avgLatencyMs: Math.round(220 + 80 * sin(480_000)),
        throughput: +(10 + 5 * sin(360_000)).toFixed(1),
      },
      "llm-gpt4": {
        requests: Math.round(500 + 150 * sin(420_000)),
        completions: Math.round(450 + 120 * sin(420_000)),
        failures: Math.round(15 + 8 * sin(540_000)),
        avgLatencyMs: Math.round(310 + 100 * sin(300_000)),
        throughput: +(7 + 3 * sin(420_000)).toFixed(1),
      },
      "agent-claw": {
        requests: Math.round(300 + 100 * sin(540_000)),
        completions: Math.round(250 + 80 * sin(540_000)),
        failures: Math.round(10 + 5 * sin(600_000)),
        avgLatencyMs: Math.round(180 + 60 * sin(360_000)),
        throughput: +(4 + 2 * sin(540_000)).toFixed(1),
      },
    },
  };
}

function seedSim(): SimResult {
  const t = Date.now();
  const sin = (p: number) => Math.sin((2 * Math.PI * t) / p);
  return {
    shadowReroutedCount: Math.round(45 + 25 * sin(300_000)),
    shadowRevenueDeltaMsat: Math.round(12000 + 8000 * sin(360_000)),
    shadowPriceSignalCount: Math.round(3 + 2 * sin(420_000)),
    sinkComparison: {
      "relay-alpha": {
        actualShare: 0.38,
        bpeShare: 0.35 + 0.03 * sin(300_000),
        delta: -0.03 + 0.03 * sin(300_000),
      },
      "dvm-translate": {
        actualShare: 0.29,
        bpeShare: 0.25 + 0.02 * sin(360_000),
        delta: -0.04 + 0.02 * sin(360_000),
      },
      "llm-gpt4": {
        actualShare: 0.21,
        bpeShare: 0.22 + 0.02 * sin(420_000),
        delta: 0.01 + 0.02 * sin(420_000),
      },
      "agent-claw": {
        actualShare: 0.12,
        bpeShare: 0.18 + 0.01 * sin(540_000),
        delta: 0.06 + 0.01 * sin(540_000),
      },
    },
    bpePricePerSink: {
      "relay-alpha": Math.round(1200 + 300 * sin(300_000)),
      "dvm-translate": Math.round(1800 + 600 * sin(360_000)),
      "llm-gpt4": Math.round(2400 + 400 * sin(420_000)),
      "agent-claw": Math.round(1100 + 200 * sin(540_000)),
    },
  };
}

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<ShadowMetrics | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);

  useEffect(() => {
    let stale = false;
    async function load() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch("/api/shadow/metrics"),
          fetch("/api/shadow/simulate"),
        ]);
        if (mRes.ok && !stale) setMetrics(await mRes.json());
        if (sRes.ok && !stale) setSim(await sRes.json());
      } catch {
        if (!stale) {
          setMetrics(seedMetrics());
          setSim(seedSim());
        }
      }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => {
      stale = true;
      clearInterval(iv);
    };
  }, []);

  const m = metrics ?? seedMetrics();
  const sr = sim ?? seedSim();

  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── MONITOR</span>
        <hr className={s.rule} />
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={t.href === "/monitor" ? s.tabActive : s.tab}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* top-line stats */}
      <div className={s.statsRow}>
        <div className={s.stat}>
          <div className={s.statLabel}>requests / window</div>
          <div className={s.statValue}>{m.totalRequests.toLocaleString()}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>completion rate</div>
          <div className={s.statValue}>
            {(m.completionRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>p95 latency</div>
          <div className={s.statValue}>{m.p95LatencyMs} ms</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>throughput</div>
          <div className={s.statValue}>{m.throughput}/s</div>
        </div>
      </div>

      {/* per-sink table */}
      <div className={s.section}>
        <div className={s.sectionHead}>sink performance</div>
        <table className={s.tbl}>
          <thead>
            <tr>
              <th>sink</th>
              <th>reqs</th>
              <th>comps</th>
              <th>fails</th>
              <th>avg lat</th>
              <th>tput/s</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(m.sinks).map(([id, sink]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{sink.requests}</td>
                <td>{sink.completions}</td>
                <td className={sink.failures > 30 ? s.bad : undefined}>
                  {sink.failures}
                </td>
                <td
                  className={
                    sink.avgLatencyMs > 300
                      ? s.bad
                      : sink.avgLatencyMs > 150
                        ? s.warn
                        : s.good
                  }
                >
                  {sink.avgLatencyMs} ms
                </td>
                <td>{sink.throughput}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* shadow comparison */}
      <div className={s.section}>
        <div className={s.sectionHead}>BPE shadow comparison</div>
        <div className={s.statsRow}>
          <div className={s.stat}>
            <div className={s.statLabel}>reroutes (BPE would shift)</div>
            <div className={s.statValue}>{sr.shadowReroutedCount}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statLabel}>revenue delta (msat)</div>
            <div className={s.statValue}>
              {sr.shadowRevenueDeltaMsat > 0 ? "+" : ""}
              {sr.shadowRevenueDeltaMsat.toLocaleString()}
            </div>
          </div>
          <div className={s.stat}>
            <div className={s.statLabel}>price signals</div>
            <div className={s.statValue}>{sr.shadowPriceSignalCount}</div>
          </div>
        </div>

        <table className={s.tbl}>
          <thead>
            <tr>
              <th>sink</th>
              <th>actual share</th>
              <th>BPE share</th>
              <th>delta</th>
              <th>BPE price (msat)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sr.sinkComparison).map(([id, cmp]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{(cmp.actualShare * 100).toFixed(1)}%</td>
                <td>{(cmp.bpeShare * 100).toFixed(1)}%</td>
                <td className={cmp.delta > 0 ? s.good : cmp.delta < -0.02 ? s.bad : undefined}>
                  {cmp.delta > 0 ? "+" : ""}
                  {(cmp.delta * 100).toFixed(1)}%
                </td>
                <td>{sr.bpePricePerSink[id]?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.shadow}>
        Connect a live shadow sidecar:{" "}
        <code>npm i @puraxyz/shadow</code> — see{" "}
        <Link href="/docs" style={{ color: "var(--amber, #d97706)" }}>
          integration guide
        </Link>
      </div>
    </main>
  );
}
