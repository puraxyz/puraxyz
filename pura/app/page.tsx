"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { DemoTerminal } from "./components/DemoTerminal";

function SectionHead({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <span style={{ color }}>{"── "}{label.toUpperCase()}</span>
      <hr className={styles.rule} />
    </div>
  );
}

const STEPS = [
  {
    num: "1",
    name: "connect",
    desc: "Change your baseURL to api.pura.xyz. Drop-in OpenAI-compatible.",
  },
  {
    num: "2",
    name: "route",
    desc: "Pura picks the best model, escalates with cascade routing if the first answer falls short.",
  },
  {
    num: "3",
    name: "earn",
    desc: "Register skills in the marketplace. Other agents hire yours. Get paid in sats.",
  },
];

const COMPARE_ROWS = [
  {
    metric: "Model routing",
    vals: ["None", "None", "Manual", "None", "None", "Auto by complexity"],
  },
  {
    metric: "Cost optimization",
    vals: ["None", "None", "Markup pricing", "None", "None", "Cascade — cheapest sufficient tier"],
  },
  {
    metric: "Flow control",
    vals: ["None", "Temp MPP", "None", "None", "None", "Backpressure + Boltzmann"],
  },
  {
    metric: "Capacity signal",
    vals: ["None", "None", "Server-side", "Server-side", "None", "On-chain, EWMA-smoothed"],
  },
  {
    metric: "Completion verification",
    vals: ["None", "None", "None", "None", "None", "Dual-signed receipts"],
  },
  {
    metric: "Settlement",
    vals: ["HTTP 402", "ILP", "Stripe", "Credit", "HTTP 402", "Lightning"],
  },
];

const DEEPER_CARDS = [
  {
    label: "gateway docs",
    color: "var(--color-gateway)",
    body: "API reference, response headers, provider costs, Lightning funding.",
    href: "/gateway",
  },
  {
    label: "shadow mode",
    color: "var(--amber)",
    body: "See what Pura would do — without changing anything. Install the sidecar and watch.",
    href: "/shadow",
  },
  {
    label: "how it works",
    color: "var(--green)",
    body: "Backpressure routing, four architectural planes, five standard objects.",
    href: "/explainer",
  },
  {
    label: "paper",
    color: "var(--text-dim)",
    body: "Formal model, throughput optimality proof, simulation results.",
    href: "/paper",
  },
  {
    label: "github",
    color: "var(--text-dim)",
    body: "Monorepo: gateway, contracts, SDK, NVM, simulation, site.",
    href: "https://github.com/puraxyz/puraxyz",
  },
];

interface IncomeData {
  period: string;
  generatedAt: string;
  costs: { perProvider: Record<string, { usd: number; sats: number }>; totalUsd: number; totalSats: number };
  netIncomeSats: number;
  quality: { perProvider: Record<string, number>; aggregate: number };
  health: { providersUp: number; providersTotal: number; avgSuccessRate: number };
  cascade: { totalRequests: number; resolvedTier1: number; resolvedTier2: number; resolvedTier3: number; avgSavingsPct: number };
}

const SIMULATED_INCOME: IncomeData = {
  period: "24h",
  generatedAt: new Date().toISOString(),
  costs: {
    perProvider: {
      groq: { usd: 0.0018, sats: 5 },
      openai: { usd: 0.034, sats: 85 },
      anthropic: { usd: 0.012, sats: 30 },
    },
    totalUsd: 0.0478,
    totalSats: 120,
  },
  netIncomeSats: 4080,
  quality: { perProvider: { groq: 1.0, openai: 0.92, anthropic: 0.847, gemini: 1.0 }, aggregate: 0.942 },
  health: { providersUp: 4, providersTotal: 4, avgSuccessRate: 0.992 },
  cascade: { totalRequests: 16, resolvedTier1: 12, resolvedTier2: 3, resolvedTier3: 1, avgSavingsPct: 73.2 },
};

function formatIncome(stmt: IncomeData): string {
  const lines: string[] = [];
  lines.push("=== PURA INCOME STATEMENT ===");
  lines.push(`Period: ${stmt.period} | Generated: ${stmt.generatedAt.split("T")[0]}`);
  lines.push("");
  lines.push("COSTS");
  for (const [provider, data] of Object.entries(stmt.costs.perProvider)) {
    lines.push(`  ${provider.padEnd(12)} $${data.usd.toFixed(4)}  (${data.sats.toLocaleString()} sats)`);
  }
  lines.push(`  Total:        $${stmt.costs.totalUsd.toFixed(4)}  (${stmt.costs.totalSats.toLocaleString()} sats)`);
  lines.push("");
  lines.push("NET INCOME");
  const sign = stmt.netIncomeSats >= 0 ? "+" : "";
  lines.push(`  ${sign}${stmt.netIncomeSats.toLocaleString()} sats`);
  lines.push("");
  lines.push("QUALITY");
  for (const [provider, score] of Object.entries(stmt.quality.perProvider)) {
    const bar = "\u2588".repeat(Math.round(score * 10)) + "\u2591".repeat(10 - Math.round(score * 10));
    lines.push(`  ${provider.padEnd(12)} ${bar} ${score.toFixed(3)}`);
  }
  lines.push(`  Aggregate:    ${stmt.quality.aggregate}`);
  lines.push("");
  lines.push("HEALTH");
  lines.push(`  Providers:    ${stmt.health.providersUp}/${stmt.health.providersTotal} up`);
  lines.push(`  Success rate: ${(stmt.health.avgSuccessRate * 100).toFixed(1)}%`);
  if (stmt.cascade.totalRequests > 0) {
    lines.push("");
    lines.push("CASCADE ROUTING");
    lines.push(`  Total:        ${stmt.cascade.totalRequests} requests`);
    lines.push(`  Tier 1:       ${stmt.cascade.resolvedTier1} (${((stmt.cascade.resolvedTier1 / stmt.cascade.totalRequests) * 100).toFixed(0)}%)`);
    lines.push(`  Tier 2:       ${stmt.cascade.resolvedTier2}`);
    lines.push(`  Tier 3:       ${stmt.cascade.resolvedTier3}`);
    lines.push(`  Avg savings:  ${stmt.cascade.avgSavingsPct.toFixed(1)}%`);
  }
  lines.push("==============================");
  return lines.join("\n");
}

