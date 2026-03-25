"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import s from "../monitor.module.css";

interface AuditEntry {
  epoch: number;
  sink: string;
  event: string;
  timestamp: number;
  detail: string;
}

const TABS = [
  { href: "/monitor", label: "overview" },
  { href: "/monitor/economy", label: "economy" },
  { href: "/monitor/providers", label: "providers" },
  { href: "/monitor/capacity", label: "capacity" },
  { href: "/monitor/congestion", label: "congestion" },
  { href: "/monitor/audit", label: "audit" },
] as const;

function seedAudit(): AuditEntry[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      epoch: 42,
      sink: "relay-alpha",
      event: "ATTESTATION",
      timestamp: now - 12,
      detail: "capacity=14.2, nonce=127, sig=0xa1c3...",
    },
    {
      epoch: 42,
      sink: "dvm-translate",
      event: "COMPLETION",
      timestamp: now - 28,
      detail: "jobId=0x00..02, dual-signed, evidenceHash=0xbeef...",
    },
    {
      epoch: 42,
      sink: "llm-gpt4",
      event: "PRICE_SIGNAL",
      timestamp: now - 45,
      detail: "price=2400 msat, utilBps=7200, multiplier=4.57x",
    },
    {
      epoch: 41,
      sink: "relay-alpha",
      event: "EPOCH_ADVANCE",
      timestamp: now - 120,
      detail: "epoch 40→41, 3 sinks active, 0 slashed",
    },
    {
      epoch: 41,
      sink: "agent-claw",
      event: "ATTESTATION",
      timestamp: now - 135,
      detail: "capacity=4.8, nonce=89, sig=0xd4e5...",
    },
    {
      epoch: 41,
      sink: "dvm-translate",
      event: "SETTLEMENT",
      timestamp: now - 180,
      detail: "rail=SUPERFLUID, streamId=0x..., flowRate=1000/s",
    },
    {
      epoch: 41,
      sink: "llm-gpt4",
      event: "COMPLETION",
      timestamp: now - 200,
      detail: "jobId=0x00..01, dual-signed, evidenceHash=0xcafe...",
    },
    {
      epoch: 40,
      sink: "relay-alpha",
      event: "SLASH_WARNING",
      timestamp: now - 400,
      detail: "missed attestation window, 1 of 3 consecutive",
    },
    {
      epoch: 40,
      sink: "dvm-translate",
      event: "REROUTE",
      timestamp: now - 420,
      detail: "BoltzmannRouter shifted 12% demand → agent-claw",
    },
    {
      epoch: 40,
      sink: "agent-claw",
      event: "ESCROW",
      timestamp: now - 450,
      detail: "jobId=0x00..03, amount=500000, rail=DIRECT",
    },
  ];
}

const EVENT_COLORS: Record<string, string> = {
  ATTESTATION: "#22c55e",
  COMPLETION: "#3b82f6",
  PRICE_SIGNAL: "#eab308",
  EPOCH_ADVANCE: "#8b5cf6",
  SETTLEMENT: "#06b6d4",
  SLASH_WARNING: "#ef4444",
  REROUTE: "#d97706",
  ESCROW: "#a855f7",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(seedAudit());
  }, []);

  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── MONITOR / AUDIT</span>
        <hr className={s.rule} />
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={t.href === "/monitor/audit" ? s.tabActive : s.tab}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>protocol event log</div>
        <table className={s.tbl}>
          <thead>
            <tr>
              <th>epoch</th>
              <th>sink</th>
              <th>event</th>
              <th>age</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const age = Math.floor(Date.now() / 1000) - e.timestamp;
              const ageStr =
                age < 60
                  ? `${age}s ago`
                  : age < 3600
                    ? `${Math.floor(age / 60)}m ago`
                    : `${Math.floor(age / 3600)}h ago`;
              return (
                <tr key={i}>
                  <td style={{ color: "#666" }}>{e.epoch}</td>
                  <td>{e.sink}</td>
                  <td style={{ color: EVENT_COLORS[e.event] ?? "#888" }}>
                    {e.event}
                  </td>
                  <td style={{ color: "#666" }}>{ageStr}</td>
                  <td style={{ color: "#888", fontSize: "0.68rem" }}>
                    {e.detail}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>verification model</div>
        <p style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.6 }}>
          Every protocol action produces a verifiable on-chain or off-chain event.
          Capacity attestations are EIP-712 signed. Completions require dual signatures
          (sink + source). Settlements produce transaction receipts on the chosen rail.
          This log aggregates all events for audit and debugging.
        </p>
      </div>
    </main>
  );
}
