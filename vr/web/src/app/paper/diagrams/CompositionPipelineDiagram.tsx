import shared from './shared.module.css'
import styles from './CompositionPipelineDiagram.module.css'

const STAGES = [
    { label: 'Task Fixture', type: 'fixture', detail: 'Defines environment, agent instructions, and expected outcomes' },
    { label: 'HARD Gate', type: 'hard', detail: 'Binary state check: DB row? File exists? Test passes?', gate: true },
    { label: 'AGENTIC Gate', type: 'agentic', detail: 'Agent probes environment: DOM state, email sent, API response', gate: true },
    { label: 'SOFT Scorer', type: 'soft', detail: 'LLM judge rates tone, faithfulness, logic (0.0-1.0)' },
    { label: 'Aggregation', type: 'aggregate', detail: 'IF any gate = FAIL → 0. ELSE weighted average of soft scores.' },
    { label: 'Reward Signal', type: 'reward', detail: 'Final scalar sent to training loop with full evidence chain' },
]

export default function CompositionPipelineDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>Verifier Composition Pipeline</p>
            <div className={styles.pipeline}>
                {STAGES.map((s, i) => (
                    <div key={i} className={styles.stageWrap}>
                        {i > 0 && (
                            <div className={styles.arrow}>
                                {s.gate && <span className={styles.gateLabel}>fail_closed</span>}
                                <svg width="20" height="20" viewBox="0 0 20 20">
                                    <path d="M4 10 L16 10 M12 6 L16 10 L12 14" stroke="var(--color-text-dim)" fill="none" strokeWidth="1.5" />
                                </svg>
                            </div>
                        )}
                        <div className={`${styles.stage} ${styles[s.type]}`}>
                            <div className={styles.stageLabel}>{s.label}</div>
                            <div className={styles.stageDetail}>{s.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
            <p className={shared.diagramCaption}>
                Hard gates enforce pass/fail before soft scorers run. A single gate failure short-circuits the entire pipeline to zero reward.
            </p>
        </div>
    )
}
