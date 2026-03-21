import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groups = await prisma.verificationLog.groupBy({
      by: ['verifierId', 'tier'],
      _count: { id: true },
      _avg: { latencyMs: true, score: true },
    })

    // Compute pass counts via a separate query
    const passCounts = await prisma.verificationLog.groupBy({
      by: ['verifierId'],
      where: { verdict: 'PASS' },
      _count: { id: true },
    })
    const passMap = new Map(passCounts.map((p) => [p.verifierId, p._count.id]))

    const verifiers = groups.map((g) => {
      const total = g._count.id
      const passed = passMap.get(g.verifierId) ?? 0
      return {
        verifierId: g.verifierId,
        tier: g.tier,
        domain: g.verifierId.split('.')[0],
        runCount: total,
        passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
        avgLatencyMs: Math.round(g._avg.latencyMs ?? 0),
        avgScore: Math.round((g._avg.score ?? 0) * 1000) / 1000,
      }
    })

    verifiers.sort((a, b) => b.runCount - a.runCount)

    return NextResponse.json({ verifiers })
  } catch (error) {
    console.error('Dashboard verifiers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
