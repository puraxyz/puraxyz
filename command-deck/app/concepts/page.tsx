"use client";

import { useState, useMemo } from "react";
import { concepts } from "@/lib/concepts";
import { ConceptCard } from "../components/BriefingCard";
import styles from "./page.module.css";

export default function ConceptsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return concepts;
    const q = search.toLowerCase();
    return concepts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.elevator.toLowerCase().includes(q) ||
        c.detail.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◇</span> Concepts
        </h1>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>
            Briefings
          </a>
          <a href="/objections" className={styles.navLink}>
            Objections
          </a>
        </nav>
      </header>

      <p className={styles.subtitle}>
        The technical concepts behind Backproto, explained at three levels of
        depth
      </p>

      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search concepts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.cards}>
        {filtered.map((c) => (
          <ConceptCard key={c.id} concept={c} />
        ))}
        {filtered.length === 0 && (
          <p className={styles.empty}>No concepts match your search.</p>
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
