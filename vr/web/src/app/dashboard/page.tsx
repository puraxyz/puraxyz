'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect, RedirectType } from 'next/navigation'
import {
  Container, Table, Select, Loader, Text,
} from '@mantine/core'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import styles from './page.module.css'

// ── Types ───────────────────────────────────────────────────────────────────

interface Summary {
  totalRuns: number
  passRate: number
  avgLatencyMs: number
  uniqueAgents: number
  uniqueVerifiers: number
}

interface TimelinePoint {
  date: string
  total: number
  passRate: number
}

interface AgentRow {
  name: string
  framework: string | null
  totalVerifications: number
  passRate: number
  lastSeen: string
}

interface VerifierRow {
  verifierId: string
  tier: string
  domain: string
  runCount: number
  passRate: number
  avgLatencyMs: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function passRateColor(rate: number): string {
  if (rate >= 80) return 'var(--mantine-color-green-7)'
  if (rate >= 50) return 'var(--mantine-color-yellow-7)'
  return 'var(--mantine-color-red-7)'
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [verifiers, setVerifiers] = useState<VerifierRow[]>([])
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [days, setDays] = useState('30')

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/', RedirectType.replace)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    setLoading(true)
    Promise.all([
      fetch('/api/dashboard/summary').then(r => r.json()),
      fetch(`/api/dashboard/timeline?days=${days}`).then(r => r.json()),
      fetch('/api/dashboard/agents').then(r => r.json()),
      fetch('/api/dashboard/verifiers').then(r => r.json()),
    ])
      .then(([s, t, a, v]) => {
        setSummary(s)
        setTimeline(t.timeline ?? [])
        setAgents(a.agents ?? [])
        setVerifiers(v.verifiers ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isSignedIn, days])

  if (!isLoaded || !isSignedIn) return null

  if (loading) {
    return (
      <Container className={styles.page}>
        <Loader size="lg" style={{ display: 'block', margin: '120px auto' }} />
      </Container>
    )
  }

  // Empty state
  if (!summary || summary.totalRuns === 0) {
    return (
      <Container className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <div className={styles.emptyTitle}>No verification data yet</div>
          <div className={styles.emptyText}>
            Start running verifications through the API to see analytics here.
            Logs are ingested via <code>POST /api/verification-log</code>.
          </div>
        </div>
      </Container>
    )
  }

  const filteredVerifiers = tierFilter
    ? verifiers.filter(v => v.tier === tierFilter)
    : verifiers

  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Verification analytics and agent performance</p>

      {/* ── Stats Row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Runs</div>
          <div className={styles.statValue}>{summary.totalRuns.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pass Rate</div>
          <div className={styles.statValue} style={{ color: passRateColor(summary.passRate) }}>
            {summary.passRate}%
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Latency</div>
          <div className={styles.statValue}>{summary.avgLatencyMs}ms</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Agents</div>
          <div className={styles.statValue}>{summary.uniqueAgents}</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <Select
          size="xs"
          placeholder="Time range"
          data={[
            { value: '7', label: 'Last 7 days' },
            { value: '14', label: 'Last 14 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
          ]}
          value={days}
          onChange={v => setDays(v || '30')}
          w={160}
        />
        <Select
          size="xs"
          placeholder="All tiers"
          data={[
            { value: 'HARD', label: 'HARD' },
            { value: 'SOFT', label: 'SOFT' },
            { value: 'AGENTIC', label: 'AGENTIC' },
          ]}
          value={tierFilter}
          onChange={v => setTierFilter(v || null)}
          clearable
          w={140}
        />
      </div>

      {/* ── Timeline Chart ── */}
      {timeline.length > 0 && (
        <div className={styles.chartSection}>
          <div className={styles.chartTitle}>Verification Volume &amp; Pass Rate</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="var(--mantine-color-blue-6)"
                fill="var(--mantine-color-blue-6)"
                fillOpacity={0.15}
                name="Runs"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="passRate"
                stroke="var(--mantine-color-green-6)"
                fill="var(--mantine-color-green-6)"
                fillOpacity={0.1}
                name="Pass Rate %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Agent Table ── */}
      {agents.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionTitle}>Agents</div>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Framework</Table.Th>
                <Table.Th>Runs</Table.Th>
                <Table.Th>Pass Rate</Table.Th>
                <Table.Th>Last Seen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {agents.map(a => (
                <Table.Tr key={a.name}>
                  <Table.Td fw={500}>{a.name}</Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{a.framework ?? '-'}</Text></Table.Td>
                  <Table.Td>{a.totalVerifications}</Table.Td>
                  <Table.Td style={{ color: passRateColor(a.passRate) }}>{a.passRate}%</Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{new Date(a.lastSeen).toLocaleDateString()}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {/* ── Verifier Heatmap ── */}
      {filteredVerifiers.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionTitle}>
            Verifiers{tierFilter ? ` (${tierFilter})` : ''} - {filteredVerifiers.length} active
          </div>
          <div className={styles.heatmapGrid}>
            {filteredVerifiers.map(v => (
              <div
                key={v.verifierId}
                className={styles.heatmapTile}
                style={{
                  backgroundColor: `color-mix(in srgb, ${passRateColor(v.passRate)} 15%, var(--mantine-color-body))`,
                  border: `1px solid ${passRateColor(v.passRate)}`,
                }}
              >
                <div className={styles.heatmapTileId}>{v.verifierId}</div>
                <div className={styles.heatmapTileRate} style={{ color: passRateColor(v.passRate) }}>
                  {v.passRate}%
                </div>
                <Text size="xs" c="dimmed">{v.runCount} runs • {v.avgLatencyMs}ms</Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}
