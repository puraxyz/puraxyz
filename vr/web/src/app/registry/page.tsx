'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
    Container, Title, Text, TextInput, SimpleGrid, Card, Badge,
    Group, Stack, Select, Button, Textarea,
} from '@mantine/core'
import { LuSearch } from 'react-icons/lu'
import registryData from '@/data/registry.json'

type Verifier = (typeof registryData)[number]

const TIER_COLORS: Record<string, string> = {
    HARD: 'green',
    SOFT: 'yellow',
    AGENTIC: 'violet',
}

const COST_LABELS: Record<string, { label: string; color: string }> = {
    HARD: { label: 'free', color: 'green' },
    SOFT: { label: '$', color: 'yellow' },
    AGENTIC: { label: '$$', color: 'violet' },
}

function formatLatency(ms: number | null | undefined): string {
    if (ms == null) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

const ALL_DOMAINS = ['all', ...Array.from(new Set(registryData.map(v => v.domain))).sort()]

export default function RegistryPage() {
    const [search, setSearch] = useState('')
    const [tierFilter, setTierFilter] = useState<string | null>(null)
    const [domainFilter, setDomainFilter] = useState<string | null>('all')
    const [requestDomain, setRequestDomain] = useState('')
    const [requestDesc, setRequestDesc] = useState('')
    const [requestSubmitted, setRequestSubmitted] = useState(false)

    const filtered = useMemo(() => {
        return registryData.filter((v: Verifier) => {
            if (tierFilter && v.tier !== tierFilter) return false
            if (domainFilter && domainFilter !== 'all' && v.domain !== domainFilter) return false
            if (search) {
                const q = search.toLowerCase()
                return (
                    v.id.toLowerCase().includes(q) ||
                    v.description.toLowerCase().includes(q) ||
                    v.domain.toLowerCase().includes(q) ||
                    v.task_type.toLowerCase().includes(q)
                )
            }
            return true
        })
    }, [search, tierFilter, domainFilter])

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={2} mb="xs">Verifier Registry</Title>
                    <Text c="dimmed">
                        {registryData.length} verifiers across {ALL_DOMAINS.length - 1} domains, organised into three tiers: HARD
                        (deterministic state probes), SOFT (LLM-judged rubrics), and AGENTIC (multi-step
                        tool-use checks). Browse below or filter by tier and domain.
                    </Text>
                </div>

                <Group gap="md">
                    <TextInput
                        placeholder="Search verifiers..."
                        leftSection={<LuSearch size={16} />}
                        value={search}
                        onChange={e => setSearch(e.currentTarget.value)}
                        style={{ flex: 1, minWidth: 200 }}
                    />
                    <Select
                        placeholder="Tier"
                        data={[
                            { value: '', label: 'All Tiers' },
                            { value: 'HARD', label: 'HARD' },
                            { value: 'SOFT', label: 'SOFT' },
                            { value: 'AGENTIC', label: 'AGENTIC' },
                        ]}
                        value={tierFilter}
                        onChange={v => setTierFilter(v || null)}
                        clearable
                        w={140}
                    />
                    <Select
                        placeholder="Domain"
                        data={ALL_DOMAINS.map(d => ({ value: d, label: d === 'all' ? 'All Domains' : d }))}
                        value={domainFilter}
                        onChange={v => setDomainFilter(v || 'all')}
                        w={160}
                    />
                </Group>

                <Text size="sm" c="dimmed">{filtered.length} verifier{filtered.length !== 1 ? 's' : ''}</Text>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {filtered.map((v: Verifier) => {
                        const slug = v.id.replace('vr/', '')
                        return (
                            <Card
                                key={v.id}
                                withBorder
                                radius="md"
                                p="lg"
                                component={Link}
                                href={`/registry/${slug}`}
                                style={{ textDecoration: 'none', cursor: 'pointer' }}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Text fw={600} size="sm" style={{ fontFamily: 'monospace' }}>
                                        {slug}
                                    </Text>
                                    <Badge color={TIER_COLORS[v.tier] || 'gray'} size="sm" variant="light">
                                        {v.tier}
                                    </Badge>
                                </Group>
                                <Text size="sm" c="dimmed" lineClamp={3} mb="sm">
                                    {v.description}
                                </Text>
                                <Group gap="xs" wrap="wrap">
                                    <Badge size="xs" variant="outline" color="gray">{v.domain}</Badge>
                                    <Badge size="xs" variant="light" color="blue">
                                        {formatLatency((v as Record<string, unknown>).latency_p50_ms as number)}
                                    </Badge>
                                    <Badge size="xs" variant="light" color={COST_LABELS[v.tier]?.color || 'gray'}>
                                        {COST_LABELS[v.tier]?.label || '?'}
                                    </Badge>
                                    {v.permissions_required.slice(0, 2).map((p: string) => (
                                        <Badge key={p} size="xs" variant="dot" color="gray">{p}</Badge>
                                    ))}
                                    <Badge size="xs" variant="light" color="teal">
                                        {v.fixture_counts.positive}+ / {v.fixture_counts.negative}&minus; / {v.fixture_counts.adversarial} adv
                                    </Badge>
                                </Group>
                            </Card>
                        )
                    })}
                </SimpleGrid>

                {/* Request a Verifier */}
                <Card withBorder radius="md" p="xl" mt="xl">
                    <Title order={3} mb="xs">Missing a verifier?</Title>
                    <Text size="sm" c="dimmed" mb="md">
                        Tell us what domain or task you need verified and we&apos;ll prioritize it.
                        You can also{' '}
                        <a href="https://github.com/vrDotDev/vr-dev/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-violet-5)' }}>
                            build your own
                        </a>{' '}
                        or browse{' '}
                        <a href="https://github.com/vrDotDev/vr-dev/blob/main/CONTRIBUTING.md#ideas-for-verifiers" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-violet-5)' }}>
                            verifier ideas
                        </a>.
                    </Text>
                    {requestSubmitted ? (
                        <Text c="green" fw={500}>Thanks! We&apos;ll review your request.</Text>
                    ) : (
                        <Stack gap="sm">
                            <TextInput
                                placeholder="Domain (e.g. finance, healthcare, logistics)"
                                value={requestDomain}
                                onChange={e => setRequestDomain(e.currentTarget.value)}
                            />
                            <Textarea
                                placeholder="Describe what the verifier should check..."
                                value={requestDesc}
                                onChange={e => setRequestDesc(e.currentTarget.value)}
                                minRows={2}
                            />
                            <Group gap="sm">
                                <Button
                                    variant="light"
                                    disabled={!requestDomain.trim() || !requestDesc.trim()}
                                    onClick={() => setRequestSubmitted(true)}
                                >
                                    Submit Request
                                </Button>
                                <Button
                                    variant="subtle"
                                    component="a"
                                    href="https://github.com/vrDotDev/vr-dev/issues/new?template=verifier_request.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open on GitHub
                                </Button>
                            </Group>
                        </Stack>
                    )}
                </Card>
            </Stack>
        </Container>
    )
}
