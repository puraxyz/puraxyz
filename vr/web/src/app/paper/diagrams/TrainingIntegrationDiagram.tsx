import shared from './shared.module.css'
import styles from './TrainingIntegrationDiagram.module.css'

const FLOW = [
    { label: 'Task Fixture', section: 'registry', detail: 'Environment + verifier spec from registry' },
    { label: 'Agent Rollout', section: 'runtime', detail: 'Agent attempts the task in sandboxed environment' },
    { label: 'Verifier Pipeline', section: 'runtime', detail: 'Composed verifiers produce VerificationResult' },
    { label: 'Reward Signal', section: 'export', detail: 'Scalar reward + evidence metadata' },
    { label: 'TRL / VERL / OpenClaw', section: 'training', detail: 'Standard RLVR training frameworks consume reward' },
]

export default function TrainingIntegrationDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>Training Loop Integration</p>
            <div className={styles.flow}>
                {FLOW.map((f, i) => (
                    <div key={i} className={styles.stepWrap}>
                        {i > 0 && (
                            <div className={styles.arrow}>
                                <svg width="16" height="20" viewBox="0 0 16 20">
                                    <path d="M8 0 L8 14 M4 10 L8 14 L12 10" stroke="var(--color-text-dim)" fill="none" strokeWidth="1.5" />
                                </svg>
                            </div>
                        )}
                        <div className={`${styles.step} ${styles[f.section]}`}>
                            <div className={styles.sectionTag}>{f.section}</div>
                            <div className={styles.stepLabel}>{f.label}</div>
                            <div className={styles.stepDetail}>{f.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.sdkNote}>
                <span className={styles.sdkLabel}>SDK</span>
                <span className={styles.sdkText}>
                    Python SDK wraps the full pipeline. One call: <code>vr.verify(task, trajectory)</code> returns a reward-ready result.
                </span>
            </div>
            <p className={shared.diagramCaption}>
                Verifiers slot into existing RLVR training loops as drop-in reward functions with full evidence provenance.
            </p>
        </div>
    )
}
