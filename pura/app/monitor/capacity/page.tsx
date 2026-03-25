"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import s from "../monitor.module.css";

interface SinkCapacity {
  id: string;
  smoothedCapacity: number;
  rawThroughput: number;
  completionRate: number;
  avgLatencyMs: number;
  ewmaAlpha: number;
}

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/economy", label: "economy" },
  { href: "/monitor/providers", label: "providers" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

function seedCapacity(): SinkCapacity[] {
  const t = Date.now();
  const sin = (p: number) => Math.sin((2 * Math.PI * t) / p);
  return [
    {
      id: "relay-alpha",
      smoothedCapacity: +(14 + 4 * sin(300_000)).toFixed(1),
      rawThroughput: +(16 + 6 * sin(240_000)).toFixed(1),
      completionRate: +(0.95 + 0.03 * sin(300_000)).toFixed(3),
      avgLatencyMs: Math.round(80 + 30 * sin(360_000)),
      ewmaAlpha: 0.3,
    },
    {
      id: "dvm-translate",
      smoothedCapacity: +(10 + 5 * sin(360_000)).toFixed(1),
      rawThroughput: +(12 + 7 * sin(300_000)).toFixed(1),
      completionRate: +(0.91 + 0.04 * sin(420_000)).toFixed(3),
      avgLatencyMs: Math.round(220 + 80 * sin(480_000)),
      ewmaAlpha: 0.3,
    },
    {
      id: "llm-gpt4",
      smoothedCapacity: +(7 + 3 * sin(420_000)).toFixed(1),
      rawThroughput: +(8 + 4 * sin(360_000)).toFixed(1),
      completionRate: +(0.9 + 0.05 * sin(360_000)).toFixed(3),
      avgLatencyMs: Math.round(310 + 100 * sin(300_000)),
      ewmaAlpha: 0.3,
    },
    {
      id: "agent-claw",
      smoothedCapacity: +(4 + 2 * sin(540_000)).toFixed(1),
      rawThroughput: +(5 + 3 * sin(480_000)).toFixed(1),
      completionRate: +(0.83 + 0.06 * sin(540_000)).toFixed(3),
      avgLatencyMs: Math.round(180 + 60 * sin(360_000)),
      ewmaAlpha: 0.3,
    },
  ];
}

function CapacityBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 80 ? "#ef4444" : pct > 50 ? "#eab308" : "#22c55e";
  return (
    <div className={s.barOuter}>
      <div
        className={s.barInner}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function CapacityPage() {
  const [sinks, setSinks] = useState<SinkCapacity[]>([]);

  useEffect(() => {
    setSinks(seedCapacity());
    const iv = setInterval(() => setSinks(seedCapacity()), 5000);
    return () => clearInterval(iv);
  }, []);

  const maxCap = Math.max(...sinks.map((s) => s.smoothedCapacity), 1);

  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── MONITOR / CAPACITY</span>
        <hr className={s.rule} />
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={t.href === "/monitor/capacity" ? s.tabActive : s.tab}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>EWMA-smoothed capacity per sink (alpha = 0.3)</div>
        <table className={s.tbl}>
          <thead>
            <tr>
              <th>sink</th>
              <th>smoothed cap</th>
              <th>raw throughput</th>
              <th>completion rate</th>
              <th>avg latency</th>
              <th style={{ width: "20%" }}>utilization</th>
            </tr>
          </thead>
          <tbody>
            {sinks.map((sink) => (
              <tr key={sink.id}>
                <td>{sink.id}</td>
                <td>{sink.smoothedCapacity}/s</td>
                <td>{sink.rawThroughput}/s</td>
                <td
                  className={
                    +sink.completionRate < 0.85
                      ? s.bad
                      : +sink.completionRate < 0.92
                        ? s.warn
                        : s.good
                  }
                >
                  {(+sink.completionRate * 100).toFixed(1)}%
                </td>
                <td
                  className={
                    sink.avgLatencyMs > 300 ? s.bad : sink.avgLatencyMs > 150 ? s.warn : s.good
                  }
                >
                  {sink.avgLatencyMs} ms
                </td>
                <td>
                  <CapacityBar value={sink.smoothedCapacity} max={maxCap} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>capacity attestation flow</div>
        <p style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.6 }}>
          Each sink publishes signed capacity attestations (EIP-712) every epoch.
          The CapacityRegistry smooths raw values with EWMA (alpha = 0.3) and exposes
          normalized scores to PricingCurve and BoltzmannRouter. Sinks that fail to
          attest within the epoch window are marked inactive and excluded from routing.
        </p>
      </div>
    </main>
  );
}
