"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.pura.xyz";

export function KeyGenerator() {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "web-generated" }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }
      const data = await res.json();
      setKey(data.key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {!key && (
        <button
          onClick={generate}
          disabled={loading}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            padding: "0.45rem 1rem",
            background: "var(--green)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: loading ? "wait" : "pointer",
            width: "fit-content",
          }}
        >
          {loading ? "generating..." : "generate API key"}
        </button>
      )}
      {key && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.5rem 0.7rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              wordBreak: "break-all",
            }}
          >
            <code style={{ flex: 1 }}>{key}</code>
            <button
              onClick={copyKey}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                padding: "0.25rem 0.5rem",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--yellow, #e5c07b)",
              marginTop: "0.35rem",
            }}
          >
            Save this key now. You won't see it again.
          </p>
        </div>
      )}
      {error && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--red, #e06c75)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
