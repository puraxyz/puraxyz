import shared from './shared.module.css'
import styles from './LandscapeDiagram.module.css'

const DIMENSIONS = ['Multi-Turn', 'Composition', 'Evidence Chain', 'Agentic Tier', 'Training Export']

const TOOLS = [
    { name: 'ReasoningGym', values: [false, false, false, false, false] },
    { name: 'Zeno', values: [false, false, false, false, false] },
    { name: 'Eval Protocol', values: [true, false, false, false, false] },
    { name: 'PeerBench', values: [false, false, false, false, false] },
    { name: 'vr.dev', values: [true, true, true, true, true], highlight: true },
]

export default function LandscapeDiagram() {
    return (
        <div>
            <p className={shared.diagramTitle}>Verification Landscape Comparison</p>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}></th>
                            {DIMENSIONS.map((d) => (
                                <th key={d} className={styles.th}>{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TOOLS.map((t) => (
                            <tr key={t.name} className={t.highlight ? styles.highlight : ''}>
                                <td className={styles.toolName}>{t.name}</td>
                                {t.values.map((v, i) => (
                                    <td key={i} className={styles.cell}>
                                        {v ? (
                                            <span className={styles.check}>&#10003;</span>
                                        ) : (
                                            <span className={styles.dash}>-</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className={shared.diagramCaption}>
                No existing tool covers the full stack of composable, evidence-backed, training-integrated verification.
            </p>
        </div>
    )
}
