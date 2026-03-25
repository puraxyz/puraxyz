"use client";

import { useState, useRef } from "react";
import styles from "./DemoTerminal.module.css";

const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.pura.xyz";

const CURL_COMMAND = `curl -X POST ${API_BASE}/v1/chat/completions \\
  -H "Authorization: Bearer pura_demo" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"What is backpressure routing?"}]}'`;

const CANNED_RESPONSE: DemoResult = {
  output:
    "Backpressure routing is a scheduling algorithm that routes work to the queue with the most spare capacity, originally from Tassiulas-Ephremides (1992), adapted here to route LLM inference across providers based on on-chain capacity signals.",
  provider: "groq",
  model: "llama-3.3-70b-versatile",
  cost: "0.0003",
  tier: "cheap",
  requestId: "demo0000",
  rateRemaining: null,
  latencyMs: 0,
  isDemo: true,
};

interface DemoResult {
  output: string;
  provider: string | null;
  model: string | null;
  cost: string | null;
  tier: string | null;
  requestId: string | null;
  rateRemaining: string | null;
  latencyMs: number;
  isDemo?: boolean;
}

export function DemoTerminal() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  async function runDemo() {
    setRunning(true);
    setResult(null);
    setError(null);
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_BASE}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer pura_demo",
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "What is backpressure routing? One sentence." },
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }

      const provider = res.headers.get("x-pura-provider");
      const model = res.headers.get("x-pura-model");
      const cost = res.headers.get("x-pura-cost");
      const tier = res.headers.get("x-pura-tier");
      const requestId = res.headers.get("x-pura-request-id");
      const rateRemaining = res.headers.get("x-ratelimit-remaining");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              output += delta;
              setResult({
                output,
                provider,
                model,
                cost,
                tier,
                requestId,
                rateRemaining,
                latencyMs: Date.now() - start,
              });
            }
          } catch {
            // skip malformed
          }
        }
      }

      setResult({
        output: output || "(empty response)",
        provider,
        model,
        cost,
        tier,
        requestId,
        rateRemaining,
        latencyMs: Date.now() - start,
      });
    } catch (e) {
      // Network error or timeout — show canned fallback
      if ((e as Error).name === "AbortError" || !(e as Error).message?.match(/^\d{3}:/)) {
        setResult(CANNED_RESPONSE);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.titleBar}>
        <span className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
        <span className={styles.titleText}>api.pura.xyz{result?.isDemo ? " (demo)" : ""}</span>
      </div>

      <div className={styles.body}>
        <pre className={styles.curl}>
          <span className={styles.prompt}>$</span> {CURL_COMMAND}
        </pre>

        {result && (
          <div className={styles.response}>
            <pre ref={outputRef} className={styles.output}>
              {result.output}
              {running && <span className={styles.cursor}>▌</span>}
            </pre>
            <div className={styles.meta}>
              {result.provider && (
                <span className={styles.metaItem}>
                  <span className={styles.metaKey}>provider</span>{" "}
                  <span className={styles.metaVal}>{result.provider}</span>
                </span>
              )}
              {result.tier && (
                <span className={styles.metaItem}>
                  <span className={styles.metaKey}>tier</span>{" "}
                  <span className={styles.metaVal}>{result.tier}</span>
                </span>
              )}
              {result.cost && (
                <span className={styles.metaItem}>
                  <span className={styles.metaKey}>cost</span>{" "}
                  <span className={styles.metaVal}>${result.cost}</span>
                </span>
              )}
              <span className={styles.metaItem}>
                <span className={styles.metaKey}>latency</span>{" "}
                <span className={styles.metaVal}>{result.latencyMs}ms</span>
              </span>
              {result.requestId && (
                <span className={styles.metaItem}>
                  <span className={styles.metaKey}>request</span>{" "}
                  <span className={styles.metaVal}>
                    {result.requestId.slice(0, 8)}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <span className={styles.errorLabel}>error</span> {error}
          </div>
        )}

        {!result && !error && !running && (
          <div className={styles.placeholder}>
            click run to send a request through the pura gateway
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.runBtn}
          onClick={runDemo}
          disabled={running}
        >
          {running ? "routing..." : "run →"}
        </button>
      </div>
    </div>
  );
}
