'use client'

import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import CookieNotification from '@/components/CookieNotification'
import VerifierFlowDiagram from '@/components/VerifierFlowDiagram'
import SectionFadeIn from '@/components/SectionFadeIn'
import { LuArrowRight, LuShield, LuLayers, LuFileSearch, LuBot, LuUser, LuMessageCircle, LuTarget, LuCodeXml, LuBuilding, LuGraduationCap, LuDatabase, LuTerminal } from 'react-icons/lu'
import { verifierCount, domainCount } from '@/data/registryStats'

export default function HomePage() {
  return (
    <>
      <div className="background-effects" />

      <div className={styles.page}>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroSplit}>
            <div className={styles.heroText}>
              <SectionFadeIn>
                <h1 className={styles.heroHeadline}>
                  Verify what AI agents<br />actually changed
                </h1>
              </SectionFadeIn>
              <SectionFadeIn delay={100}>
                <p className={styles.heroSub}>
                  Deterministic checks, rubric-based scoring, and agentic probes. Composed into trust pipelines for CI, evaluation, and training.
                </p>
              </SectionFadeIn>
              <SectionFadeIn delay={200}>
                <div className={styles.heroCtas}>
                  <Link href="/docs/quickstart" className={styles.primaryCta}>
                    Get Started
                    <LuArrowRight className={styles.ctaIcon} />
                  </Link>
                  <Link href="/registry" className={styles.ghostCta}>
                    Browse {verifierCount} Verifiers
                  </Link>
                </div>
              </SectionFadeIn>
            </div>
            <div className={styles.mascotHero}>
              <Image src="/mascots/vrd-8.png" alt="vr.dev dragon mascot" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>
          <SectionFadeIn delay={300}>
            <div className={styles.diagramCard}>
              <VerifierFlowDiagram />
            </div>
          </SectionFadeIn>
        </section>

        {/* ── The Problem ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>27&ndash;78% of agent &ldquo;successes&rdquo; are wrong</h2>
              <p>The agent says it cancelled the order, but the database still shows it active.
                It says it sent the email, but the content doesn&apos;t match the rubric.
                Training on these false positives teaches models to <em>appear</em> correct
                instead of <em>being</em> correct.</p>
            </div>
          </SectionFadeIn>
          <SectionFadeIn delay={100}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap',
            }}>
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '1.25rem 2rem',
                textAlign: 'center',
                maxWidth: '560px',
              }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                  Benchmark: HARD gating eliminates 100% of false positives
                </p>
                <p style={{ margin: '0 0 0.75rem', color: 'var(--color-text-dimmed)', fontSize: '0.875rem' }}>
                  100-episode e-commerce simulation. Soft-only scoring: 35% false positives.
                  HARD-gated pipeline: 0%.
                </p>
                <Link href="/case-study" style={{ color: 'var(--mantine-color-violet-5)', fontWeight: 500 }}>
                  Read the case study &rarr;
                </Link>
              </div>
            </div>
          </SectionFadeIn>
        </section>

        {/* ── For Humans / For Agents ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>One platform, two modes</h2>
              <p>Ship agents you trust today. Train better agents tomorrow.</p>
            </div>
          </SectionFadeIn>
          <div className={styles.audienceGrid}>
            <SectionFadeIn delay={0}>
              <div className={styles.audienceCard}>
                <div className={styles.audienceLabel}>
                  <LuUser size={18} />
                  For Engineers Shipping Agents
                </div>
                <p className={styles.audienceTagline}>
                  Regression testing, audit trails, and proof that agents changed real system state
                </p>
                <ul className={styles.audienceList}>
                  <li>
                    <strong>Catch false successes before users do.</strong> HARD verifiers
                    query actual databases, APIs, and file systems. Not agent self-reports.
                  </li>
                  <li>
                    <strong>Compose checks into CI gates.</strong> Chain verifiers with{' '}
                    <code>policy_mode=&quot;fail_closed&quot;</code> so soft scores only
                    count if hard state checks pass first.
                  </li>
                  <li>
                    <strong>Evidence payloads &amp; audit trail.</strong> Every verdict carries raw evidence (query results, DOM snapshots, file stats). The hosted API adds Ed25519 signing, Merkle-chained integrity, and optional on-chain anchoring on Base L2.
                  </li>
                  <li>
                    <strong>SDK + CLI + API.</strong>{' '}
                    <code>pip install vrdev</code>, run from the command line, or hit
                    the REST API directly.
                  </li>
                </ul>
                <Link href="/docs/quickstart" className={styles.audienceCta}>
                  Get Started in 5 Minutes
                  <LuArrowRight size={14} />
                </Link>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.audienceCard}>
                <div className={styles.audienceLabel}>
                  <LuBot size={18} />
                  For RL/Training Pipelines
                </div>
                <p className={styles.audienceTagline}>
                  Ground-truth reward signals that prevent reward hacking at training time
                </p>
                <ul className={styles.audienceList}>
                  <li>
                    <strong>Drop-in reward functions.</strong> Use verifiers as the reward
                    signal in TRL, VERL, or OpenClaw. HARD returns 0/1, SOFT returns a
                    continuous score.
                  </li>
                  <li>
                    <strong>Anti-reward-hacking by design.</strong> The composition engine
                    gates soft LLM judges behind hard state checks. Agents can&apos;t
                    game soft metrics while violating deterministic constraints.
                  </li>
                  <li>
                    <strong>Run locally, no HTTP latency.</strong>{' '}
                    <code>pip install vrdev</code> and call <code>v.verify()</code> in your
                    training loop. No API dependency in the hot path.
                  </li>
                  <li>
                    <strong>Export to JSONL.</strong> Training-ready export for GRPO / DPO
                    workflows with evidence provenance built in.
                  </li>
                </ul>
                <Link href="/docs/integration-guide" className={styles.audienceCta}>
                  Read the Integration Guide
                  <LuArrowRight size={14} />
                </Link>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Features ── */}
        <section className={`${styles.section} ${styles.sectionWithMascot}`}>
          {/* <div className={styles.mascotLeft}>
            <Image src="/mascots/vrd-6.png" alt="" fill style={{ objectFit: 'contain' }} />
          </div> */}
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Don&apos;t trust agent outputs. Verify them.</h2>
              <p>Three layers of verification for AI agents that interact with real systems</p>
            </div>
          </SectionFadeIn>
          <div className={styles.features}>
            <SectionFadeIn delay={0}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}><LuShield /></div>
                <h3>Verifier Registry</h3>
                <p>
                  {verifierCount} verifiers across {domainCount} domains including retail, airline, telecom, email,
                  calendar, shell, code, web, filesystem, document, database, API, git, messaging, payment, CI, and more. Each verifier checks actual system
                  state: API responses, database records, browser DOM, git history.
                  Three tiers: HARD (deterministic), SOFT (LLM judge), AGENTIC (agent-driven).
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}><LuLayers /></div>
                <h3>Composition Engine</h3>
                <p>
                  Chain verifiers into reward pipelines with{' '}
                  <code>policy_mode=&quot;fail_closed&quot;</code>. Gate soft LLM judges
                  behind hard state checks so reward hacking can&apos;t bypass
                  deterministic constraints. The anti-reward-hacking mechanism baked
                  into your training loop.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={200}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}><LuFileSearch /></div>
                <h3>Evidence &amp; Audit Trail</h3>
                <p>
                  Every verification produces a structured evidence record
                  containing the raw API response, verdict, score, and timestamp.
                  The hosted API adds Ed25519 signing and Merkle-chained integrity
                  with optional on-chain anchoring on Base L2.
                  Export to TRL, VERL, or any training framework.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={300}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}><LuDatabase /></div>
                <h3>Bring Your Own State</h3>
                <p>
                  Already ran the check yourself? Pass <code>pre_result</code> to skip
                  redundant execution and feed your own state into the composition engine.
                  Sub-millisecond overhead for RL training loops.{' '}
                  <Link href="/docs/byos" style={{ color: 'var(--mantine-color-violet-5)' }}>Learn more →</Link>
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={400}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}><LuTerminal /></div>
                <h3>MCP Server</h3>
                <p>
                  6 tools for Claude Desktop and Cursor: list, run, compose, explain,
                  search, and reward. Directly from your AI assistant. Install with{' '}
                  <code>pip install vrdev[mcp]</code>.{' '}
                  <Link href="/docs/mcp" style={{ color: 'var(--mantine-color-violet-5)' }}>Setup guide →</Link>
                </p>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Payment ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Free to start. Free locally, forever.</h2>
              <p>Run all verifiers locally with <code>pip install vrdev</code>. The hosted API is free during launch; paid tiers activate soon.</p>
            </div>
          </SectionFadeIn>
          <div className={styles.paymentSteps}>
            <SectionFadeIn delay={0}>
              <div className={styles.paymentStep}>
                <div className={styles.paymentIcon}>⚡</div>
                <h3>Install the SDK</h3>
                <p><code>pip install vrdev</code>. Run verifiers locally with zero setup. No API key needed.</p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.paymentStep}>
                <div className={styles.paymentIcon}>🔑</div>
                <h3>Optional: Hosted API</h3>
                <p>Sign up for an API key to get evidence anchoring, audit trails, and team dashboards.</p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={200}>
              <div className={styles.paymentStep}>
                <div className={styles.paymentIcon}>💰</div>
                <h3>Pay per call (later)</h3>
                <p>When paid tiers activate: USDC micropayments on Base via x402. Starting at <strong>$0.005</strong> per HARD check.</p>
              </div>
            </SectionFadeIn>
          </div>
          <SectionFadeIn delay={300}>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link href="/pricing" className={styles.ghostCta}>
                See full pricing →
              </Link>
            </div>
          </SectionFadeIn>
        </section>

        {/* ── SDK Code ── */}
        <section className={`${styles.section} ${styles.sectionWithMascot}`}>
          {/* <div className={styles.mascotRight}>
            <Image src="/mascots/vrd-9.png" alt="" fill style={{ objectFit: 'contain' }} />
          </div> */}
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Get started in 3 lines</h2>
            </div>
          </SectionFadeIn>
          <SectionFadeIn delay={100}>
            <div className={styles.codeCard}>
              <div className={styles.codeHeader}>
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeTitle}>pipeline.py</span>
              </div>
              <pre className={styles.codeBody}>
                <code>
{`from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

# single verifier: checks the actual DB state
v = get_verifier("vr/tau2.retail.order_cancelled")
result = v.verify(VerifierInput(
    completions=["Order cancelled"],
    ground_truth={"order_id": "ORD-42"},
))

# composed pipeline: hard gate → soft scorer
pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
    get_verifier("vr/rubric.email.tone_professional"),
], policy_mode=PolicyMode.FAIL_CLOSED)

result = pipeline.verify(VerifierInput(
    completions=["Order cancelled, email sent"],
    ground_truth={"order_id": "ORD-42"},
))
print(result[0].passed)         # True / False
print(result[0].evidence_hash)  # sha256:a3f1b2...`}
                </code>
              </pre>
            </div>
          </SectionFadeIn>
        </section>

        {/* ── Where vr.dev Fits ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Where vr.dev fits in your stack</h2>
              <p>
                Tracing tools record what your agent did. vr.dev verifies whether it actually worked.
                They compose &mdash; trace with LangSmith, verify with vr.dev, link via trace IDs.
              </p>
            </div>
          </SectionFadeIn>

          {/* Pipeline visual */}
          <SectionFadeIn delay={100}>
            <div className={styles.pipelineVisual}>
              <div className={styles.pipelineStep}>
                <span className={styles.pipelineLabel}>Your Agent</span>
                <span className={styles.pipelineDesc}>LangChain, CrewAI, OpenAI&nbsp;SDK, custom</span>
              </div>
              <div className={styles.pipelineArrow}>&rarr;</div>
              <div className={styles.pipelineStep}>
                <span className={styles.pipelineLabel}>Does Work</span>
                <span className={styles.pipelineDesc}>Calls APIs, queries DBs, sends emails</span>
              </div>
              <div className={styles.pipelineArrow}>&rarr;</div>
              <div className={`${styles.pipelineStep} ${styles.pipelineHighlight}`}>
                <span className={styles.pipelineLabel}>vr.dev Verifies</span>
                <span className={styles.pipelineDesc}>Checks actual state changed&nbsp;correctly</span>
              </div>
              <div className={styles.pipelineArrow}>&rarr;</div>
              <div className={styles.pipelineStep}>
                <span className={styles.pipelineLabel}>Pass / Fail + Evidence</span>
                <span className={styles.pipelineDesc}>CI gate, reward signal, audit trail</span>
              </div>
            </div>
          </SectionFadeIn>

          {/* Integration cards */}
          <div className={styles.integrationGrid}>
            <SectionFadeIn delay={0}>
              <div className={styles.integrationCard}>
                <div className={styles.integrationBadge}>LangChain / LangGraph</div>
                <p className={styles.integrationUseCase}>
                  <strong>Use case:</strong> Verify agent actions as a tool call, callback, or graph node.
                </p>
                <p className={styles.integrationWho}>
                  <strong>Who:</strong> Engineers building LangChain agents that interact with real systems (APIs, databases, browsers).
                </p>
                <p className={styles.integrationWhen}>
                  <strong>When:</strong> After the agent acts &mdash; before you trust the result.
                </p>
                <div className={styles.integrationCode}>
                  <code>pip install vrdev[langchain]</code>
                </div>
                <pre className={styles.integrationSnippet}>{`from vrdev import get_verifier, compose
from vrdev.adapters.langchain import VrdevVerifyTool

pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
    get_verifier("vr/rubric.email.tone_professional"),
], policy_mode="fail_closed")

# As a LangChain tool your agent can call
tool = VrdevVerifyTool(pipeline)
agent = create_react_agent(llm, tools=[..., tool])

# Or as a LangGraph verification node
from vrdev.adapters.langgraph import verify_node
graph.add_node("verify", verify_node(pipeline))`}</pre>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.integrationCard}>
                <div className={styles.integrationBadge}>Any Agent Framework</div>
                <p className={styles.integrationUseCase}>
                  <strong>Use case:</strong> Post-action verification in any agent loop &mdash; 3 lines of code.
                </p>
                <p className={styles.integrationWho}>
                  <strong>Who:</strong> Anyone building agents with OpenAI Agents SDK, CrewAI, AutoGen, or custom code.
                </p>
                <p className={styles.integrationWhen}>
                  <strong>When:</strong> In your tool function, after the action, before returning to the agent.
                </p>
                <div className={styles.integrationCode}>
                  <code>pip install vrdev</code>
                </div>
                <pre className={styles.integrationSnippet}>{`from vrdev import get_verifier, compose, VerifierInput

pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
], policy_mode="fail_closed")

# In your tool / action handler:
result = pipeline.verify(VerifierInput(
    completions=["Order cancelled"],
    ground_truth={"order_id": "ORD-42"},
))
assert result[0].passed  # True if state actually changed`}</pre>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={200}>
              <div className={styles.integrationCard}>
                <div className={styles.integrationBadge}>RL Training</div>
                <p className={styles.integrationUseCase}>
                  <strong>Use case:</strong> Ground-truth reward signals for GRPO / DPO that prevent reward hacking.
                </p>
                <p className={styles.integrationWho}>
                  <strong>Who:</strong> Researchers training agents with TRL, VERL, or OpenClaw.
                </p>
                <p className={styles.integrationWhen}>
                  <strong>When:</strong> As the reward function in your training loop &mdash; zero-friction drop-in.
                </p>
                <div className={styles.integrationCode}>
                  <code>pip install vrdev</code>
                </div>
                <pre className={styles.integrationSnippet}>{`from vrdev import get_verifier, compose
from vrdev.adapters.trl import to_trl_reward_func

pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
    get_verifier("vr/rubric.email.tone_professional"),
], policy_mode="fail_closed")

reward_fn = to_trl_reward_func(pipeline)
trainer = GRPOTrainer(
    model=model, reward_funcs=[reward_fn], ...
)`}</pre>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Why Not Just ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2><LuMessageCircle size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Why not just&hellip;</h2>
            </div>
          </SectionFadeIn>
          <div className={styles.faqGrid}>
            <SectionFadeIn delay={0}>
              <div className={styles.faqCard}>
                <h3>&ldquo;Why not just write a pytest assert?&rdquo;</h3>
                <p>
                  You absolutely should write asserts. But a single assert doesn&apos;t compose
                  with LLM scoring, doesn&apos;t produce an evidence chain, and doesn&apos;t come
                  with adversarial test fixtures. vr.dev wraps deterministic checks (HARD tier)
                  with composition, evidence persistence, and training-data export.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.faqCard}>
                <h3>&ldquo;Why not just use LLM-as-judge?&rdquo;</h3>
                <p>
                  LLM judges are sycophantic, non-deterministic, and gameable by the agent
                  being evaluated. Our SOFT tier uses LLM judges, but only after the HARD
                  tier confirms actual system state. <code>fail_closed</code> composition means
                  a perfect rubric score is discarded if the database check fails.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={200}>
              <div className={styles.faqCard}>
                <h3>&ldquo;Why not build this internally?&rdquo;</h3>
                <p>
                  You can. We did. It took months. The registry gives you {verifierCount} battle-tested
                  verifiers across {domainCount} domains with adversarial fixtures, shared composition
                  patterns, and training framework integration. Ready to use from{' '}
                  <code>pip install vrdev</code>.
                </p>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Who This Is For ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Who this is for</h2>
            </div>
          </SectionFadeIn>
          <div className={styles.whoGrid}>
            <SectionFadeIn delay={0}>
              <div className={styles.whoCard}>
                <div className={styles.whoIcon}><LuCodeXml size={20} /></div>
                <h4>Agent Developers</h4>
                <p>Building agents that interact with real systems (APIs, databases, browsers) and need proof they worked.</p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={50}>
              <div className={styles.whoCard}>
                <div className={styles.whoIcon}><LuGraduationCap size={20} /></div>
                <h4>RL/RLHF Researchers</h4>
                <p>Training agents with GRPO/DPO and need ground-truth reward signals that prevent reward hacking.</p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.whoCard}>
                <div className={styles.whoIcon}><LuTarget size={20} /></div>
                <h4>Eval &amp; QA Teams</h4>
                <p>Running regression tests on agent behavior and need deterministic checks beyond &ldquo;it looks right.&rdquo;</p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={150}>
              <div className={styles.whoCard}>
                <div className={styles.whoIcon}><LuBuilding size={20} /></div>
                <h4>Platform Teams</h4>
                <p>Need audit trails and compliance evidence for agents acting on behalf of users in production.</p>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Current Scope ── */}
        <section className={styles.section}>
          <SectionFadeIn>
            <div className={styles.sectionHeader}>
              <h2>Current scope &amp; limitations</h2>
              <p>We believe in being upfront about where vr.dev is today.</p>
            </div>
          </SectionFadeIn>
          <div className={styles.faqGrid}>
            <SectionFadeIn delay={0}>
              <div className={styles.faqCard}>
                <h3>Registry size</h3>
                <p>
                  {verifierCount} verifiers across {domainCount} domains. Growing, but not yet
                  comprehensive. Finance, healthcare, and legal domains are not covered yet.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={100}>
              <div className={styles.faqCard}>
                <h3>Signing is hosted-only</h3>
                <p>
                  Ed25519 signing, Merkle integrity, and on-chain anchoring require the hosted API.
                  The local SDK provides full evidence payloads and auditability, but not cryptographic
                  tamper-evidence.
                </p>
              </div>
            </SectionFadeIn>
            <SectionFadeIn delay={200}>
              <div className={styles.faqCard}>
                <h3>AGENTIC verifiers need network</h3>
                <p>
                  HARD and SOFT verifiers run fully offline. AGENTIC verifiers (IMAP, CalDAV, browser)
                  require network access to probe external services. BYOS mode avoids all live I/O.
                </p>
              </div>
            </SectionFadeIn>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={styles.ctaSection}>
          <SectionFadeIn>
            <div className={styles.mascotCta}>
              <Image src="/mascots/vrd-7.png" alt="" fill style={{ objectFit: 'contain' }} />
            </div>
            <h2 className={styles.ctaHeadline}>Ship agents you can verify</h2>
            <p className={styles.ctaSub}>
              <code>pip install vrdev</code>: run locally in seconds. Free forever for local use.
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/docs/quickstart" className={styles.primaryCta}>
                Get Started in 5 Minutes
                <LuArrowRight className={styles.ctaIcon} />
              </Link>
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className={styles.ghostCta}>
                    Sign Up for API Key
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/keys" className={styles.ghostCta}>
                  Manage API Keys
                </Link>
              </SignedIn>
            </div>
            <p className={styles.ctaTrust}>
              Open source (MIT) · Free: run locally · Hosted API: pay-per-call in USDC
            </p>
          </SectionFadeIn>
        </section>
      </div>

      <CookieNotification />
    </>
  )
}
