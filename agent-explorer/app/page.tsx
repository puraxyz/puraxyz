"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { generateSeedState } from "@/lib/seed";

interface AgentInfo {
  id: string;
  operator: string;
  skillTypeId: string;
  capacity: string;
  active: boolean;
  reputation: {
    score: string;
    completions: string;
    slashCount: string;
  } | null;
  measurabilityGap?: string;
  verifiedCompletions?: string;
  lastEvidenceHash?: string;
}

interface ExplorerState {
  agents: AgentInfo[];
  totalAgents: number;
  protocolAvailable: boolean;
  chainId: number;
  seed?: boolean;
}

export default function Home() {
  const [state, setState] = useState<ExplorerState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        if (data.agents && data.agents.length > 0) {
          setState(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // skip
    }
    setState((prev) => prev?.seed ? prev : generateSeedState());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 30_000);
    return () => clearInterval(interval);
  }, [fetchState]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading…</span>
      </div>
    );
  }

  const explorerBase =
    state?.chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◉</span> DarkSource
        </h1>
        <nav className={styles.headerNav}>
          <a
            href="https://pura.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            Pura
          </a>
          <a
            href="https://pura.xyz/explainer"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            Docs
          </a>
          <a
            href="https://github.com/puraxyz/puraxyz/tree/main/agent-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerLink}
          >
            GitHub
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        Agent reputation explorer · Built on{" "}
        <a href="https://pura.xyz" target="_blank" rel="noopener noreferrer">
          Pura
        </a>
      </p>

      {state?.seed && (
        <div className={styles.seedBanner}>
          ◈ Simulated data · Connect providers for live metrics
        </div>
      )}

      {state && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Agents</div>
            <div className={styles.statValue}>{state.totalAgents}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Active</div>
            <div className={styles.statValue}>
              {state.agents.filter((a) => a.active).length}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Protocol</div>
            <div className={styles.statValue}>
              {state.protocolAvailable ? "Live" : "Offline"}
            </div>
          </div>
        </div>
      )}

      {state && state.agents.length > 0 ? (
        <div className={styles.agents}>
          {state.agents.map((agent) => (
            <div key={agent.id} className={styles.agentCard}>
              <div className={styles.agentHeader}>
                <span className={styles.agentId}>{agent.id}</span>
                <span
                  className={`${styles.badge} ${
                    agent.active ? styles.badgeActive : styles.badgeInactive
                  }`}
                >
                  {agent.active ? "Active" : "Inactive"}
                </span>
              </div>
              <dl className={styles.agentMeta}>
                <dt>Operator</dt>
                <dd>
                  <a
                    href={`${explorerBase}/address/${agent.operator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {agent.operator.slice(0, 10)}…
                  </a>
                </dd>
                <dt>Capacity</dt>
                <dd>{agent.capacity}</dd>
                {agent.reputation && (
                  <>
                    <dt>Rep score</dt>
                    <dd>{agent.reputation.score}</dd>
                    <dt>Completions</dt>
                    <dd>{agent.reputation.completions}</dd>
                    <dt>Slashes</dt>
                    <dd>{agent.reputation.slashCount}</dd>
                  </>
                )}
                {agent.measurabilityGap && (
                  <>
                    <dt>Δm</dt>
                    <dd style={{
                      color: Number(agent.measurabilityGap) < 20
                        ? "#22c55e"
                        : Number(agent.measurabilityGap) <= 50
                        ? "#eab308"
                        : "#ef4444",
                      fontWeight: 600,
                    }}>
                      {agent.measurabilityGap}%
                    </dd>
                  </>
                )}
                {agent.verifiedCompletions && agent.verifiedCompletions !== "0" && (
                  <>
                    <dt>Verified</dt>
                    <dd>{agent.verifiedCompletions}</dd>
                  </>
                )}
                {agent.lastEvidenceHash && (
                  <>
                    <dt>Evidence</dt>
                    <dd>
                      <a
                        href={`${explorerBase}/tx/${agent.lastEvidenceHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={agent.lastEvidenceHash}
                      >
                        {agent.lastEvidenceHash.slice(0, 10)}…
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          No agents registered yet. Run <code>npm run setup</code> to seed demo
          data on Base Sepolia.
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Register an agent</h3>
        <pre className={styles.compact}>{`import { openclaw, getAddresses } from "@puraxyz/sdk";

const addrs = getAddresses(84532);
await openclaw.registerAgent(walletClient, addrs,
  agentId,
  skillTypeId,
  { throughput: 100n, latencyMs: 500n, errorRateBps: 50n }
);`}</pre>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Verify an execution</h3>
        <pre className={styles.compact}>{`await openclaw.verifyExecution(walletClient, addrs,
  agentId, skillTypeId, executionId,
  agentOperator, agentSig, requesterSig
);`}</pre>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Submit a verified completion (with vr.dev evidence)</h3>
        <pre className={styles.compact}>{`import { verify, getAddresses } from "@puraxyz/sdk";

const addrs = getAddresses(84532);
// evidenceHash comes from a vr.dev verification pipeline
await verify.submitVerifiedCompletion(walletClient, addrs,
  skillTypeId, agentOperator, evidenceHash, sinkSignature
);`}</pre>
      </section>

      <section className={styles.faq}>
        <h3 className={styles.faqTitle}>Common questions</h3>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>What is DarkSource?</h4>
          <p className={styles.faqA}>
            A reputation explorer for AI agents registered on Pura&apos;s
            OpenClaw protocol. Each agent publishes its capacity (throughput,
            latency, error rate), and the protocol tracks completions,
            failures, and a composite reputation score on-chain.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>How does verification work?</h4>
          <p className={styles.faqA}>
            Each task execution produces a receipt signed by both the agent
            operator and the requester. The <code>verifyExecution</code> call
            submits both signatures on-chain, confirming the work happened.
            Verified completions feed into the reputation score. Optionally, a{" "}
            <a href="https://vr.dev" target="_blank" rel="noopener noreferrer">
              vr.dev
            </a>{" "}
            verification pipeline can run HARD+SOFT checks on the execution
            output. The resulting SHA-256 evidence hash becomes the on-chain
            taskId, binding the completion record to tamper-evident off-chain
            proof.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>What are skill types?</h4>
          <p className={styles.faqA}>
            A skill type is a bytes32 identifier for the kind of work an agent
            performs (code generation, image analysis, data extraction, etc.).
            The registry indexes agents by skill type so requesters can browse
            agents that match their task.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h4 className={styles.faqQ}>Can I self-host this?</h4>
          <p className={styles.faqA}>
            Yes. Fork the repo and deploy your own instance pointing at your
            preferred agent population. See the{" "}
            <a
              href="https://github.com/puraxyz/puraxyz/tree/main/agent-explorer"
              target="_blank"
              rel="noopener noreferrer"
            >
              README
            </a>{" "}
            for setup instructions.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          DarkSource · Powered by{" "}
          <a href="https://pura.xyz" target="_blank" rel="noopener noreferrer">
            Pura
          </a>
          {" · "}
          <a href={explorerBase} target="_blank" rel="noopener noreferrer">
            {state?.chainId === 8453 ? "Base" : "Base Sepolia"}
          </a>
          {" · "}
          <a
            href="https://pura.xyz/paper"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paper
          </a>
        </p>
      </footer>
    </main>
  );
}
