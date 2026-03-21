import type { Metadata } from 'next'
import { verifierCount, domainCount } from '@/data/registryStats'

export const metadata: Metadata = {
    title: 'Verifier Registry | vr.dev',
    description: `Browse ${verifierCount} verifiers across ${domainCount} domains: deterministic state checks, rubric-based LLM judges, and agentic probes for AI agent verification.`,
}

export default function RegistryLayout({ children }: { children: React.ReactNode }) {
    return children
}
