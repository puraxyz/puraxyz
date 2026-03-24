"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { AsciiBar } from "./components/AsciiBar";
import { StatusDot } from "./components/StatusDot";
import { RoutingViz } from "./components/RoutingViz";
import { DemoTerminal } from "./components/DemoTerminal";
import {
  generateRelaySeedState,
  generateLightningSeedState,
  generateAgentSeedState,
  generateGatewaySeedState,
  type RelayState,
  type LightningState,
  type ExplorerState,
  type GatewayState,
} from "@/lib/shared/seed";

interface ThermoState {
  temperature: string;
  virialRatio: string;
  escrowPressure: string;
  demurrageRate: string;
  phase: string;
  phaseIndex: number;
  tauMin: string;
  tauMax: string;
  equilibriumTarget: string;
  seed?: boolean;
}

interface SimState {
  tickNumber: number;
  phase: string;
  tickInPhase: number;
  flowRateMultiplier: number;
  baseFee: string;
  flowRate: string;
  agents: Record<
    string,
    {
      address: string;
      stake: string;
      capacityCap: string;
      poolUnits: string;
      completionRate: string;
      completions: string;
      queueLoad: string;
      price: string;
    }
  >;
  poolAddress: string | null;
  chainId: number;
  blockNumber: string;
}

function truncHex(s: string, n = 6) {
  if (s.length <= n * 2 + 2) return s;
  return s.slice(0, n + 2) + "\u2026" + s.slice(-n);
}

function fmtNum(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString();
}

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
    desc: "Point your HTTP endpoint at api.pura.xyz, or add one SDK line. Drop-in OpenAI-compatible.",
  },
  {
    num: "2",
    name: "route",
    desc: "Pura reads on-chain capacity attestations and routes to spare capacity via Boltzmann weighting.",
  },
  {
    num: "3",
    name: "verify",
    desc: "Dual-signed receipt goes on-chain. Cryptographic proof the work actually happened.",
  },
];

const BUILD_CARDS = [
  {
    label: "inference router",
    color: "var(--color-gateway)",
    body: "OpenAI-compatible API that routes across providers based on real-time capacity. Saturated provider? Requests go to whoever has room. Every completion recorded on-chain.",
    href: "/deploy",
  },
  {
    label: "agent marketplace",
    color: "var(--color-agents)",
    body: "Deploy an economy where agents compete on capacity. Register skills, stake against throughput claims, earn proportional to verified completions.",
    href: "/deploy/dvm",
  },
  {
    label: "pipeline orchestrator",
    color: "var(--color-sim)",
    body: "Multi-stage workflows with backpressure. Chain pools into pipelines. If stage 3 is overwhelmed, stages 1 and 2 slow down automatically.",
    href: "/docs/contracts",
  },
];

const COMPARE_ROWS = [
  {
    metric: "Flow control",
    vals: ["None", "Temp MPP", "None", "None", "Backpressure + Boltzmann"],
  },
  {
    metric: "Capacity signal",
    vals: ["None", "None", "Server-side", "None", "On-chain, EWMA-smoothed"],
  },
  {
    metric: "Completion verification",
    vals: ["None", "None", "None", "None", "Dual-signed receipts"],
  },
  {
    metric: "Dynamic pricing",
    vals: ["None", "None", "None", "Fixed", "Congestion-driven"],
  },
  {
    metric: "Settlement",
    vals: ["HTTP 402", "ILP", "Stripe", "HTTP 402", "Lightning + Superfluid + ERC-20"],
  },
];

