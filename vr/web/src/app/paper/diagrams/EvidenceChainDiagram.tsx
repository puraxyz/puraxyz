import shared from './shared.module.css'
import styles from './EvidenceChainDiagram.module.css'

const CHAIN = [
    {
        label: 'VerificationResult',
        detail: 'outcome, score, rationale, artifacts[]',
        color: '#8b5cf6',
    },
    {
        label: 'SHA-256 Hash',
        detail: 'Deterministic content-addressed digest of result payload',
        color: '#f59e0b',
    },
    {
        label: 'Append-Only Log',
        detail: 'Merkle-chained sequence. Each entry references previous hash.',
        color: '#22c55e',
    },
    {
        label: 'Audit Trail',
        detail: 'Tamper-evident. Any modification breaks the hash chain.',
        color: '#22c55e',
    },
]

export default function EvidenceChainDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>Evidence and Tamper-Evidence Pipeline</p>
            <div className={styles.chain}>
                {CHAIN.map((c, i) => (
                    <div key={i} className={styles.nodeWrap}>
                        {i > 0 && (
                            <div className={styles.connector}>
                                <svg width="16" height="24" viewBox="0 0 16 24">
                                    <path d="M8 0 L8 16 M4 12 L8 16 L12 12" stroke="var(--color-text-dim)" fill="none" strokeWidth="1.5" />
                                </svg>
                            </div>
                        )}
                        <div className={styles.node} style={{ borderColor: c.color }}>
                            <div className={styles.nodeLabel} style={{ color: c.color }}>{c.label}</div>
                            <div className={styles.nodeDetail}>{c.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.schema}>
                <div className={styles.schemaTitle}>VerificationResult Schema</div>
                <pre className={styles.code}>{`{
  "outcome": "PASS" | "FAIL" | "PARTIAL",
  "score": 0.0 - 1.0,
  "rationale": "Human-readable explanation",
  "artifacts": ["screenshot.png", "dom_snapshot.json"],
  "hash": "sha256:ab3f..."
}`}</pre>
            </div>
            <p className={shared.diagramCaption}>
                Every verification produces a tamper-evident evidence record. The Merkle chain ensures post-hoc auditing can detect tampering.
            </p>
        </div>
    )
}
