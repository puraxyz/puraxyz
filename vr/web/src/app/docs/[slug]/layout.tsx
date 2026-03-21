import type { Metadata } from 'next'
import docs from '../docs'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const doc = docs.find(d => d.slug === slug)
    if (!doc) return {}
    return {
        title: `${doc.title} | vr.dev Docs`,
        description: doc.description,
    }
}

export default function DocSlugLayout({ children }: { children: React.ReactNode }) {
    return children
}
