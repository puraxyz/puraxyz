"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { briefings } from "@/lib/briefings";
import { StatsBar } from "./components/StatsBar";
import { BriefingCard } from "./components/BriefingCard";
import type { Audience, Scenario } from "@/lib/types";
import { AUDIENCE_LABELS, SCENARIO_LABELS } from "@/lib/types";
import styles from "./page.module.css";

const ALL_AUDIENCES = Object.keys(AUDIENCE_LABELS) as Audience[];
const ALL_SCENARIOS = Object.keys(SCENARIO_LABELS) as Scenario[];

interface LiveState {
  activeSinks?: number;
  poolFlowRate?: string;
  completionRate?: string;
}

export default function Home() {
  const [audience, setAudience] = useState<Audience | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [search, setSearch] = useState("");
  const [live, setLive] = useState<LiveState>({});

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setLive(data);
      }
    } catch {
      // no chain data available
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 60_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const filtered = useMemo(() => {
    let cards = briefings;
    if (audience) {
      cards = cards.filter((c) => c.audiences.includes(audience));
    }
    if (scenario) {
      cards = cards.filter((c) => c.scenarios.includes(scenario));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          c.elevator.toLowerCase().includes(q) ||
          c.detail.toLowerCase().includes(q)
      );
    }
    return cards;
  }, [audience, scenario, search]);

  const metrics = {
    contracts: 22,
    tests: 213,
    efficiency: "95.7%",
    gasSavings: "83.5%",
    referenceApps: 5,
    paperSections: 14,
    activeSinks: live.activeSinks,
    poolFlowRate: live.poolFlowRate,
    completionRate: live.completionRate,
    live: live.activeSinks !== undefined,
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◇</span> Command Deck
        </h1>
        <nav className={styles.nav}>
          <a href="/concepts" className={styles.navLink}>
            Concepts
          </a>
          <a href="/objections" className={styles.navLink}>
            Objections
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        Briefing cards for pitching, defending, and selling Backproto
      </p>

      <StatsBar metrics={metrics} />

      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search cards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(audience || scenario || search) && (
          <button
            className={styles.clearBtn}
            onClick={() => {
              setAudience(null);
              setScenario(null);
              setSearch("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Audience</span>
          <div className={styles.pills}>
            {ALL_AUDIENCES.map((a) => (
              <button
                key={a}
                className={`${styles.pill} ${audience === a ? styles.pillActive : ""}`}
                onClick={() => setAudience(audience === a ? null : a)}
              >
                {AUDIENCE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Scenario</span>
          <div className={styles.pills}>
            {ALL_SCENARIOS.map((s) => (
              <button
                key={s}
                className={`${styles.pill} ${scenario === s ? styles.pillActive : ""}`}
                onClick={() => setScenario(scenario === s ? null : s)}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={styles.count}>
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
      </div>

      <div className={styles.cards}>
        {filtered.map((card) => (
          <BriefingCard key={card.id} card={card} />
        ))}
        {filtered.length === 0 && (
          <p className={styles.empty}>No cards match the current filters.</p>
        )}
      </div>

      <footer className={styles.footer}>
        <p>
          Command Deck · Private briefing tool ·{" "}
          <a href="https://backproto.io" target="_blank" rel="noopener noreferrer">
            backproto.io
          </a>
        </p>
      </footer>
    </main>
  );
}
