"use client";

import { useState } from "react";
import type { Briefing, Concept, Objection } from "@/lib/types";
import styles from "./BriefingCard.module.css";

// ── Briefing card ────────────────────────────────────────────────

export function BriefingCard({ card }: { card: Briefing }) {
  const [depth, setDepth] = useState<0 | 1 | 2>(0);

  function cycle() {
    setDepth((d) => ((d + 1) % 3) as 0 | 1 | 2);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const depthLabels = ["headline", "elevator", "detail"] as const;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={cycle}>
        <h3 className={styles.cardTitle}>{card.title}</h3>
        <span className={styles.depthTag}>{depthLabels[depth]}</span>
      </div>

      <div className={styles.audiences}>
        {card.audiences.map((a) => (
          <span key={a} className={styles.tag}>
            {a}
          </span>
        ))}
      </div>

      <p className={styles.headline}>{card.headline}</p>

      {depth >= 1 && (
        <div className={styles.expanded}>
          <p className={styles.elevator}>{card.elevator}</p>
        </div>
      )}

      {depth >= 2 && (
        <div className={styles.expanded}>
          <p className={styles.detail}>{card.detail}</p>
          {card.sources.length > 0 && (
            <div className={styles.sources}>
              {card.sources.map((s) => (
                <span key={s} className={styles.source}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.copyBtn}
          onClick={() => copy(card.headline)}
          title="Copy headline"
        >
          Copy headline
        </button>
        <button
          className={styles.copyBtn}
          onClick={() => copy(card.elevator)}
          title="Copy elevator"
        >
          Copy elevator
        </button>
        <button className={styles.expandBtn} onClick={cycle}>
          {depth < 2 ? "More depth ↓" : "Collapse ↑"}
        </button>
      </div>
    </div>
  );
}

// ── Concept card ─────────────────────────────────────────────────

export function ConceptCard({ concept }: { concept: Concept }) {
  const [depth, setDepth] = useState<0 | 1 | 2>(0);

  function cycle() {
    setDepth((d) => ((d + 1) % 3) as 0 | 1 | 2);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const depthLabels = ["headline", "elevator", "detail"] as const;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={cycle}>
        <h3 className={styles.cardTitle}>{concept.title}</h3>
        <span className={styles.depthTag}>{depthLabels[depth]}</span>
      </div>

      <p className={styles.headline}>{concept.headline}</p>

      {depth >= 1 && (
        <div className={styles.expanded}>
          <p className={styles.elevator}>{concept.elevator}</p>
        </div>
      )}

      {depth >= 2 && (
        <div className={styles.expanded}>
          <p className={styles.detail}>{concept.detail}</p>
          {concept.sources.length > 0 && (
            <div className={styles.sources}>
              {concept.sources.map((s) => (
                <span key={s} className={styles.source}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.copyBtn}
          onClick={() => copy(concept.headline)}
          title="Copy headline"
        >
          Copy headline
        </button>
        <button
          className={styles.copyBtn}
          onClick={() => copy(concept.elevator)}
          title="Copy elevator"
        >
          Copy elevator
        </button>
        <button className={styles.expandBtn} onClick={cycle}>
          {depth < 2 ? "More depth ↓" : "Collapse ↑"}
        </button>
      </div>
    </div>
  );
}

// ── Objection card ───────────────────────────────────────────────

export function ObjectionCard({ objection }: { objection: Objection }) {
  const [open, setOpen] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={() => setOpen(!open)}>
        <h3 className={styles.challenge}>{objection.challenge}</h3>
        <span className={styles.depthTag}>{open ? "−" : "+"}</span>
      </div>

      {open && (
        <div className={styles.expanded}>
          <p className={styles.elevator}>{objection.response}</p>
          <p className={styles.detail}>{objection.evidence}</p>
          {objection.sources.length > 0 && (
            <div className={styles.sources}>
              {objection.sources.map((s) => (
                <span key={s} className={styles.source}>
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.copyBtn}
              onClick={() => copy(objection.response)}
            >
              Copy response
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
