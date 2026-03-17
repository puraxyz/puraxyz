import styles from "./PriceChart.module.css";

interface PriceChartProps {
  data: number[];
}

export function PriceChart({ data }: PriceChartProps) {
  if (data.length < 2) {
    return (
      <div className={styles.wrapper}>
        <h3 className={styles.title}>Base Fee History</h3>
        <div className={styles.empty}>Collecting data…</div>
      </div>
    );
  }

  const W = 400;
  const H = 120;
  const pad = 4;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (W - pad * 2);
      const y = pad + (1 - (v - min) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const latest = data[data.length - 1];
  const formatted =
    latest >= 1e18
      ? (latest / 1e18).toFixed(4)
      : latest >= 1e15
        ? (latest / 1e15).toFixed(1) + "e15"
        : latest.toString();

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Base Fee History</h3>
        <span className={styles.current}>{formatted}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
        <polyline
          points={points}
          fill="none"
          stroke="#d97706"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pad},${H - pad} ${points} ${W - pad},${H - pad}`}
          fill="url(#priceGrad)"
        />
      </svg>
    </div>
  );
}
