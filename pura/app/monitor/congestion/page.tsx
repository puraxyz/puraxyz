"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import s from "../monitor.module.css";

interface CongestionEntry {
  id: string;
  queueLoad: number;
  capacity: number;
  utilBps: number;
  price: number;
  baseFee: number;
  congestionMultiplier: number;
  priceSignalActive: boolean;
}

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/economy", label: "economy" },
  { href: "/monitor/providers", label: "providers" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

function seedCongestion(): CongestionEntry[] {
  const t = Date.now();
  const sin = (p: number) => Math.sin((2 * Math.PI * t) / p);
  return [
    {
      id: "relay-alpha",
      queueLoad: Math.round(40 + 30 * sin(300_000)),
      capacity: Math.round(900 + 200 * sin(300_000)),
      utilBps: Math.round(4500 + 2000 * sin(300_000)),
      price: Math.round(1200 + 300 * sin(300_000)),
      baseFee: 1000,
      congestionMultiplier: +(1 + 0.5 * Math.max(0, (40 + 30 * sin(300_000)) / 14)).toFixed(2),
      priceSignalActive: sin(300_000) > 0.3,
    },
    {
      id: "dvm-translate",
      queueLoad: Math.round(80 + 60 * sin(360_000)),
      capacity: Math.round(700 + 250 * sin(360_000)),
      utilBps: Math.round(6500 + 2500 * sin(360_000)),
      price: Math.round(1800 + 600 * sin(360_000)),
      baseFee: 1000,
      congestionMultiplier: +(1 + 0.5 * Math.max(0, (80 + 60 * sin(360_000)) / 10)).toFixed(2),
      priceSignalActive: sin(360_000) > 0.1,
    },
    {
      id: "llm-gpt4",
      queueLoad: Math.round(50 + 40 * sin(420_000)),
      capacity: Math.round(500 + 150 * sin(420_000)),
      utilBps: Math.round(7200 + 1800 * sin(420_000)),
      price: Math.round(2400 + 400 * sin(420_000)),
      baseFee: 1000,
      congestionMultiplier: +(1 + 0.5 * Math.max(0, (50 + 40 * sin(420_000)) / 7)).toFixed(2),
      priceSignalActive: true,
    },
    {
      id: "agent-claw",
      queueLoad: Math.round(15 + 10 * sin(540_000)),
      capacity: Math.round(300 + 100 * sin(540_000)),
      utilBps: Math.round(3200 + 1500 * sin(540_000)),
      price: Math.round(1100 + 200 * sin(540_000)),
      baseFee: 1000,
      congestionMultiplier: +(1 + 0.5 * Math.max(0, (15 + 10 * sin(540_000)) / 4)).toFixed(2),
      priceSignalActive: false,
    },
  ];
}

export default function CongestionPage() {
  const [entries, setEntries] = useState<CongestionEntry[]>([]);

  useEffect(() => {
    setEntries(seedCongestion());
    const iv = setInterval(() => setEntries(seedCongestion()), 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── MONITOR / CONGESTION</span>
        <hr className={s.rule} />
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={t.href === "/monitor/congestion" ? s.tabActive : s.tab}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          congestion pricing — price = baseFee x (1 + gamma x queueLoad / capacity)
        </div>
        <table className={s.tbl}>
          <thead>
            <tr>
              <th>sink</th>
              <th>queue load</th>
              <th>capacity</th>
              <th>util (bps)</th>
              <th>multiplier</th>
              <th>price (msat)</th>
              <th>signal</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.queueLoad}</td>
                <td>{e.capacity}</td>
                <td
                  className={
                    e.utilBps > 8000 ? s.bad : e.utilBps > 5000 ? s.warn : s.good
                  }
                >
                  {e.utilBps}
                </td>
                <td
                  className={
                    e.congestionMultiplier > 3
                      ? s.bad
                      : e.congestionMultiplier > 1.5
                        ? s.warn
                        : undefined
                  }
                >
                  {e.congestionMultiplier}x
                </td>
                <td>{e.price.toLocaleString()}</td>
                <td>
                  {e.priceSignalActive ? (
                    <span className={s.warn}>ACTIVE</span>
                  ) : (
                    <span style={{ color: "#555" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>pricing formula</div>
        <p style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.6 }}>
          Each epoch, PricingCurve computes a congestion-adjusted price per sink.
          When utilization exceeds 50%, the congestion multiplier kicks in and a
          Kind 1090 price signal can be emitted. BoltzmannRouter uses these signals
          to shift demand toward less congested sinks.
        </p>
      </div>
    </main>
  );
}
