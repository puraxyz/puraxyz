'use client'

import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TypographyStylesProvider } from '@mantine/core'
import styles from './page.module.css'
import { PART_ONE, PART_TWO, REFERENCES } from './content'
import { verifierCount, domainCount } from '@/data/registryStats'

import TimelineDiagram from './diagrams/TimelineDiagram'
import TierTaxonomyDiagram from './diagrams/TierTaxonomyDiagram'
import CompositionPipelineDiagram from './diagrams/CompositionPipelineDiagram'
import RewardHackingDiagram from './diagrams/RewardHackingDiagram'
import EvidenceChainDiagram from './diagrams/EvidenceChainDiagram'
import LandscapeDiagram from './diagrams/LandscapeDiagram'
import TrainingIntegrationDiagram from './diagrams/TrainingIntegrationDiagram'

function slugify(text: string) {
    return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '')
}

function extractHeadings(markdown: string): { text: string; id: string }[] {
    const matches = markdown.match(/^## .+$/gm) || []
    return matches.map((line) => {
        const text = line.replace(/^## /, '')
        return { text, id: slugify(text) }
    })
}

const mdComponents: Components = {
    h2: ({ children }) => {
        const text = String(children)
        return <h2 id={slugify(text)}>{children}</h2>
    },
    h3: ({ children }) => {
        const text = String(children)
        return <h3 id={slugify(text)}>{children}</h3>
    },
}

const PART_ONE_HEADINGS = extractHeadings(PART_ONE)
const PART_TWO_HEADINGS = extractHeadings(PART_TWO)

export default function PaperPage() {
    return (
        <div className={styles.layout}>
            {/* Sidebar nav */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLabel}>On this page</div>
                <nav className={styles.nav}>
                    {PART_ONE_HEADINGS.map((h) => (
                        <a key={h.id} href={`#${h.id}`} className={styles.navLink}>
                            {h.text}
                        </a>
                    ))}
                    <div className={styles.navDivider} />
                    {PART_TWO_HEADINGS.map((h) => (
                        <a key={h.id} href={`#${h.id}`} className={styles.navLink}>
                            {h.text}
                        </a>
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <article className={styles.content}>
                {/* Paper header */}
                <header className={styles.paperHeader}>
                    <h1 className={styles.paperTitle}>
                        The Missing Layer: Verifiable Rewards for Real-World AI Agents
                    </h1>
                    <p className={styles.paperSubtitle}>
                        Why the shift from academic reasoning to real-world agent verification
                        demands new infrastructure, and what that infrastructure looks like.
                    </p>
                    <div className={styles.tldr}>
                        <span className={styles.tldrLabel}>TL;DR</span>
                        <p className={styles.tldrSentence}>
                            vr.dev provides deterministic, composable verifiers that let you prove what an AI agent actually changed in the real world.
                        </p>
                        <p className={styles.tldrParagraph}>
                            Current AI benchmarks test reasoning in sandboxes, but real-world agents
                            modify files, send emails, update databases, and call APIs. vr.dev is an
                            open-source SDK and hosted API with {verifierCount}+ verifiers across {domainCount} domains that
                            produce cryptographically signed evidence envelopes. Each verification is
                            deterministic, composable, and anchored on-chain, giving you a
                            ground-truth reward signal for RL training, CI/CD gating, and production
                            monitoring of autonomous agents.
                        </p>
                    </div>
                    <div className={styles.paperMeta}>
                        <span>vr.dev</span>
                        <span>March 2026</span>
                        <span>~30 min read</span>
                    </div>
                </header>

                {/* Part I */}
                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {PART_ONE}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><TimelineDiagram /></div>

                {/* Part II divider */}
                <div className={styles.partDivider}>
                    <p className={styles.partLabel}>Part II</p>
                    <h2 className={styles.partTitle}>Technical Architecture</h2>
                </div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {PART_TWO.split('<!-- diagram:tier-taxonomy -->')[0]}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><TierTaxonomyDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {extractBetween(PART_TWO, '<!-- diagram:tier-taxonomy -->', '<!-- diagram:composition -->')}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><CompositionPipelineDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {extractBetween(PART_TWO, '<!-- diagram:composition -->', '<!-- diagram:reward-hacking -->')}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><RewardHackingDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {extractBetween(PART_TWO, '<!-- diagram:reward-hacking -->', '<!-- diagram:evidence-chain -->')}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><EvidenceChainDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {extractBetween(PART_TWO, '<!-- diagram:evidence-chain -->', '<!-- diagram:landscape -->')}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><LandscapeDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {extractBetween(PART_TWO, '<!-- diagram:landscape -->', '<!-- diagram:training -->')}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                <div className={styles.diagram}><TrainingIntegrationDiagram /></div>

                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {PART_TWO.split('<!-- diagram:training -->').slice(-1)[0]}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>

                {/* References */}
                <TypographyStylesProvider>
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {REFERENCES}
                        </ReactMarkdown>
                    </div>
                </TypographyStylesProvider>
            </article>
        </div>
    )
}

function extractBetween(text: string, startMarker: string, endMarker: string): string {
    const startIdx = text.indexOf(startMarker)
    const endIdx = text.indexOf(endMarker)
    if (startIdx === -1) return ''
    const start = startIdx + startMarker.length
    if (endIdx === -1) return text.slice(start)
    return text.slice(start, endIdx)
}
