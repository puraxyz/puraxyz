'use client'

import Link from 'next/link'
import { LuArrowRight, LuBook, LuCode, LuFileText, LuTerminal, LuPlug, LuLightbulb, LuPlay } from 'react-icons/lu'
import docs from './docs'
import styles from './page.module.css'

const ICONS: Record<string, React.ReactNode> = {
    quickstart: <LuBook size={20} />,
    concepts: <LuLightbulb size={20} />,
    'api-reference': <LuCode size={20} />,
    'verifier-authoring': <LuFileText size={20} />,
    'cli-reference': <LuTerminal size={20} />,
    'integration-guide': <LuPlug size={20} />,
    examples: <LuPlay size={20} />,
}

export default function DocsPage() {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Documentation</h1>
                <p>Guides and references for the vr.dev SDK, API, and CLI.</p>
            </div>

            <div className={styles.grid}>
                {docs.map((doc) => (
                    <Link key={doc.slug} href={`/docs/${doc.slug}`} className={styles.card}>
                        <div className={styles.cardIcon}>
                            {ICONS[doc.slug] || <LuFileText size={20} />}
                        </div>
                        <div className={styles.cardContent}>
                            <h3>{doc.title}</h3>
                            <p>{doc.description}</p>
                        </div>
                        <LuArrowRight size={16} className={styles.cardArrow} />
                    </Link>
                ))}
            </div>
        </div>
    )
}
