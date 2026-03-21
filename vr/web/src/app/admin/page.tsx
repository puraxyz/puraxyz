'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect, RedirectType } from 'next/navigation'
import { Container, Table, Loader, Badge } from '@mantine/core'
import styles from './page.module.css'

interface Overview {
  totalUsers: number
  totalApiKeys: number
  activeApiKeys: number
  totalVerifications: number
  passRate: number
  last7dVerifications: number
  avgLatencyMs: number
  totalRevenueUsd: number
  topVerifiers: { verifierId: string; count: number }[]
  recentLogs: {
    id: string
    verifierId: string
    verdict: string
    score: number | null
    tier: string | null
    latencyMs: number | null
    agentName: string | null
    createdAt: string
  }[]
}

const VERDICT_COLORS: Record<string, string> = {
  PASS: 'green',
  FAIL: 'red',
  ERROR: 'orange',
  SKIP: 'gray',
}

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useUser()
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/', RedirectType.replace)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/admin/overview')
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true)
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (d) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isSignedIn])

  if (!isLoaded || !isSignedIn) return null

  if (loading) {
    return (
      <Container className={styles.page}>
        <Loader size="lg" style={{ display: 'block', margin: '120px auto' }} />
      </Container>
    )
  }

  if (forbidden || !data) {
    return (
      <Container className={styles.page}>
        <div className={styles.forbidden}>Access denied. Admin privileges required.</div>
      </Container>
    )
  }

  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>Admin</h1>
      <p className={styles.subtitle}>Platform-wide KPIs and activity</p>

      {/* ── Stats Row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Users</div>
          <div className={styles.statValue}>{(data.totalUsers ?? 0).toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active API Keys</div>
          <div className={styles.statValue}>{data.activeApiKeys ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Verifications</div>
          <div className={styles.statValue}>{(data.totalVerifications ?? 0).toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pass Rate</div>
          <div className={styles.statValue}>{data.passRate ?? 0}%</div>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Last 7d Runs</div>
          <div className={styles.statValue}>{(data.last7dVerifications ?? 0).toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Latency</div>
          <div className={styles.statValue}>{data.avgLatencyMs ?? 0}ms</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Revenue (USD)</div>
          <div className={styles.statValue}>${(data.totalRevenueUsd ?? 0).toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total API Keys</div>
          <div className={styles.statValue}>{data.totalApiKeys ?? 0}</div>
        </div>
      </div>

      {/* ── Top Verifiers ── */}
      {data.topVerifiers.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionTitle}>Top Verifiers (by usage)</div>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Verifier</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Runs</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.topVerifiers.map((v) => (
                <Table.Tr key={v.verifierId}>
                  <Table.Td><code>{v.verifierId}</code></Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{v.count.toLocaleString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {/* ── Recent Logs ── */}
      {data.recentLogs.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionTitle}>Recent Verifications</div>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Verifier</Table.Th>
                <Table.Th>Verdict</Table.Th>
                <Table.Th>Tier</Table.Th>
                <Table.Th>Agent</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Latency</Table.Th>
                <Table.Th>Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recentLogs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td><code>{log.verifierId}</code></Table.Td>
                  <Table.Td>
                    <Badge color={VERDICT_COLORS[log.verdict] ?? 'gray'} size="sm">
                      {log.verdict}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{log.tier ?? '—'}</Table.Td>
                  <Table.Td>{log.agentName ?? '—'}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {log.latencyMs != null ? `${log.latencyMs}ms` : '—'}
                  </Table.Td>
                  <Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Container>
  )
}
