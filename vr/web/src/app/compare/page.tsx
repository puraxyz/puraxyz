import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './page.module.css'
import { verifierCount, domainCount } from '@/data/registryStats'

export const metadata: Metadata = {
    title: 'Compare vr.dev vs Evals, LangSmith, Braintrust, Weave | vr.dev',
    description: 'How vr.dev compares to OpenAI Evals, LangSmith, Braintrust, W&B Weave, and other agent evaluation frameworks.',
}

export default function ComparePage() {
    return (
        <div className={styles.compare}>
            <div className={styles.content}>
                <h1>How vr.dev compares</h1>
                <p className={styles.subtitle}>
                    Evaluating AI agents is a crowded space. Here&apos;s how vr.dev differs from
                    popular alternatives, and where each tool is strongest.
                </p>

                <section className={styles.section}>
                    <h2>Feature Comparison</h2>
                    <div className={styles.tableWrap}>
                        <table className={styles.comparisonTable}>
                            <thead>
                                <tr>
                                    <th>Capability</th>
                                    <th>OpenAI Evals</th>
                                    <th>LangSmith</th>
                                    <th>Braintrust</th>
                                    <th>W&amp;B Weave</th>
                                    <th>vr.dev</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Best for</td>
                                    <td>LLM model evals</td>
                                    <td>LangChain tracing &amp; evals</td>
                                    <td>Prompt scoring &amp; CI</td>
                                    <td>Experiment tracking</td>
                                    <td><strong>Agent state verification</strong></td>
                                </tr>
                                <tr>
                                    <td>Pre-built verifiers</td>
                                    <td><span className={styles.partial}>BYO scorers</span></td>
                                    <td><span className={styles.partial}>BYO evaluators</span></td>
                                    <td><span className={styles.partial}>BYO scorers</span></td>
                                    <td><span className={styles.partial}>BYO scorers</span></td>
                                    <td><span className={styles.yes}>{verifierCount} across {domainCount} domains</span></td>
                                </tr>
                                <tr>
                                    <td>Checks real system state</td>
                                    <td><span className={styles.no}>No: text only</span></td>
                                    <td><span className={styles.no}>No: trace-based</span></td>
                                    <td><span className={styles.no}>No: output scoring</span></td>
                                    <td><span className={styles.no}>No: output scoring</span></td>
                                    <td><span className={styles.yes}>Yes: DB, API, DOM, filesystem</span></td>
                                </tr>
                                <tr>
                                    <td>HARD / SOFT / AGENTIC tiers</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.yes}>Yes</span></td>
                                </tr>
                                <tr>
                                    <td>Composition engine</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.yes}>Yes: hard gates soft scorers</span></td>
                                </tr>
                                <tr>
                                    <td>Anti-reward-hacking</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.yes}>Yes: fail_closed gating</span></td>
                                </tr>
                                <tr>
                                    <td>Adversarial fixtures</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.yes}>Yes</span></td>
                                </tr>
                                <tr>
                                    <td>Training export (TRL, VERL)</td>
                                    <td><span className={styles.partial}>OpenAI fine-tuning</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.partial}>W&amp;B artifacts</span></td>
                                    <td><span className={styles.yes}>TRL, VERL, OpenClaw</span></td>
                                </tr>
                                <tr>
                                    <td>Runs fully offline</td>
                                    <td><span className={styles.no}>No: cloud API</span></td>
                                    <td><span className={styles.no}>No: cloud API</span></td>
                                    <td><span className={styles.no}>No: cloud API</span></td>
                                    <td><span className={styles.partial}>Partial: local logging</span></td>
                                    <td><span className={styles.yes}>Yes: pip install vrdev</span></td>
                                </tr>
                                <tr>
                                    <td>Open source</td>
                                    <td><span className={styles.yes}>Yes (MIT)</span></td>
                                    <td><span className={styles.partial}>SDK open, platform closed</span></td>
                                    <td><span className={styles.partial}>SDK open, platform closed</span></td>
                                    <td><span className={styles.yes}>Yes (Apache 2.0)</span></td>
                                    <td><span className={styles.yes}>Yes (MIT)</span></td>
                                </tr>
                                <tr>
                                    <td>Evidence chain</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.partial}>Trace logs</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.partial}>Experiment logs</span></td>
                                    <td><span className={styles.yes}>SHA-256 Merkle + Ed25519 (hosted)</span></td>
                                </tr>
                                <tr>
                                    <td>Native framework adapters</td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.partial}>N/A (is the framework)</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.no}>No</span></td>
                                    <td><span className={styles.yes}>LangChain, LangGraph, TRL, VERL, GEM</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Where each tool is strongest</h2>
                    <div className={styles.positionGrid}>
                        <div className={styles.positionCard}>
                            <h3>OpenAI Evals</h3>
                            <p>
                                Best if you&apos;re benchmarking OpenAI models specifically. Strong
                                integration with the OpenAI API. Evaluates text quality, not system state.
                            </p>
                        </div>
                        <div className={styles.positionCard}>
                            <h3>LangSmith</h3>
                            <p>
                                Best for tracing and debugging LangChain pipelines. Excellent observability
                                for chain execution. Evaluators score text outputs, not real-world state.
                            </p>
                        </div>
                        <div className={styles.positionCard}>
                            <h3>Braintrust</h3>
                            <p>
                                Best for prompt iteration and scoring in CI.
                                Clean UI for comparing prompt variants. Scores LLM outputs rather than
                                verifying agent actions.
                            </p>
                        </div>
                        <div className={styles.positionCard}>
                            <h3>W&amp;B Weave</h3>
                            <p>
                                Best for experiment tracking across ML workflows. Strong artifact
                                management. Evaluates model outputs, not end-to-end agent state changes.
                            </p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Where vr.dev is different</h2>
                    <p>
                        Most eval tools answer: <em>&ldquo;Does the output look correct?&rdquo;</em>{' '}
                        vr.dev answers: <em>&ldquo;Did the agent actually change system state correctly?&rdquo;</em>
                    </p>
                    <p>
                        This matters because agents interact with databases, APIs, filesystems, and
                        browsers. An agent that says &ldquo;order cancelled&rdquo; while the database
                        still shows it active will score perfectly on text-based evals, and fail
                        silently in production.
                    </p>
                    <p>
                        vr.dev&apos;s HARD verifiers query actual system state. The composition engine
                        gates SOFT LLM judges behind these deterministic checks. If the database says
                        the order is still active, the rubric score is discarded. This is structural
                        anti-reward-hacking, not statistical filtering.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>When to use something else</h2>
                    <p>
                        <strong>Pure LLM benchmarking</strong> (no agent actions): OpenAI Evals or Braintrust are simpler choices.
                    </p>
                    <p>
                        <strong>LangChain-centric tracing</strong>: LangSmith gives you deep call-level observability that vr.dev doesn&apos;t replicate. Use both: trace with LangSmith, verify with vr.dev (<code>pip install vrdev[langchain]</code>).
                    </p>
                    <p>
                        <strong>Experiment tracking across many model types</strong>: W&amp;B Weave integrates with the broader Weights &amp; Biases ecosystem.
                    </p>
                    <p>
                        <strong>Agent actions on real systems</strong>: That&apos;s where vr.dev fits: verifying that
                        the agent actually did what it claimed, with ground-truth state checks.
                    </p>
                </section>

                <div className={styles.cta}>
                    <Link href="/docs/quickstart" className={styles.ctaLink}>
                        Try vr.dev in 5 minutes &rarr;
                    </Link>
                    <p className={styles.note}>
                        Open source (MIT) &middot; <code>pip install vrdev</code> &middot; No account required for local use
                    </p>
                </div>
            </div>
        </div>
    )
}
