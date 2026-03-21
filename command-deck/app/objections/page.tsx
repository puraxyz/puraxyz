"use client";

import { useState, useMemo } from "react";
import { objections } from "@/lib/objections";
import { ObjectionCard } from "../components/BriefingCard";
import styles from "./page.module.css";

export default function ObjectionsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return objections;
    const q = search.toLowerCase();
    return objections.filter(
      (o) =>
        o.challenge.toLowerCase().includes(q) ||
        o.response.toLowerCase().includes(q) ||
        o.evidence.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◇</span> Objection bank
        </h1>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>
            Briefings
          </a>
          <a href="/concepts" className={styles.navLink}>
            Concepts
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        Common pushbacks with evidence-backed responses
      </p>

      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search objections…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.cards}>
        {filtered.map((o) => (
          <ObjectionCard key={o.id} objection={o} />
        ))}
        {filtered.length === 0 && (
          <p className={styles.empty}>No objections match your search.</p>
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
