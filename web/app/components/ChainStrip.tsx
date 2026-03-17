"use client";

import { useEffect, useState } from "react";
import styles from "./ChainStrip.module.css";

interface ChainData {
  blockNumber: number;
  contracts: number;
  tests: number;
  network: string;
}

const FALLBACK: ChainData = {
  blockNumber: 0,
  contracts: 17,
  tests: 125,
  network: "Base Sepolia",
};

export default function ChainStrip() {
  const [data, setData] = useState<ChainData>(FALLBACK);

  useEffect(() => {
    fetch("/api/chain")
      .then((r) => (r.ok ? r.json() : FALLBACK))
      .then((d: ChainData) => setData(d))
      .catch(() => setData(FALLBACK));
  }, []);

  const fmt = (n: number) =>
    n > 0 ? n.toLocaleString("en-US") : "—";

  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        <div className={styles.item}>
          <span className={styles.dot} />
          <span className={styles.label}>{data.network}</span>
        </div>
        <span className={styles.sep} />
        <div className={styles.item}>
          <span className={styles.label}>Block</span>
          <span className={styles.value}>{fmt(data.blockNumber)}</span>
        </div>
        <span className={styles.sep} />
        <div className={styles.item}>
          <span className={styles.label}>Contracts</span>
          <span className={styles.value}>{data.contracts}</span>
        </div>
        <span className={styles.sep} />
        <div className={styles.item}>
          <span className={styles.label}>Tests</span>
          <span className={styles.value}>{data.tests} passing</span>
        </div>
      </div>
    </div>
  );
}
