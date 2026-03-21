import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '30', 10)
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get all API keys for this user (by Clerk ID → users table)
    const dbUser = await prisma.user.findFirst({
      where: { neonId: user.id },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ usage: [], quotas: [] })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: dbUser.id, revokedAt: null },
      select: { id: true, prefix: true, name: true },
    })

    const keyIds = apiKeys.map((k) => k.id)

    // Aggregate usage per key per day
    const usageRows = await prisma.usageRecord.groupBy({
      by: ['apiKeyId'],
      where: {
        apiKeyId: { in: keyIds },
        createdAt: { gte: since },
      },
      _count: { id: true },
      _avg: { latencyMs: true },
    })

    // Get quota records
    const quotaRows = await prisma.quotaRecord.findMany({
      where: { apiKeyId: { in: keyIds } },
    })

    const keyMap = Object.fromEntries(apiKeys.map((k) => [k.id, k]))
    const quotaMap = Object.fromEntries(quotaRows.map((q) => [q.apiKeyId, q]))

    const usage = usageRows.map((row) => {
      const key = keyMap[row.apiKeyId]
      const quota = quotaMap[row.apiKeyId]
      return {
        apiKeyId: row.apiKeyId,
        prefix: key?.prefix ?? 'unknown',
        name: key?.name ?? 'Unknown',
        requestCount: row._count.id,
        avgLatencyMs: Math.round(row._avg.latencyMs ?? 0),
        dailyLimit: quota?.dailyLimit ?? 1000,
        monthlyLimit: quota?.monthlyLimit ?? 10000,
      }
    })

    return NextResponse.json({ usage, days })
  } catch (error) {
    console.error('Dashboard usage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
