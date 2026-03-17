import styles from "./AgentCard.module.css";

interface AgentCardProps {
  name: string;
  label: string;
  color: string;
  address: string;
  stake: string;
  capacityCap: string;
  poolUnits: string;
  completionRate: string;
  completions: string;
  queueLoad: string;
  price: string;
  explorerBase: string;
}

function formatBps(bps: string): string {
  return (Number(bps) / 100).toFixed(1) + "%";
}

function formatWei(wei: string): string {
  const n = Number(wei);
  if (n === 0) return "0";
  if (n >= 1e18) return (n / 1e18).toFixed(4);
  return n.toLocaleString();
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function AgentCard({
  name,
  label,
  color,
  address,
  stake,
  capacityCap,
  poolUnits,
  completionRate,
  completions,
  queueLoad,
  price,
  explorerBase,
}: AgentCardProps) {
  const compRate = Number(completionRate);
  const statusColor =
    compRate >= 8000 ? "var(--green)" : compRate >= 5000 ? "var(--yellow)" : "var(--red)";

  return (
    <div className={styles.card} style={{ borderTopColor: color }}>
      <div className={styles.header}>
        <div className={styles.nameRow}>
          <span className={styles.dot} style={{ background: statusColor }} />
          <span className={styles.label}>{label}</span>
        </div>
        <a
          href={`${explorerBase}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.address}
        >
          {shortAddr(address)}
        </a>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Stake</span>
          <span className={styles.statValue}>{formatWei(stake)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Cap</span>
          <span className={styles.statValue}>{capacityCap}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Pool %</span>
          <span className={styles.statValue}>{poolUnits}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Comp</span>
          <span className={styles.statValue}>{formatBps(completionRate)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Tasks</span>
          <span className={styles.statValue}>{completions}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Load</span>
          <span className={styles.statValue}>{queueLoad}</span>
        </div>
      </div>

      <div className={styles.capacityBar}>
        <div
          className={styles.capacityFill}
          style={{
            width: `${Math.min(Number(queueLoad), 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
