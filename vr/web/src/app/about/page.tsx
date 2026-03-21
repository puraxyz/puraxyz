import type { Metadata } from 'next'
import styles from './page.module.css'
import { verifierCount, domainCount, fixtureCount } from '@/data/registryStats'

export const metadata: Metadata = {
    title: 'About vr.dev | Verifiable Rewards for AI Agents',
    description: 'vr.dev is an open platform for verifying AI agent actions with deterministic checks, rubric-based scoring, and agentic probes across 19 domains.',
}

export default function About() {
    return (
        <div className={styles.about}>
            <div className={styles.content}>
                <h1>About vr.dev</h1>

                <section className={styles.section}>
                    <h2>What we do</h2>
                    <p>
                        vr.dev is an open platform for verifying AI agent actions. We maintain a
                        registry of reward verifiers: software modules that check whether an AI
                        agent actually did what it claimed to do, by inspecting real system state
                        rather than trusting the agent&apos;s self-report.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Why it matters</h2>
                    <p>
                        Research shows that 27-78% of agent &ldquo;successes&rdquo; are procedurally
                        wrong. The agent says it cancelled the order, but the database still shows it
                        active. It says it sent the email, but the content doesn&apos;t match the rubric.
                        Training on these false positives creates models that learn to <em>appear</em> correct
                        instead of <em>being</em> correct.
                    </p>
                    <p>
                        Verifiable rewards fix this by introducing ground-truth checks into the
                        training loop, evaluation pipeline, and production monitoring stack.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>The approach</h2>
                    <p>
                        Every verifier in the registry operates at one of three tiers: <strong>HARD</strong> (deterministic
                        state checks), <strong>SOFT</strong> (rubric-based LLM judges), or <strong>AGENTIC</strong> (agent-driven
                        probing). These compose into reward pipelines where hard checks gate soft scores,
                        preventing reward hacking by design.
                    </p>
                    <p>
                        Every verification returns raw evidence payloads for full auditability.
                        The hosted API adds integrity (Ed25519 signatures, content-hashed evidence chains)
                        and optional on-chain anchoring (Merkle roots on Base L2) for third-party-verifiable
                        tamper evidence.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>What&apos;s open source</h2>
                    <p>
                        The following are open source under the <strong>MIT license</strong>:
                    </p>
                    <ul className={styles.boundaryList}>
                        <li>Python SDK (<code>vrdev</code> package)</li>
                        <li>CLI tool (<code>vr</code>)</li>
                        <li>All verifier registry specs and verification logic</li>
                        <li>Composition engine and fixture data</li>
                        <li>MCP server for Claude Desktop / Cursor</li>
                    </ul>
                    <p>
                        You can run everything locally with <code>pip install vrdev</code>. No
                        API key, no hosted service required. HARD and SOFT verifiers run fully
                        offline; AGENTIC verifiers may require network access to probe external
                        services (IMAP, CalDAV, browsers).
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Hosted service</h2>
                    <p>
                        The <strong>vr.dev API</strong> adds managed infrastructure
                        on top of the open-source SDK:
                    </p>
                    <ul className={styles.boundaryList}>
                        <li>Managed execution of AGENTIC verifiers (IMAP, CalDAV, browser)</li>
                        <li>Evidence storage with configurable retention</li>
                        <li>Team/org management and API key provisioning</li>
                        <li>Audit trail exports for compliance</li>
                        <li>Rate limiting and usage analytics</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>Pricing</h2>
                    <p>
                        The open-source SDK runs all verifiers locally at <strong>zero cost</strong>. The
                        hosted API charges per verification via{' '}
                        <strong>USDC micropayments on Base</strong> using the x402 protocol.
                        During beta, payments use Base Sepolia (testnet). Mainnet coming soon.
                    </p>
                    <div className={styles.pricingGrid}>
                        <div className={styles.pricingCard}>
                            <h3>HARD</h3>
                            <p className={styles.pricingPrice}>$0.005<span> USDC</span></p>
                            <ul className={styles.pricingFeatures}>
                                <li>Deterministic state checks</li>
                                <li>Sub-second, no LLM calls</li>
                                <li>Database, filesystem, HTTP, git</li>
                            </ul>
                        </div>
                        <div className={styles.pricingCard}>
                            <h3>SOFT</h3>
                            <p className={styles.pricingPrice}>$0.05<span> USDC</span></p>
                            <ul className={styles.pricingFeatures}>
                                <li>Rubric-based LLM judges</li>
                                <li>Content quality, tone, structure</li>
                                <li>Structured prompt consistency</li>
                            </ul>
                        </div>
                        <div className={styles.pricingCard}>
                            <h3>AGENTIC</h3>
                            <p className={styles.pricingPrice}>$0.15<span> USDC</span></p>
                            <ul className={styles.pricingFeatures}>
                                <li>Agent-driven probing</li>
                                <li>Browser, calendar, shell</li>
                                <li>Multi-step verification</li>
                            </ul>
                        </div>
                    </div>
                    <p className={styles.pricingNote}>
                        API key billing and team invoicing coming soon. See{' '}
                        <a href="/pricing">pricing page</a> for full details. The open-source SDK
                        is always free and fully functional for local use.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Stage</h2>
                    <p>
                        vr.dev is at <strong>v1.0.0</strong>. The SDK is stable ({fixtureCount}+ test fixtures,
                        85%+ coverage), the registry has {verifierCount} verifiers across {domainCount} domains, and the
                        hosted API is live. The hosted API provides Ed25519-signed evidence chains
                        with optional on-chain anchoring via Base L2. We&apos;re actively adding verifiers, improving documentation,
                        and gathering feedback from early users.
                    </p>
                    <p>
                        Contributions welcome:{' '}
                        <a href="https://github.com/vrDotDev/vr-dev" target="_blank" rel="noopener noreferrer">
                            see the contributing guide
                        </a>.{' '}
                        Follow us on{' '}
                        <a href="https://bsky.app/profile/vr.dev" target="_blank" rel="noopener noreferrer">
                            Bluesky
                        </a>.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Case Studies</h2>
                    <p>
                        Our <a href="/case-study">benchmark case study</a> demonstrates how HARD-gated
                        verification eliminates 100% of false positives in a 100-episode e-commerce
                        simulation, compared to 35% false-positive rate with soft-only scoring.
                    </p>
                    <p>
                        If you&apos;re using vr.dev for RL training, CI/CD gating, or production
                        monitoring and would like to share your experience, reach out at{' '}
                        <a href="mailto:hello@vr.dev">hello@vr.dev</a>.
                    </p>
                </section>
            </div>
        </div>
    )
}
