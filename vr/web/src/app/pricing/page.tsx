'use client'

import { useState } from 'react'
import styles from './page.module.css'
import PaymentFlowDiagram from '@/components/PaymentFlowDiagram'
import { verifierCount } from '@/data/registryStats'

const TIERS = [
    {
        tier: 'HARD',
        price: '$0.005',
        desc: 'Deterministic state checks - database rows, file existence, HTTP status codes. Sub-second, no LLM calls.',
        features: [
            'Database row existence & updates',
            'File system verification',
            'HTTP response matching',
            'Git commit checks',
            'CSV / JSON / YAML validation',
        ],
    },
    {
        tier: 'SOFT',
        price: '$0.05',
        desc: 'Rubric-based LLM judges - content quality, semantic matching, tone analysis. Uses structured prompts for consistency.',
        features: [
            'Text content matching',
            'Email content verification',
            'Document quality scoring',
            'PDF page count checks',
            'Structured output validation',
        ],
    },
    {
        tier: 'AGENTIC',
        price: '$0.15',
        desc: 'Agent-driven probing - browser automation, calendar event creation, multi-step process verification.',
        features: [
            'Browser state probing',
            'Calendar event verification',
            'Shell state inspection',
            'Multi-step workflow checks',
            'End-to-end action confirmation',
        ],
    },
]

export default function Pricing() {
    const [waitlistEmail, setWaitlistEmail] = useState('')
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)

    return (
        <div className={styles.pricing}>
            <div className={styles.content}>
                <h1>Pricing</h1>
                <p className={styles.subtitle}>
                    The open-source SDK is free forever. Run all {verifierCount} verifiers
                    locally with <code>pip install vrdev</code>. No API key, no account needed.
                </p>

                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    marginBottom: '2rem',
                    textAlign: 'center',
                }}>
                    <strong style={{ color: 'var(--color-accent)' }}>Free During Public Launch</strong>
                    <span style={{ margin: '0 0.5rem' }}>|</span>
                    The hosted API is free while we gather feedback. Paid tiers below will activate
                    after the launch period ends.
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dimmed)', marginTop: '0.25rem', display: 'inline-block' }}>
                        Beta note: x402 payments currently use <strong>Base Sepolia (testnet)</strong>. Mainnet billing on Base coming soon.
                    </span>
                </div>

                <h2 style={{ marginTop: '2rem' }}>Hosted API pricing</h2>
                <p style={{ color: 'var(--color-text-dimmed)', marginBottom: '1.5rem' }}>
                    When paid tiers activate, verification costs are charged per call via USDC micropayments on Base (x402 protocol). During beta, payments use Base Sepolia (testnet).
                </p>

                <div className={styles.grid}>
                    {TIERS.map((t) => (
                        <div key={t.tier} className={styles.card}>
                            <span className={styles.tierLabel}>{t.tier}</span>
                            <div className={styles.price}>
                                {t.price}
                                <span className={styles.priceUnit}> USDC</span>
                            </div>
                            <p className={styles.tierDesc}>{t.desc}</p>
                            <ul className={styles.featureList}>
                                {t.features.map((f) => (
                                    <li key={f}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <section className={styles.section}>
                    <h2>Composition surcharge</h2>
                    <p>
                        When composing multiple verifiers into a pipeline via <code>/v1/compose</code>,
                        a flat <strong>$0.002 USDC</strong> surcharge is added on top of the
                        component verifier prices.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>How payment works</h2>
                    <PaymentFlowDiagram />
                </section>

                <section className={styles.section}>
                    <h2>Graduated access</h2>
                    <div className={styles.graduatedGrid}>
                        <div className={styles.graduatedCard}>
                            <span className={styles.graduatedBadge} data-tier="free">FREE</span>
                            <h3>Get started instantly</h3>
                            <p>Sign up and create API keys. Your first <strong>1,000 verifications</strong> are free. No wallet needed.</p>
                        </div>
                        <div className={styles.graduatedCard}>
                            <span className={styles.graduatedBadge} data-tier="testnet">TESTNET</span>
                            <h3>Test with play money</h3>
                            <p>Enable testnet billing → pay with <strong>testnet USDC</strong> on Base Sepolia. Up to <strong>10,000 verifications</strong>.</p>
                        </div>
                        <div className={styles.graduatedCard}>
                            <span className={styles.graduatedBadge} data-tier="mainnet">MAINNET</span>
                            <h3>Production scale</h3>
                            <p>Upgrade to mainnet → pay with <strong>real USDC</strong> on Base. No limits, no invoices.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Get your wallet ready in 3 steps</h2>
                    <div className={styles.onboardingSteps}>
                        <div className={styles.onboardingStep}>
                            <div className={styles.onboardingIcon}>1</div>
                            <div>
                                <h4>Install a wallet</h4>
                                <p>
                                    Download <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">Coinbase Wallet</a> or <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">MetaMask</a>.
                                    Add the <strong>Base</strong> network (auto-detected in most wallets).
                                </p>
                            </div>
                        </div>
                        <div className={styles.onboardingStep}>
                            <div className={styles.onboardingIcon}>2</div>
                            <div>
                                <h4>Get USDC on Base</h4>
                                <p>
                                    Bridge USDC from Ethereum via the <a href="https://bridge.base.org" target="_blank" rel="noopener noreferrer">Base Bridge</a>,
                                    or buy directly on Coinbase and withdraw to Base.
                                    For testnet, use the <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer">Circle faucet</a>.
                                </p>
                            </div>
                        </div>
                        <div className={styles.onboardingStep}>
                            <div className={styles.onboardingIcon}>3</div>
                            <div>
                                <h4>Call the API</h4>
                                <p>
                                    When you exceed the free tier, the API returns a <code>402</code> with payment headers.
                                    Your client signs a USDC transfer and retries; verification completes automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Team billing &amp; invoicing</h2>
                    <p>
                        Need consolidated billing, usage reports, or invoice-based payment for your team?
                        We&apos;re building team accounts now.
                    </p>
                    {waitlistSubmitted ? (
                        <p style={{ color: 'var(--color-green)', fontWeight: 500 }}>
                            You&apos;re on the list - we&apos;ll reach out when team billing is ready.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 400, marginTop: '0.75rem' }}>
                            <input
                                type="email"
                                placeholder="you@company.com"
                                value={waitlistEmail}
                                onChange={e => setWaitlistEmail(e.target.value)}
                                className={styles.waitlistInput}
                                style={{
                                    flex: 1, padding: '0.5rem 0.75rem',
                                    borderRadius: '6px', border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)', color: 'var(--color-text)',
                                    fontSize: '0.875rem',
                                }}
                            />
                            <button
                                onClick={() => waitlistEmail.includes('@') && setWaitlistSubmitted(true)}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '6px',
                                    border: 'none', background: 'var(--color-accent)',
                                    color: '#fff', fontSize: '0.875rem', cursor: 'pointer',
                                    opacity: waitlistEmail.includes('@') ? 1 : 0.5,
                                }}
                            >
                                Join Waitlist
                            </button>
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <h2>Free tier</h2>
                    <p>
                        The open-source <code>vrdev</code> Python SDK runs verifiers locally at zero cost.
                        API pricing applies only to the hosted service,
                        which adds evidence anchoring, tamper-proof audit trails, and team dashboards.
                    </p>
                </section>
            </div>
        </div>
    )
}
