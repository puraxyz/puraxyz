import shared from './shared.module.css'
import styles from './TimelineDiagram.module.css'

const MILESTONES = [
    { date: 'Nov 2024', label: 'Tulu 3', detail: 'RLVR operationalized as standard post-training', color: '#8b5cf6' },
    { date: 'Jan 2025', label: 'DeepSeek-R1', detail: 'Pure RL on verifiable rewards produces emergent reasoning', color: '#8b5cf6' },
    { date: 'Apr 2025', label: 'RAGEN', detail: 'Step-level rewards essential for multi-turn agent RL', color: '#a855f7' },
    { date: 'Jun 2025', label: 'Spurious Rewards', detail: 'Random rewards match ground-truth gains under GRPO', color: '#ef4444' },
    { date: 'Feb 2026', label: 'VAGEN', detail: 'Agentic verifiers outperform actors by 27 points', color: '#a855f7' },
    { date: 'Mar 2026', label: 'vr.dev', detail: 'Open registry for composable agent verification', color: '#22c55e' },
]

export default function TimelineDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>The RLVR Verification Timeline</p>
            <div className={styles.timeline}>
                <div className={styles.line} />
                {MILESTONES.map((m, i) => (
                    <div key={i} className={styles.milestone}>
                        <div className={styles.dot} style={{ background: m.color, boxShadow: `0 0 12px ${m.color}40` }} />
                        <div className={styles.card}>
                            <span className={styles.date}>{m.date}</span>
                            <span className={styles.label}>{m.label}</span>
                            <span className={styles.detail}>{m.detail}</span>
                        </div>
                    </div>
                ))}
            </div>
            <p className={shared.diagramCaption}>
                Key milestones in the shift from academic reasoning verification to real-world agent verification.
            </p>
        </div>
    )
}
