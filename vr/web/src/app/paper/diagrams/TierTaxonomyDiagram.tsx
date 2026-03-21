import shared from './shared.module.css'
import styles from './TierTaxonomyDiagram.module.css'

const TIERS = [
    {
        tier: 'HARD',
        color: '#22c55e',
        subtitle: 'Deterministic State Checks',
        mechanic: 'Binary pass/fail. No LLM in the loop.',
        source: 'tau-bench, OSWorld',
        examples: ['Database state comparison', 'Test suite exit codes', 'File content hashes', 'Git log inspection'],
        guarantee: 'Immune to reward hacking by construction',
    },
    {
        tier: 'SOFT',
        color: '#f59e0b',
        subtitle: 'Rubric-Based LLM Judges',
        mechanic: 'Probabilistic 0.0-1.0 scoring against rubric criteria.',
        source: 'Simonds, RLVRR',
        examples: ['Email tone analysis', 'Summary faithfulness', 'Code logic review', 'Content quality scoring'],
        guarantee: 'Generator-verifier gap ensures judge > agent',
    },
    {
        tier: 'AGENTIC',
        color: '#8b5cf6',
        subtitle: 'Agent-Driven Probing',
        mechanic: 'Secondary agent interacts with environment to verify.',
        source: 'VAGEN',
        examples: ['Browser DOM inspection', 'Email client navigation', 'API probing sequences', 'Multi-step UI verification'],
        guarantee: 'Catches latent state invisible to passive observers',
    },
]

export default function TierTaxonomyDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>The Three-Tier Verification Taxonomy</p>
            <div className={styles.grid}>
                {TIERS.map((t) => (
                    <div key={t.tier} className={styles.card} style={{ borderTopColor: t.color }}>
                        <div className={styles.tierBadge} style={{ color: t.color }}>{t.tier}</div>
                        <div className={styles.subtitle}>{t.subtitle}</div>
                        <p className={styles.mechanic}>{t.mechanic}</p>
                        <div className={styles.examples}>
                            {t.examples.map((e, i) => (
                                <span key={i} className={styles.example}>{e}</span>
                            ))}
                        </div>
                        <div className={styles.guarantee}>{t.guarantee}</div>
                        <div className={styles.source}>Source: {t.source}</div>
                    </div>
                ))}
            </div>
            <p className={shared.diagramCaption}>
                Each tier addresses a fundamentally different verification problem with different guarantees.
            </p>
        </div>
    )
}
