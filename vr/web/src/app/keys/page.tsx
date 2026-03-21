'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect, RedirectType } from 'next/navigation'
import {
    Container, Title, Text, Button, TextInput, Modal, Table,
    ActionIcon, CopyButton, Badge, Group, Stack, Card, Tooltip,
    Alert,
} from '@mantine/core'
import { LuPlus, LuCopy, LuCheck, LuTrash2, LuCircleAlert, LuKey } from 'react-icons/lu'
import type { ApiKeyInfo } from '@/app/key-actions'

export default function KeysPage() {
    const { isLoaded, isSignedIn } = useUser()
    const [keys, setKeys] = useState<ApiKeyInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [keyName, setKeyName] = useState('')
    const [creating, setCreating] = useState(false)
    const [newKey, setNewKey] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            redirect('/', RedirectType.replace)
        }
    }, [isLoaded, isSignedIn])

    useEffect(() => {
        if (isSignedIn) fetchKeys()
    }, [isSignedIn])

    async function fetchKeys() {
        try {
            const res = await fetch('/api/keys')
            if (!res.ok) throw new Error('Failed to fetch keys')
            const data = await res.json()
            setKeys(data.keys)
        } catch {
            setError('Failed to load API keys')
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        setCreating(true)
        setError(null)
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: keyName || 'Default' }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to create key')
            }
            const data = await res.json()
            setNewKey(data.key)
            setKeyName('')
            await fetchKeys()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create key')
        } finally {
            setCreating(false)
        }
    }

    async function handleRevoke(keyId: string) {
        try {
            const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to revoke key')
            await fetchKeys()
        } catch {
            setError('Failed to revoke key')
        }
    }

    if (!isLoaded || !isSignedIn) return null

    const activeKeys = keys.filter(k => !k.revokedAt)
    const revokedKeys = keys.filter(k => k.revokedAt)

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Group justify="space-between" align="center">
                    <div>
                        <Title order={2}>API Keys</Title>
                        <Text size="sm" c="dimmed">
                            Manage keys for the vr.dev verification API
                        </Text>
                    </div>
                    <Button
                        leftSection={<LuPlus size={16} />}
                        onClick={() => {
                            setNewKey(null)
                            setCreateOpen(true)
                        }}
                    >
                        Create Key
                    </Button>
                </Group>

                {error && (
                    <Alert icon={<LuCircleAlert size={16} />} color="red" onClose={() => setError(null)} withCloseButton>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Text c="dimmed">Loading...</Text>
                ) : activeKeys.length === 0 ? (
                    <Card withBorder radius="md" p="xl" ta="center">
                        <Stack align="center" gap="sm">
                            <LuKey size={32} opacity={0.3} />
                            <Text c="dimmed">No API keys yet. Create one to get started.</Text>
                        </Stack>
                    </Card>
                ) : (
                    <Card withBorder radius="md" p={0}>
                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Key</Table.Th>
                                    <Table.Th>Created</Table.Th>
                                    <Table.Th>Last Used</Table.Th>
                                    <Table.Th />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {activeKeys.map(k => (
                                    <Table.Tr key={k.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{k.name}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" ff="monospace" c="dimmed">
                                                {k.prefix}{'•'.repeat(12)}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">
                                                {new Date(k.createdAt).toLocaleDateString()}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">
                                                {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Tooltip label="Revoke key">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => handleRevoke(k.id)}
                                                >
                                                    <LuTrash2 size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {revokedKeys.length > 0 && (
                    <>
                        <Title order={4} c="dimmed">Revoked Keys</Title>
                        <Card withBorder radius="md" p={0} opacity={0.6}>
                            <Table>
                                <Table.Tbody>
                                    {revokedKeys.map(k => (
                                        <Table.Tr key={k.id}>
                                            <Table.Td>
                                                <Text size="sm">{k.name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" ff="monospace" c="dimmed">
                                                    {k.prefix}{'•'.repeat(12)}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color="red" variant="light" size="sm">Revoked</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">
                                                    {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : ''}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Card>
                    </>
                )}
            </Stack>

            {/* Create Key Modal */}
            <Modal
                opened={createOpen}
                onClose={() => { setCreateOpen(false); setNewKey(null) }}
                title={newKey ? 'API Key Created' : 'Create API Key'}
                centered
            >
                {newKey ? (
                    <Stack gap="md">
                        <Alert icon={<LuCircleAlert size={16} />} color="yellow">
                            Copy this key now. You won&apos;t be able to see it again.
                        </Alert>
                        <TextInput
                            value={newKey}
                            readOnly
                            ff="monospace"
                            size="sm"
                            rightSection={
                                <CopyButton value={newKey}>
                                    {({ copied, copy }) => (
                                        <ActionIcon
                                            variant="subtle"
                                            color={copied ? 'green' : 'gray'}
                                            onClick={copy}
                                        >
                                            {copied ? <LuCheck size={16} /> : <LuCopy size={16} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            }
                        />
                        <Button onClick={() => { setCreateOpen(false); setNewKey(null) }}>
                            Done
                        </Button>
                    </Stack>
                ) : (
                    <Stack gap="md">
                        <TextInput
                            label="Key Name"
                            placeholder="e.g. Production, CI/CD, Local Dev"
                            value={keyName}
                            onChange={(e) => setKeyName(e.currentTarget.value)}
                            maxLength={100}
                        />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} loading={creating}>
                                Create
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    )
}
