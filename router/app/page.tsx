"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { Ticker } from "./components/Ticker";
import { AgentCard } from "./components/AgentCard";
import { FlowChart } from "./components/FlowChart";
import { PriceChart } from "./components/PriceChart";
import { StatusBar } from "./components/StatusBar";

interface AgentState {
  address: string;
  stake: string;
  capacityCap: string;
  poolUnits: string;
  completionRate: string;
  completions: string;
  queueLoad: string;
  price: string;
}

interface RouterState {
  tickNumber: number;
  phase: string;
  tickInPhase: number;
  flowRateMultiplier: number;
  baseFee: string;
  flowRate: string;
  agents: Record<string, AgentState>;
  poolAddress: string | null;
  chainId: number;
  blockNumber: string;
}

interface TickEvent {
  ts: number;
  agent: string;
  action: string;
  txHash?: string;
}

const AGENT_META: Record<string, { label: string; color: string }> = {
  atlas: { label: "Atlas", color: "#22c55e" },
  beacon: { label: "Beacon", color: "#3b82f6" },
  cipher: { label: "Cipher", color: "#ef4444" },
  dispatch: { label: "Dispatch", color: "#d97706" },
  system: { label: "System", color: "#a1a1aa" },
};

export default function Dashboard() {
  const [state, setState] = useState<RouterState | null>(null);
  const [events, setEvents] = useState<TickEvent[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const data: RouterState = await res.json();
      setState(data);

      // Append baseFee to price history (keep last 100)
      setPriceHistory((prev) => {
        const next = [...prev, Number(data.baseFee)];
        return next.slice(-100);
      });
    } catch {
      // Network error — skip
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 15_000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchState]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Connecting to Base…</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.loading}>
        <span>Failed to load state. Check RPC connection.</span>
      </div>
    );
  }

  const explorerBase =
    state.chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◆</span> Backproto Router
        </h1>
        <a
          href="https://github.com/backproto/backproto/tree/main/router"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          GitHub
        </a>
      </header>

      <StatusBar
        phase={state.phase}
        tickNumber={state.tickNumber}
        tickInPhase={state.tickInPhase}
        flowRate={state.flowRate}
        baseFee={state.baseFee}
        agentCount={Object.keys(state.agents).length}
        flowRateMultiplier={state.flowRateMultiplier}
      />

      <div className={styles.grid}>
        <section className={styles.agents}>
          {(["atlas", "beacon", "cipher"] as const).map((name) => {
            const agent = state.agents[name];
            if (!agent) return null;
            return (
              <AgentCard
                key={name}
                name={name}
                label={AGENT_META[name].label}
                color={AGENT_META[name].color}
                address={agent.address}
                stake={agent.stake}
                capacityCap={agent.capacityCap}
                poolUnits={agent.poolUnits}
                completionRate={agent.completionRate}
                completions={agent.completions}
                queueLoad={agent.queueLoad}
                price={agent.price}
                explorerBase={explorerBase}
              />
            );
          })}
        </section>

        <section className={styles.charts}>
          <FlowChart
            agents={state.agents}
            flowRate={state.flowRate}
            agentMeta={AGENT_META}
          />
          <PriceChart data={priceHistory} />
        </section>
      </div>

      <Ticker events={events} agentMeta={AGENT_META} explorerBase={explorerBase} />
    </main>
  );
}
