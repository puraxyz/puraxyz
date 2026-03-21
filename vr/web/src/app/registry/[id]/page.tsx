'use client'

import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import {
    Container, Title, Text, Badge, Group, Stack, Card, Code,
    Table, Anchor, Divider,
} from '@mantine/core'
import { LuArrowLeft, LuShield, LuFileText } from 'react-icons/lu'
import registryData from '@/data/registry.json'

type Verifier = (typeof registryData)[number]

const TIER_COLORS: Record<string, string> = {
    HARD: 'green',
    SOFT: 'yellow',
    AGENTIC: 'violet',
}

export default function VerifierDetailPage() {
    const { id } = useParams<{ id: string }>()
    const verifier = registryData.find((v: Verifier) => v.id === `vr/${id}`)

    if (!verifier) return notFound()

    const sc = verifier.scorecard as Record<string, unknown>
    const attackSurface = sc.attack_surface as Record<string, string> | undefined
    const totalFixtures =
        verifier.fixture_counts.positive +
        verifier.fixture_counts.negative +
        verifier.fixture_counts.adversarial

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Anchor component={Link} href="/registry" size="sm" c="dimmed">
                    <Group gap={4}><LuArrowLeft size={14} /> Back to Registry</Group>
                </Anchor>

                <div>
                    <Group gap="md" mb="xs">
                        <Title order={2} style={{ fontFamily: 'monospace' }}>{id}</Title>
                        <Badge color={TIER_COLORS[verifier.tier] || 'gray'} size="lg" variant="light">
                            {verifier.tier}
                        </Badge>
                    </Group>
                    <Text c="dimmed" size="lg">{verifier.description}</Text>
                </div>

                <Divider />

                {/* Scorecard */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <LuShield size={18} />
                        <Text fw={600}>Scorecard</Text>
                    </Group>
                    <Table>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td fw={500} w={200}>Determinism</Table.Td>
                                <Table.Td>{String(sc.determinism ?? '-')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Evidence Quality</Table.Td>
                                <Table.Td>{String(sc.evidence_quality ?? '-')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Intended Use</Table.Td>
                                <Table.Td>{String(sc.intended_use ?? '-')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Gating Required</Table.Td>
                                <Table.Td>{sc.gating_required ? 'Yes' : 'No'}</Table.Td>
                            </Table.Tr>
                            {Array.isArray(sc.recommended_gates) && (sc.recommended_gates as string[]).length > 0 ? (
                                <Table.Tr>
                                    <Table.Td fw={500}>Recommended Gates</Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            {(sc.recommended_gates as string[]).map((g: string) => (
                                                <Badge key={g} size="sm" variant="outline">
                                                    <Anchor component={Link} href={`/registry/${g.replace('vr/', '')}`} size="sm">
                                                        {g.replace('vr/', '')}
                                                    </Anchor>
                                                </Badge>
                                            ))}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ) : null}
                            <Table.Tr>
                                <Table.Td fw={500}>Permissions</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        {verifier.permissions_required.length > 0
                                            ? verifier.permissions_required.map((p: string) => (
                                                <Badge key={p} size="sm" variant="dot">{p}</Badge>
                                            ))
                                            : <Text size="sm" c="dimmed">None</Text>
                                        }
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Card>

                {/* Attack Surface (SOFT verifiers) */}
                {attackSurface && (
                    <Card withBorder radius="md" p="lg">
                        <Text fw={600} mb="md">Attack Surface</Text>
                        <Table>
                            <Table.Tbody>
                                {Object.entries(attackSurface).map(([k, v]) => (
                                    <Table.Tr key={k}>
                                        <Table.Td fw={500} w={200}>{k.replace(/_/g, ' ')}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                color={v === 'low' ? 'green' : v === 'medium' ? 'yellow' : 'red'}
                                                variant="light"
                                            >
                                                {v}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {/* Fixtures */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <LuFileText size={18} />
                        <Text fw={600}>Test Fixtures</Text>
                        <Badge size="sm" variant="light">{totalFixtures} total</Badge>
                    </Group>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Count</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td>Positive</Table.Td>
                                <Table.Td>{verifier.fixture_counts.positive}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>Negative</Table.Td>
                                <Table.Td>{verifier.fixture_counts.negative}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>Adversarial</Table.Td>
                                <Table.Td>{verifier.fixture_counts.adversarial}</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Card>

                {/* Metadata */}
                <Card withBorder radius="md" p="lg">
                    <Text fw={600} mb="md">Metadata</Text>
                    <Table>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td fw={500} w={200}>Version</Table.Td>
                                <Table.Td>{verifier.version}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Domain</Table.Td>
                                <Table.Td>{verifier.domain}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Task Type</Table.Td>
                                <Table.Td>{verifier.task_type}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td fw={500}>Contributor</Table.Td>
                                <Table.Td>{verifier.contributor}</Table.Td>
                            </Table.Tr>
                            {verifier.source_citation && (
                                <Table.Tr>
                                    <Table.Td fw={500}>Source</Table.Td>
                                    <Table.Td>{verifier.source_citation}</Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Card>

                {/* Use in SDK */}
                <Card withBorder radius="md" p="lg">
                    <Text fw={600} mb="md">Use in SDK</Text>
                    <Code block>
{`# CLI
vr verify --verifier ${id} --ground-truth '{"order_id": "ORD-42"}'

# Python
from vrdev import verify
result = verify("${id}", ground_truth={"order_id": "ORD-42"})

# API
curl -X POST https://api.vr.dev/v1/verify \\
  -H "X-API-Key: vr_live_..." \\
  -d '{"verifier": "${id}", "ground_truth": {"order_id": "ORD-42"}}'`}
                    </Code>
                </Card>
            </Stack>
        </Container>
    )
}
