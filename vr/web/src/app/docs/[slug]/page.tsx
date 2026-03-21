'use client'

import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown, { Components } from 'react-markdown'
import { TypographyStylesProvider } from '@mantine/core'
import { LuArrowLeft } from 'react-icons/lu'
import docs from '../docs'
import styles from './page.module.css'

function slugify(text: string) {
    return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '')
}

function extractHeadings(markdown: string) {
    const matches = markdown.match(/^## .+$/gm) || []
    return matches.map((line) => {
        const text = line.replace(/^## /, '')
        return { text, id: slugify(text) }
    })
}

const mdComponents: Components = {
    h2: ({ children }) => {
        const text = typeof children === 'string' ? children : String(children)
        return <h2 id={slugify(text)}>{children}</h2>
    },
}

export default function DocPage() {
    const { slug } = useParams<{ slug: string }>()
    const doc = docs.find(d => d.slug === slug)
    const currentIdx = docs.findIndex(d => d.slug === slug)

    if (!doc) return notFound()

    const headings = extractHeadings(doc.content)

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <Link href="/docs" className={styles.backLink}>
                    <LuArrowLeft size={14} /> All Docs
                </Link>
                <nav className={styles.nav}>
                    {docs.map((d) => (
                        <div key={d.slug}>
                            <Link
                                href={`/docs/${d.slug}`}
                                className={`${styles.navLink} ${d.slug === slug ? styles.navActive : ''}`}
                            >
                                {d.title}
                            </Link>
                            {d.slug === slug && headings.length > 0 && (
                                <div className={styles.subNav}>
                                    {headings.map((h) => (
                                        <a key={h.id} href={`#${h.id}`} className={styles.subNavLink}>
                                            {h.text}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <article className={styles.content}>
                <TypographyStylesProvider>
                    <ReactMarkdown components={mdComponents}>{doc.content}</ReactMarkdown>
                </TypographyStylesProvider>

                {/* Prev/Next */}
                <div className={styles.pagination}>
                    {currentIdx > 0 && (
                        <Link href={`/docs/${docs[currentIdx - 1].slug}`} className={styles.paginationLink}>
                            &larr; {docs[currentIdx - 1].title}
                        </Link>
                    )}
                    <span />
                    {currentIdx < docs.length - 1 && (
                        <Link href={`/docs/${docs[currentIdx + 1].slug}`} className={styles.paginationLink}>
                            {docs[currentIdx + 1].title} &rarr;
                        </Link>
                    )}
                </div>
            </article>
        </div>
    )
}
