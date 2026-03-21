import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalRuns, passCount, avgLatency, uniqueAgents, uniqueVerifiers] =
      await Promise.all([
        prisma.verificationLog.count(),
        prisma.verificationLog.count({ where: { verdict: 'PASS' } }),
        prisma.verificationLog.aggregate({ _avg: { latencyMs: true } }),
        prisma.verificationLog.groupBy({ by: ['agentName'], where: { agentName: { not: null } } }).then(r => r.length),
        prisma.verificationLog.groupBy({ by: ['verifierId'] }).then(r => r.length),
      ])

    return NextResponse.json({
      totalRuns,
      passRate: totalRuns > 0 ? Math.round((passCount / totalRuns) * 1000) / 10 : 0,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      uniqueAgents,
      uniqueVerifiers,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
