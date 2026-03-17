import styles from "./StatusBar.module.css";

interface StatusBarProps {
  phase: string;
  tickNumber: number;
  tickInPhase: number;
  flowRate: string;
  baseFee: string;
  agentCount: number;
  flowRateMultiplier: number;
}

const PHASE_COLORS: Record<string, string> = {
  RAMP: "#22c55e",
  STEADY: "#3b82f6",
  SPIKE: "#eab308",
  SHOCK: "#ef4444",
  RECOVER: "#8b5cf6",
};

function formatWei(wei: string): string {
  const n = Number(wei);
  if (n === 0) return "0";
  if (n >= 1e18) return (n / 1e18).toFixed(4);
  if (n >= 1e15) return (n / 1e15).toFixed(1) + "e15";
  return n.toLocaleString();
}

export function StatusBar({
  phase,
  tickNumber,
  tickInPhase,
  flowRate,
  baseFee,
  agentCount,
  flowRateMultiplier,
}: StatusBarProps) {
  const phaseColor = PHASE_COLORS[phase] ?? "#a1a1aa";
  const utilization = Math.round(flowRateMultiplier * 100);

  return (
    <div className={styles.bar}>
      <div className={styles.item}>
        <span className={styles.label}>Phase</span>
        <span className={styles.badge} style={{ borderColor: phaseColor, color: phaseColor }}>
          {phase}
        </span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Tick</span>
        <span className={styles.value}>{tickNumber}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Flow Rate</span>
        <span className={styles.value}>{formatWei(flowRate)}/s</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Base Fee</span>
        <span className={styles.value}>{formatWei(baseFee)}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Utilization</span>
        <span className={styles.value}>{utilization}%</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Agents</span>
        <span className={styles.value}>{agentCount}</span>
      </div>
    </div>
  );
}