export default function Dashboard() {
  const [income, setIncome] = useState<IncomeData | null>(null);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    fetch("/api/income", { headers: { Authorization: "Bearer demo" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.costs) {
          setIncome(data);
        } else {
          setIncome(SIMULATED_INCOME);
          setSimulated(true);
        }
      })
      .catch(() => {
        setIncome(SIMULATED_INCOME);
        setSimulated(true);
      });
  }, []);

  return (
    <main className={styles.main}>
      {/* ═══════════ HERO ═══════════ */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>
            Your AI agent just got smarter about money.
          </h1>
          <p className={styles.subtitle}>
            One API endpoint. Automatic model selection. Cascade routing
            tries the cheapest provider first and escalates only when needed.
            Per-request cost tracking. Your agent earns sats.
          </p>
          <div className={styles.heroCtas}>
            <a href="#demo" className={styles.ctaPrimary}>try the gateway →</a>
            <a href="/gateway" className={styles.ctaSecondary}>get an API key →</a>
            <a href="/docs/getting-started-gateway" className={styles.ctaSecondary}>quickstart →</a>
          </div>
        </div>
        <div className={styles.heroImage}>
          <Image
            src="/pura.png"
            alt="Pura mascot"
            width={340}
            height={340}
            priority
          />
        </div>
        <DemoTerminal />
      </header>

      <hr className={styles.divider} />

      {/* ═══════════ PROOF — INCOME STATEMENT ═══════════ */}
      <section className={styles.section} id="proof">
        <SectionHead label="daily income statement" color="var(--green)" />
        {simulated && (
          <p className={styles.seedTag} style={{ marginBottom: "0.5rem" }}>
            Simulated — live data when your agent connects
          </p>
        )}
        <p className={styles.desc}>
          Every morning your agent gets this. Costs by provider, net income
          in sats, quality scores, cascade routing stats.
          One endpoint: <code>GET /api/income</code>
        </p>
        {income && (
          <pre className={styles.codePre} style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
            {formatIncome(income)}
          </pre>
        )}
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ HOW — 3 STEPS ═══════════ */}
      <section className={styles.section}>
        <SectionHead label="how it works" color="var(--green)" />
        <div className={styles.pipeline}>
          {STEPS.map((s, i) => (
            <div key={s.name} className={styles.pipelineStep}>
              <span className={styles.pipelineNum}>{s.num}</span>
              <span className={styles.pipelineName}>{s.name}</span>
              <span className={styles.pipelineDesc}>{s.desc}</span>
              {i < STEPS.length - 1 && (
                <span className={styles.pipelineArrow}>→</span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.codeSnippet} style={{ marginTop: "1.5rem" }}>
          <pre className={styles.codePre}>{`// swap your base URL — everything else stays the same
const openai = new OpenAI({ baseURL: "https://api.pura.xyz/v1" });`}</pre>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className={styles.section}>
        <SectionHead label="how it compares" color="var(--text-dim)" />
        <div style={{ overflowX: "auto" }}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th></th>
                <th>x402</th>
                <th>Tempo MPP</th>
                <th>load balancer</th>
                <th>OpenRouter</th>
                <th>AP2 / TAP</th>
                <th className={styles.highlightCol}>pura</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.metric}>
                  <td>{r.metric}</td>
                  {r.vals.map((v, i) => (
                    <td
                      key={i}
                      className={
                        i === 5
                          ? styles.highlightCol
                          : v === "None"
                            ? styles.noneCell
                            : undefined
                      }
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ GO DEEPER ═══════════ */}
      <section className={styles.section}>
        <SectionHead label="go deeper" color="var(--amber)" />
        <div className={styles.serviceGrid}>
          {DEEPER_CARDS.map((c) => (
            <div key={c.label} className={styles.serviceCard}>
              <span className={styles.serviceLabel} style={{ color: c.color }}>
                {"── "}{c.label.toUpperCase()}
              </span>
              <p className={styles.serviceBody}>{c.body}</p>
              <a
                href={c.href}
                className={styles.docLink}
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                explore →
              </a>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ FOOTER BRAND ═══════════ */}
      <footer className={styles.ecosystem}>
        <span>The Pura Protocol (MIT)</span>
        <span className={styles.ecosystemSep}>·</span>
        <span>Backpressure Economics</span>
        <span className={styles.ecosystemSep}>·</span>
        <span>Settled via Lightning</span>
        <span className={styles.ecosystemSep}>·</span>
        <a
          href="https://github.com/puraxyz/puraxyz"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ecosystemLink}
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}


