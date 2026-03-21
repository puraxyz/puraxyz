import shared from './shared.module.css'
import styles from './RewardHackingDiagram.module.css'

const SOFT_ONLY = [
    { step: 'Agent writes email', status: 'ok' },
    { step: 'LLM judge scores tone: 0.9', status: 'ok' },
    { step: 'Reward: 0.9', status: 'warn' },
    { step: 'But email was never actually sent', status: 'fail' },
]

const GATED = [
    { step: 'Agent writes email', status: 'ok' },
    { step: 'HARD gate: check sent folder', status: 'ok' },
    { step: 'AGENTIC gate: verify recipient inbox', status: 'ok' },
    { step: 'SOFT scorer: tone 0.9', status: 'ok' },
    { step: 'Reward: 0.9 (verified end-to-end)', status: 'pass' },
]

function Row({ step, status }: { step: string; status: string }) {
    return (
        <div className={`${styles.row} ${styles[status]}`}>
            <span className={styles.dot} />
            <span className={styles.text}>{step}</span>
        </div>
    )
}

export default function RewardHackingDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>Why Composition Defeats Reward Hacking</p>
            <div className={styles.comparison}>
                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <span className={styles.headerBad}>Soft-Only Verification</span>
                    </div>
                    {SOFT_ONLY.map((r, i) => <Row key={i} {...r} />)}
                    <div className={styles.verdict + ' ' + styles.verdictBad}>
                        Exploitable: agent learns to game the judge
                    </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <span className={styles.headerGood}>Gated Composition</span>
                    </div>
                    {GATED.map((r, i) => <Row key={i} {...r} />)}
                    <div className={styles.verdict + ' ' + styles.verdictGood}>
                        Verified: hard gates prevent false positives
                    </div>
                </div>
            </div>
            <p className={shared.diagramCaption}>
                Chen et al. (2026) show 27-78% reward corruption in soft-only setups. Hard gating eliminates this class of failure.
            </p>
        </div>
    )
}
