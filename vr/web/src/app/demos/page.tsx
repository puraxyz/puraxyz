'use client'

import Link from 'next/link'
import { LuArrowRight, LuShield, LuCode, LuGlobe, LuChartBar } from 'react-icons/lu'
import styles from './page.module.css'

const DEMOS = [
    {
        id: 'support-ops',
        icon: <LuShield size={24} />,
        title: 'Retail Support-Ops',
        subtitle: 'cancel → refund → inventory',
        description:
            'Three HARD verifiers composed with fail-closed policy verify that an AI agent actually cancelled the order, processed the refund, and updated inventory.',
        verifiers: ['tau2.retail.order_cancelled', 'tau2.retail.refund_processed', 'tau2.retail.inventory_updated'],
        passOutput: `Verdict:  PASS
Score:    1.00
Breakdown:
  order_cancelled/status_match:   1.0
  order_cancelled/reason_match:   1.0
  refund_processed/status_match:  1.0
  refund_processed/amount_match:  1.0
  inventory_updated/quantity_match: 1.0
  inventory_updated/warehouse_match: 1.0`,
        failOutput: `Verdict:  FAIL
Score:    0.00
  ⚠ Hard gate triggered
  order still active, refund pending, inventory wrong`,
    },
    {
        id: 'code-agent',
        icon: <LuCode size={24} />,
        title: 'Code Agent',
        subtitle: 'lint → test → commit',
        description:
            'Verifies an AI agent that writes Python: lint with ruff (zero violations), tests with pytest, and a git commit. All three are HARD verifiers - one failure gates the episode.',
        verifiers: ['code.python.lint_ruff', 'code.python.tests_pass', 'git.commit_present'],
        passOutput: `Verdict:  PASS
Score:    1.00
Breakdown:
  lint_ruff/violation_count: 0
  tests_pass/pass_ratio: 1.0
  commit_present/message_match: 1.0`,
        failOutput: `Verdict:  FAIL
Score:    0.00
  ⚠ Hard gate triggered - 3 unused imports
  Tests passed, but lint failure gates the whole episode`,
    },
    {
        id: 'browser-agent',
        icon: <LuGlobe size={24} />,
        title: 'E-commerce Browser Agent',
        subtitle: 'order placed → refund processed',
        description:
            'Cross-domain composition: a WebArena-style order verifier plus a τ²-bench refund verifier. Catches agents that claim "order placed" when it was actually cancelled.',
        verifiers: ['web.ecommerce.order_placed', 'tau2.retail.refund_processed'],
        passOutput: `Verdict:  PASS
Score:    1.00
Breakdown:
  order_placed/order_found:  1.0
  order_placed/items_match:  1.0
  order_placed/total_match:  1.0
  refund_processed/status_match: 1.0
  refund_processed/amount_match: 1.0`,
        failOutput: `Verdict:  FAIL
Score:    0.00
  ⚠ Hard gate triggered - order cancelled + refund denied`,
    },
]

export default function DemosPage() {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Demos</h1>
                <p>
                    Self-contained examples showing vrdev&apos;s verifiable-rewards pipeline.
                    Each demo embeds its own mock server - no external services required.
                </p>
                <code className={styles.installCmd}>pip install vrdev</code>
            </div>

            <div className={styles.demoList}>
                {DEMOS.map((demo) => (
                    <div key={demo.id} className={styles.demoCard}>
                        <div className={styles.demoHeader}>
                            <div className={styles.demoIcon}>{demo.icon}</div>
                            <div>
                                <h2>{demo.title}</h2>
                                <span className={styles.demoSubtitle}>{demo.subtitle}</span>
                            </div>
                        </div>
                        <p className={styles.demoDesc}>{demo.description}</p>
                        <div className={styles.verifierTags}>
                            {demo.verifiers.map((v) => (
                                <span key={v} className={styles.verifierTag}>
                                    {v}
                                </span>
                            ))}
                        </div>
                        <div className={styles.terminalPair}>
                            <div className={styles.terminal}>
                                <div className={styles.terminalBar}>
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalTitle}>✓ Pass</span>
                                </div>
                                <pre>{demo.passOutput}</pre>
                            </div>
                            <div className={`${styles.terminal} ${styles.terminalFail}`}>
                                <div className={styles.terminalBar}>
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalDot} />
                                    <span className={styles.terminalTitle}>✗ Fail</span>
                                </div>
                                <pre>{demo.failOutput}</pre>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Benchmark highlight */}
            <div className={styles.benchmarkCard}>
                <div className={styles.benchmarkIcon}>
                    <LuChartBar size={28} />
                </div>
                <h2>Benchmark: Soft-Only vs Hard-Gated</h2>
                <p>
                    100 episodes. 35% corrupt agent outputs. The soft-only LLM judge gave
                    <strong> perfect scores to every corrupt episode</strong>. Hard-gated
                    composition caught all 40 with zero false negatives.
                </p>
                <div className={styles.benchmarkStats}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>100%</span>
                        <span className={styles.statLabel}>Soft-only false positive rate</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={`${styles.statValue} ${styles.statGood}`}>0%</span>
                        <span className={styles.statLabel}>Hard-gated false positive rate</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>1.000</span>
                        <span className={styles.statLabel}>Score divergence on corrupt episodes</span>
                    </div>
                </div>
                <p className={styles.benchmarkNote}>
                    Reproducible: <code>python benchmark_gating.py</code>
                </p>
            </div>

            <div className={styles.cta}>
                <Link href="/docs/examples" className={styles.ctaLink}>
                    Full walkthrough in docs <LuArrowRight size={16} />
                </Link>
                <Link href="/docs/quickstart" className={styles.ctaLinkSecondary}>
                    Getting started guide
                </Link>
            </div>
        </div>
    )
}
