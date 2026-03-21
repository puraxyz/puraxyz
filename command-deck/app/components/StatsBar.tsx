import styles from "./StatsBar.module.css";

interface DeckMetrics {
  contracts: number;
  tests: number;
  efficiency: string;
  gasSavings: string;
  referenceApps: number;
  paperSections: number;
  poolFlowRate?: string;
  activeSinks?: number;
  completionRate?: string;
  live: boolean;
}

export function StatsBar({ metrics }: { metrics: DeckMetrics }) {
  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <div className={styles.label}>Contracts</div>
        <div className={styles.value}>{metrics.contracts}</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.label}>Tests</div>
        <div className={styles.value}>{metrics.tests}</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.label}>Efficiency</div>
        <div className={styles.value}>{metrics.efficiency}</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.label}>Gas savings</div>
        <div className={styles.value}>{metrics.gasSavings}</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.label}>Ref. apps</div>
        <div className={styles.value}>{metrics.referenceApps}</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.label}>Paper</div>
        <div className={styles.value}>{metrics.paperSections}§</div>
      </div>
      {metrics.live && metrics.activeSinks !== undefined && (
        <>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <div className={styles.liveLabel}>Active sinks</div>
            <div className={styles.liveValue}>{metrics.activeSinks}</div>
          </div>
          {metrics.poolFlowRate && (
            <div className={styles.stat}>
              <div className={styles.liveLabel}>Flow rate</div>
              <div className={styles.liveValue}>{metrics.poolFlowRate}</div>
            </div>
          )}
          {metrics.completionRate && (
            <div className={styles.stat}>
              <div className={styles.liveLabel}>Completion</div>
              <div className={styles.liveValue}>{metrics.completionRate}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
