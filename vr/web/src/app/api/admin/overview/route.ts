import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const clerk = await currentUser()
    if (!clerk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check isAdmin flag
    const dbUser = await prisma.user.findFirst({
      where: { neonId: clerk.id },
      select: { isAdmin: true },
    })
    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalApiKeys,
      activeApiKeys,
      totalVerifications,
      passCount,
      last7dVerifications,
      avgLatency,
      revenueAgg,
      topVerifiers,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.apiKey.count(),
      prisma.apiKey.count({ where: { revokedAt: null } }),
      prisma.verificationLog.count(),
      prisma.verificationLog.count({ where: { verdict: 'PASS' } }),
      prisma.verificationLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.verificationLog.aggregate({ _avg: { latencyMs: true } }),
      prisma.verificationLog.aggregate({ _sum: { costUsd: true } }),
      prisma.verificationLog.groupBy({
        by: ['verifierId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.verificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          verifierId: true,
          verdict: true,
          score: true,
          tier: true,
          latencyMs: true,
          agentName: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      totalUsers,
      totalApiKeys,
      activeApiKeys,
      totalVerifications,
      passRate: totalVerifications > 0
        ? Math.round((passCount / totalVerifications) * 1000) / 10
        : 0,
      last7dVerifications,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      totalRevenueUsd: Math.round((revenueAgg._sum.costUsd ?? 0) * 100) / 100,
      topVerifiers: topVerifiers.map((v) => ({
        verifierId: v.verifierId,
        count: v._count.id,
      })),
      recentLogs: recentLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Admin overview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
