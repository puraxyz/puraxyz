"use client";

import Link from "next/link";
import s from "./simulate.module.css";

export default function SimulatePage() {
  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--amber, #d97706)" }}>── SIMULATE</span>
        <hr className={s.rule} />
      </div>

      <div className={s.grid}>
        <Link href="/simulate/benchmark" className={s.card}>
          <div className={s.cardTitle}>benchmark</div>
          <p className={s.cardDesc}>
            4-strategy comparison: Random vs Round-robin vs Centralized LB vs BPE.
            Configurable providers, demand, bursts. Client-side simulation.
          </p>
          <span className={s.cardLink}>run benchmark →</span>
        </Link>
        <Link href="/playground" className={s.card}>
          <div className={s.cardTitle}>playground</div>
          <p className={s.cardDesc}>
            Interactive routing parameter tuning. Adjust how the protocol weights
            capacity vs price signals. Watch routing behavior change in real time.
          </p>
          <span className={s.cardLink}>open playground →</span>
        </Link>
      </div>
    </main>
  );
}