export default function Dashboard() {
  const [relays, setRelays] = useState<RelayState | null>(null);
  const [lightning, setLightning] = useState<LightningState | null>(null);
  const [agents, setAgents] = useState<ExplorerState | null>(null);
  const [gateway, setGateway] = useState<GatewayState | null>(null);
  const [sim, setSim] = useState<SimState | null>(null);
  const [thermo, setThermo] = useState<ThermoState | null>(null);
  const [seeds, setSeeds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchOrSeed<T>(
      url: string,
      key: string,
      seedFn: (() => T) | null,
      setter: (v: T) => void,
    ) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          setter(await res.json());
          return;
        }
      } catch {
        /* fall through to seed */
      }
      if (seedFn) {
        setter(seedFn());
        setSeeds((prev) => new Set(prev).add(key));
      }
    }

    fetchOrSeed("/api/relays/state", "relays", generateRelaySeedState, setRelays);
    fetchOrSeed("/api/lightning/state", "lightning", generateLightningSeedState, setLightning);
    fetchOrSeed("/api/agents/state", "agents", generateAgentSeedState, setAgents);
    fetchOrSeed("/api/gateway/state", "gateway", generateGatewaySeedState, setGateway);
    fetchOrSeed<SimState>("/api/sim/state", "sim", null, setSim);
    fetchOrSeed<ThermoState>("/api/thermo/state", "thermo", null, setThermo);
  }, []);

  const seed = (key: string) =>
    seeds.has(key) ? <span className={styles.seedTag}>[seed]</span> : null;

  return (
    <main className={styles.main}>
      {/* ═══════════ HERO ═══════════ */}
      <header className={styles.hero}>
        <h1 className={styles.title}>
          Capacity-aware routing for the machine economy.
        </h1>
        <p className={styles.subtitle}>
          Point payments at Pura. We read on-chain capacity, route to spare
          providers via Boltzmann weighting, verify completions, and buffer
          overflow. TCP/IP-style congestion control for monetary flows.
        </p>
        <div className={styles.heroCtas}>
          <a href="#demo" className={styles.ctaPrimary}>route your first request →</a>
          <a href="/paper" className={styles.ctaSecondary}>read the paper →</a>
        </div>
        <RoutingViz />
      </header>

      {/* ═══════════ LIVE STATS BAR ═══════════ */}
      <div className={styles.statsBar}>
        <span>base-sepolia testnet</span>
        <span className={styles.statsBarSep}>│</span>
        <span>32 contracts</span>
        <span className={styles.statsBarSep}>│</span>
        <span>319 tests passing</span>
        {thermo && (
          <>
            <span className={styles.statsBarSep}>│</span>
            <span>τ = {thermo.temperature}</span>
            <span className={styles.statsBarSep}>│</span>
            <span>phase: {thermo.phase}</span>
          </>
        )}
      </div>

      <hr className={styles.divider} />

      {/* ═══════════ HOW IT WORKS — 3 STEPS ═══════════ */}
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
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ LIVE DEMO ═══════════ */}
      <section className={styles.section} id="demo">
        <SectionHead label="try it" color="var(--amber)" />
        <p className={styles.desc}>
          Send a request through the Pura gateway. The response streams back
          with X-Pura headers showing which provider was selected and how much
          capacity remains. Same endpoint works as a drop-in for the OpenAI SDK.
        </p>
        <DemoTerminal />
        <div className={styles.codeSnippet}>
          <SectionHead label="one-line integration" color="var(--text-dim)" />
          <pre className={styles.codePre}>{`// swap your base URL — everything else stays the same
const openai = new OpenAI({ baseURL: "https://api.pura.xyz/v1" });`}</pre>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ WHAT YOU CAN BUILD ═══════════ */}
      <section className={styles.section}>
        <SectionHead label="what you can build" color="var(--amber)" />
        <div className={styles.serviceGrid}>
          {BUILD_CARDS.map((c) => (
            <div key={c.label} className={styles.serviceCard}>
              <span className={styles.serviceLabel} style={{ color: c.color }}>
                {"── "}{c.label.toUpperCase()}
              </span>
              <p className={styles.serviceBody}>{c.body}</p>
              <a href={c.href} className={styles.docLink}>
                learn more →
              </a>
            </div>
          ))}
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
                      className={i === 4 ? styles.highlightCol : undefined}
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

      {/* ═══════════ PROTOCOL STATE ═══════════ */}
      <section className={styles.section} id="thermo">
        <SectionHead label="live protocol state" color="var(--amber)" />
        <p className={styles.desc}>
          Three thermodynamic signals on-chain. Temperature (τ) from
          attestation variance drives exploratory routing. Virial ratio V
          measures stake-throughput equilibrium. Escrow pressure P tracks
          buffer fill. Together they drive adaptive pricing, demurrage,
          and circuit breakers.
        </p>
        {thermo ? (
          <>
            <div className={styles.stats}>
              <span className={styles.kv}>
                <span className={styles.k}>phase</span>{" "}
                <span className={styles.v}>{thermo.phase}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.k}>τ</span>{" "}
                <span className={styles.v}>{thermo.temperature}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.k}>V</span>{" "}
                <span className={styles.v}>{thermo.virialRatio}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.k}>P</span>{" "}
                <span className={styles.v}>{thermo.escrowPressure}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.k}>δ</span>{" "}
                <span className={styles.v}>{thermo.demurrageRate}%/yr</span>
              </span>
              {thermo.seed && <span className={styles.seedTag}>[seed]</span>}
            </div>
          </>
        ) : (
          <p className={styles.wait}>connecting...</p>
        )}
        <a href="/explainer#thermo" className={styles.docLink}>
          thermodynamic layer →
        </a>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ PROTOCOL — brief ═══════════ */}
      <section className={styles.section}>
        <SectionHead label="the protocol" color="var(--text-dim)" />
        <p className={styles.desc} style={{ maxWidth: 620 }}>
          Built on the Pura protocol (MIT). Backpressure Economics adapts
          congestion control from data networks to monetary flows. Five
          on-chain primitives: declare capacity, verify completions, price
          dynamically, route to spare capacity, buffer overflow.
        </p>
        <div className={styles.heroCtas}>
          <a href="/paper" className={styles.ctaSecondary}>paper →</a>
          <a href="/explainer" className={styles.ctaSecondary}>explainer →</a>
          <a href="/docs" className={styles.ctaSecondary}>docs →</a>
          <a href="https://github.com/puraxyz/puraxyz" target="_blank" rel="noopener noreferrer" className={styles.ctaSecondary}>github →</a>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ═══════════ SERVICE DATA (demoted) ═══════════ */}
      <SectionHead label="live service data" color="var(--text-dim)" />

      <div className={styles.grid}>
        {/* ── left column ── */}
        <div>
          {/* GATEWAY */}
          <section className={styles.section} id="gateway">
            <SectionHead label="llm gateway" color="var(--color-gateway)" />
            {gateway ? (
              <>
                <div className={styles.stats}>
                  <span className={styles.kv}>
                    <span className={styles.k}>keys</span>{" "}
                    <span className={styles.v}>{gateway.keys.total}</span>
                  </span>
                  <span className={styles.kv}>
                    <span className={styles.k}>reqs</span>{" "}
                    <span className={styles.v}>
                      {fmtNum(gateway.keys.totalRequests)}
                    </span>
                  </span>
                  <span className={styles.kv}>
                    <span className={styles.k}>base fee</span>{" "}
                    <span className={styles.v}>{gateway.baseFee}</span>
                  </span>
                  {seed("gateway")}
                </div>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>sink</th>
                      <th>completions</th>
                      <th>units</th>
                      <th>price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateway.sinks
                      .filter((s) => s.configured)
                      .map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td>{fmtNum(s.completions ?? "0")}</td>
                          <td>{s.units ?? "\u2014"}</td>
                          <td>
                            <AsciiBar
                              value={Number(s.price ?? 0)}
                              max={20}
                              width={10}
                              color="var(--color-gateway)"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className={styles.wait}>connecting...</p>
            )}
          </section>

          {/* RELAYS */}
          <section className={styles.section} id="relays">
            <SectionHead label="relay capacity" color="var(--color-relays)" />
            {relays ? (
              <>
                <div className={styles.stats}>
                  <span className={styles.kv}>
                    <span className={styles.k}>total</span>{" "}
                    <span className={styles.v}>{relays.totalRelays}</span>
                  </span>
                  {seed("relays")}
                </div>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>pubkey</th>
                      <th>operator</th>
                      <th>capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relays.relays.map((r) => (
                      <tr key={r.pubkey}>
                        <td className={styles.trunc}>{truncHex(r.pubkey)}</td>
                        <td className={styles.trunc}>{truncHex(r.operator)}</td>
                        <td>
                          <AsciiBar
                            value={Number(r.capacity)}
                            max={1000}
                            width={12}
                            color="var(--color-relays)"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className={styles.wait}>connecting...</p>
            )}
          </section>
        </div>

        {/* ── right column ── */}
        <div>
          {/* LIGHTNING */}
          <section className={styles.section} id="lightning">
            <SectionHead label="lightning routing" color="var(--color-lightning)" />
            {lightning ? (
              <>
                <div className={styles.stats}>
                  <span className={styles.kv}>
                    <span className={styles.k}>nodes</span>{" "}
                    <span className={styles.v}>{lightning.totalNodes}</span>
                  </span>
                  {seed("lightning")}
                </div>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>pubkey</th>
                      <th>capacity</th>
                      <th>fee</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lightning.nodes.map((n) => (
                      <tr key={n.pubkey}>
                        <td className={styles.trunc}>{truncHex(n.pubkey)}</td>
                        <td>{fmtNum(n.capacity)}</td>
                        <td>{n.fee} sat</td>
                        <td>
                          <StatusDot
                            color={n.active ? "var(--green)" : "var(--text-dim)"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className={styles.wait}>connecting...</p>
            )}
          </section>

          {/* AGENTS */}
          <section className={styles.section} id="agents">
            <SectionHead label="agent reputation" color="var(--color-agents)" />
            {agents ? (
              <>
                <div className={styles.stats}>
                  <span className={styles.kv}>
                    <span className={styles.k}>registered</span>{" "}
                    <span className={styles.v}>{agents.totalAgents}</span>
                  </span>
                  {seed("agents")}
                </div>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>reputation</th>
                      <th>completions</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.agents.map((a) => (
                      <tr key={a.id}>
                        <td className={styles.trunc}>{truncHex(a.id)}</td>
                        <td>
                          {a.reputation ? (
                            <AsciiBar
                              value={Number(a.reputation.score)}
                              max={100}
                              width={10}
                              color="var(--color-agents)"
                            />
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td>{a.reputation?.completions ?? "\u2014"}</td>
                        <td>
                          <StatusDot
                            color={
                              a.active ? "var(--green)" : "var(--text-dim)"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className={styles.wait}>connecting...</p>
            )}
          </section>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* ═══════════ ECOSYSTEM ═══════════ */}
      <footer className={styles.ecosystem}>
        <span>The Pura Protocol (MIT)</span>
        <span className={styles.ecosystemSep}>·</span>
        <span>Backpressure Economics</span>
        <span className={styles.ecosystemSep}>·</span>
        <span>Settled via Lightning + Superfluid</span>
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
