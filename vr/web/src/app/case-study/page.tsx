import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata: Metadata = {
    title: 'Case Study: Soft-Only vs Hard-Gated Verification | vr.dev',
    description: 'Hard-gated composition caught all 35 corrupt agent episodes with zero false positives. Soft-only scoring missed every single one.',
}

export default function CaseStudyPage() {
    return (
        <div className={styles.caseStudy}>
            <div className={styles.content}>
                <h1>Case Study: Soft-Only vs Hard-Gated Verification</h1>
                <p className={styles.subtitle}>
                    100 verification episodes. 35 corrupt agent outputs. One question: does your
                    reward signal catch false successes, or reward them?
                </p>

                <section className={styles.section}>
                    <h2>The Problem</h2>
                    <p>
                        When training or evaluating AI agents, reward signals must reflect
                        whether the agent <strong>actually changed system state</strong>, not
                        just whether its text output <em>sounds</em> correct.
                    </p>
                    <p>
                        LLM-as-judge evaluators (the &ldquo;soft-only&rdquo; approach) score agent
                        text against rubrics. This works well for tone, formatting, and style, but
                        but it has a fundamental blind spot: <strong>it can&apos;t verify state changes.</strong>
                    </p>
                    <p>
                        An agent that says &ldquo;I cancelled your order&rdquo; gets a high rubric
                        score regardless of whether the order was actually cancelled.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Method</h2>
                    <p>
                        We ran <strong>100 verification episodes</strong> against a mock retail API.
                    </p>
                    <p>
                        <strong>35 episodes</strong> were &ldquo;corrupt&rdquo;: the agent claimed success, but
                        the order was still active and the refund was still pending.<br />
                        <strong>65 episodes</strong> were &ldquo;clean&rdquo;: the agent genuinely completed the task.<br />
                        All episodes used identical, well-written agent text output.
                    </p>
                    <p>We evaluated each episode with two strategies:</p>
                    <table className={styles.resultsTable}>
                        <thead>
                            <tr><th>Strategy</th><th>Verifiers</th><th>Config</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Soft-only</strong></td>
                                <td><code>rubric.email.tone_professional</code></td>
                                <td>Default (threshold &ge; 0.75)</td>
                            </tr>
                            <tr>
                                <td><strong>Hard-gated</strong></td>
                                <td>
                                    <code>tau2.retail.order_cancelled</code> +{' '}
                                    <code>tau2.retail.refund_processed</code> +{' '}
                                    <code>rubric.email.tone_professional</code>
                                </td>
                                <td><code>require_hard=True</code>, <code>policy_mode=FAIL_CLOSED</code></td>
                            </tr>
                        </tbody>
                    </table>
                    <p>Seed: 42. All results reproducible via <code>python benchmark_gating.py</code>.</p>
                </section>

                <section className={styles.section}>
                    <h2>Results</h2>

                    <div className={styles.chartSection}>
                        <h3 className={styles.chartTitle}>False Positive Rate</h3>
                        <div className={styles.barChart}>
                            <div className={styles.barRow}>
                                <span className={styles.barLabel}>Soft-only</span>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.bar} ${styles.barFail}`} style={{ width: '100%' }}>
                                        <span className={styles.barValue}>100%</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.barRow}>
                                <span className={styles.barLabel}>Hard-gated</span>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.bar} ${styles.barPass}`} style={{ width: '3%', minWidth: '48px' }}>
                                        <span className={styles.barValue}>0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <h3 className={styles.chartTitle}>Avg Score on Corrupt Episodes</h3>
                        <div className={styles.barChart}>
                            <div className={styles.barRow}>
                                <span className={styles.barLabel}>Soft-only</span>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.bar} ${styles.barFail}`} style={{ width: '100%' }}>
                                        <span className={styles.barValue}>1.000</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.barRow}>
                                <span className={styles.barLabel}>Hard-gated</span>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.bar} ${styles.barPass}`} style={{ width: '3%', minWidth: '48px' }}>
                                        <span className={styles.barValue}>0.000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className={styles.resultsTable}>
                        <thead>
                            <tr><th>Metric</th><th>Soft-only</th><th>Hard-gated</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>False positive rate</td>
                                <td><span className={styles.fail}>100%</span></td>
                                <td><span className={styles.pass}>0%</span></td>
                            </tr>
                            <tr><td>False positives</td><td>35</td><td>0</td></tr>
                            <tr><td>True positives</td><td>65</td><td>65</td></tr>
                            <tr><td>Avg score (all)</td><td>1.000</td><td>0.650</td></tr>
                            <tr><td>Avg score (corrupt)</td><td>1.000</td><td>0.000</td></tr>
                            <tr><td>Score divergence (corrupt)</td><td>1.000</td><td>N/A</td></tr>
                            <tr><td>Avg latency</td><td>0.1 ms</td><td>23.0 ms</td></tr>
                        </tbody>
                    </table>
                </section>

                <section className={styles.section}>
                    <h2>Key Finding</h2>
                    <p>
                        <strong>Every corrupt agent output was rewarded by the soft-only strategy.</strong>{' '}
                        The rubric judge gave a perfect 1.0 score to all 35 corrupt episodes because
                        the agent&apos;s <em>text</em> was polished and included all expected information,
                        even though the underlying state was wrong.
                    </p>
                    <p>
                        Hard-gated composition caught all 35 corrupt episodes with{' '}
                        <strong>zero false positives</strong> and <strong>zero false negatives</strong>.
                        The latency overhead was ~23 ms per episode.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Score Divergence</h2>
                    <p>
                        On corrupt episodes, soft-only assigned an average score of <strong>1.000</strong>{' '}
                        while hard-gated assigned <strong>0.000</strong>, a divergence of 1.0 (the
                        maximum possible).
                    </p>
                    <p>
                        In a reinforcement learning context, this means corrupt completions received the{' '}
                        <strong>same reward as correct completions</strong>, making the reward signal
                        useless for learning.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Example: Corrupt Episode Caught</h2>
                    <div className={styles.exampleBlock}>
{`Agent output:
  "Dear customer, your order ORD-0001 has been cancelled per your
   request. Refund RF-0001 of $49.99 has been processed."

Actual system state:
  Order ORD-0001: status=active (NOT cancelled)
  Refund RF-0001: status=pending, amount=$0.00 (NOT processed)

Soft-only verdict:  PASS  (score: 1.0)
Hard-gated verdict: FAIL  (score: 0.0, hard_gate_failed=true)`}
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Implications</h2>
                    <p>
                        <strong>For RL training:</strong> Soft-only rewards inject noise proportional to
                        the agent false-success rate. If 35% of agent actions are wrong but scored as
                        correct, the training signal degrades significantly.
                    </p>
                    <p>
                        <strong>For evaluation:</strong> Accuracy metrics based on soft-only rewards overcount
                        successes. A benchmark showing &ldquo;92% task completion&rdquo; with soft-only scoring
                        may actually be &le;60%.
                    </p>
                    <p>
                        <strong>For production monitoring:</strong> Soft-only checks provide a false sense of
                        confidence. Hard verification is required at the state boundary (API, database,
                        filesystem) to detect silent failures.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Reproduce</h2>
                    <div className={styles.codeBlock}>
{`pip install vrdev
cd demos/
python benchmark_gating.py
# Results in benchmark_results.json`}
                    </div>
                    <p>
                        Source: <a href="https://github.com/vrDotDev/vr-dev/tree/main/demos" target="_blank" rel="noopener noreferrer">github.com/vrDotDev/vr-dev/tree/main/demos</a>
                    </p>
                </section>

                <div className={styles.cta}>
                    <Link href="/docs/golden-pipelines" className={styles.ctaLink}>
                        See Golden Pipeline Templates &rarr;
                    </Link>
                </div>
            </div>
        </div>
    )
}
