"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// NVM event kinds
const KIND_LABELS: Record<number, string> = {
  31900: "Capacity",
  31901: "Receipt",
  31902: "Quality",
  31903: "Assignment",
  31904: "Pipeline",
  31905: "State",
  31910: "Credit Line",
  31911: "Future",
  31912: "Spawn",
  31913: "Profile",
  31914: "Bridge",
  31915: "Proposal",
  31916: "Endorsement",
  31917: "Genome",
  31918: "Settlement",
  31919: "Default",
  31920: "Futures Exec",
  31921: "Attestation",
  31922: "Activation",
};

interface NvmEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
}

interface AgentRow {
  pubkey: string;
  skill: string;
  capacity: number;
  latency: number;
  price: number;
  quality: number | null;
  lastSeen: number;
}

function getTag(event: NvmEvent, name: string): string | undefined {
  return event.tags.find((t) => t[0] === name)?.[1];
}

function shortKey(hex: string): string {
  return hex.slice(0, 8) + "…" + hex.slice(-4);
}

function relativeTime(unixSec: number): string {
  const delta = Math.floor(Date.now() / 1000) - unixSec;
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  return `${Math.floor(delta / 3600)}h ago`;
}

export default function NvmDashboard() {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<Map<string, AgentRow>>(new Map());
  const [feed, setFeed] = useState<Array<{ ts: number; label: string; detail: string }>>([]);
  const [relayUrl, setRelayUrl] = useState("ws://localhost:7777");
  const [eventCount, setEventCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const addFeedItem = useCallback(
    (label: string, detail: string) => {
      setFeed((prev) => [{ ts: Date.now(), label, detail }, ...prev].slice(0, 200));
    },
    [],
  );

  const handleEvent = useCallback(
    (event: NvmEvent) => {
      setEventCount((c) => c + 1);
      const kindLabel = KIND_LABELS[event.kind] ?? `Kind ${event.kind}`;

      if (event.kind === 31900) {
        // Capacity attestation — upsert agent
        const skill = getTag(event, "d") ?? "unknown";
        const key = `${event.pubkey}:${skill}`;
        setAgents((prev) => {
          const next = new Map(prev);
          next.set(key, {
            pubkey: event.pubkey,
            skill,
            capacity: Number(getTag(event, "capacity")) || 0,
            latency: Number(getTag(event, "latency_ms")) || 0,
            price: Number(getTag(event, "price_msats")) || 0,
            quality: prev.get(key)?.quality ?? null,
            lastSeen: event.created_at,
          });
          return next;
        });
        addFeedItem(kindLabel, `${shortKey(event.pubkey)} → ${skill} cap=${getTag(event, "capacity")}`);
      } else if (event.kind === 31902) {
        // Quality score — update existing agent row
        const agentPub = getTag(event, "d") ?? event.pubkey;
        setAgents((prev) => {
          const next = new Map(prev);
          for (const [k, row] of next) {
            if (row.pubkey === agentPub) {
              next.set(k, { ...row, quality: Number(getTag(event, "score_bps")) / 100 });
            }
          }
          return next;
        });
        addFeedItem(kindLabel, `${shortKey(agentPub)} score=${getTag(event, "score_bps")} bps`);
      } else if (event.kind === 31903) {
        // Job assignment
        let detail: string;
        try {
          const c = JSON.parse(event.content);
          detail = `job=${c.jobRequestEventId?.slice(0, 8)} → ${shortKey(c.assignedAgentPubkey ?? "")} price=${c.priceMsats}ms`;
        } catch {
          detail = event.content.slice(0, 80);
        }
        addFeedItem(kindLabel, detail);
      } else if (event.kind === 31901) {
        // Completion receipt
        addFeedItem(kindLabel, `${shortKey(event.pubkey)} quality=${getTag(event, "quality_bps")} bps`);
      } else {
        addFeedItem(kindLabel, `${shortKey(event.pubkey)} ${event.content.slice(0, 60)}`);
      }
    },
    [addFeedItem],
  );

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }
    const url = `/api/nvm/events?relay=${encodeURIComponent(relayUrl)}`;
    const es = new EventSource(url);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "connected") setConnected(true);
        if (data.type === "disconnected" || data.type === "error") setConnected(false);
        if (data.type === "event" && data.event) handleEvent(data.event as NvmEvent);
      } catch {
        // ignore
      }
    };
    es.onerror = () => setConnected(false);
    esRef.current = es;
  }, [relayUrl, handleEvent]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const agentRows = Array.from(agents.values()).sort((a, b) => b.capacity - a.capacity);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", fontFamily: "var(--font-inter, sans-serif)" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>NVM dashboard</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Live view of agent capacity, job routing, and quality scores on the Nostr Virtual Machine.
      </p>

      {/* connection bar */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <input
          type="text"
          value={relayUrl}
          onChange={(e) => setRelayUrl(e.target.value)}
          style={{
            flex: 1,
            padding: "0.4rem 0.6rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        />
        <button
          onClick={connect}
          style={{
            padding: "0.4rem 1rem",
            background: connected ? "#22c55e" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {connected ? "Connected" : "Connect"}
        </button>
        <span style={{ fontSize: "0.75rem", color: "#999" }}>{eventCount} events</span>
      </div>

      {/* agents table */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Agent capacity</h2>
        {agentRows.length === 0 ? (
          <p style={{ color: "#999", fontSize: "0.85rem" }}>No agents seen yet. Connect to a relay above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem 0.6rem" }}>Agent</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>Skill</th>
                  <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Capacity</th>
                  <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Latency</th>
                  <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Price (msat)</th>
                  <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Quality</th>
                  <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((row) => (
                  <tr key={`${row.pubkey}:${row.skill}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.4rem 0.6rem", fontFamily: "monospace" }}>{shortKey(row.pubkey)}</td>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{row.skill}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.capacity}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.latency}ms</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>{row.price}</td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>
                      {row.quality !== null ? `${row.quality.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.6rem", textAlign: "right", color: "#999" }}>
                      {relativeTime(row.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* live event feed */}
      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Event feed</h2>
        <div
          style={{
            maxHeight: 400,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            fontSize: "0.8rem",
            fontFamily: "monospace",
          }}
        >
          {feed.length === 0 ? (
            <p style={{ padding: "1rem", color: "#999" }}>Waiting for events...</p>
          ) : (
            feed.map((item, i) => (
              <div
                key={`${item.ts}-${i}`}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderBottom: "1px solid #f9fafb",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "#6b7280", minWidth: 60 }}>
                  {new Date(item.ts).toLocaleTimeString()}
                </span>
                <span
                  style={{
                    background: "#f3f4f6",
                    borderRadius: 3,
                    padding: "0 4px",
                    fontWeight: 600,
                    minWidth: 70,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </span>
                <span style={{ color: "#374151" }}>{item.detail}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
