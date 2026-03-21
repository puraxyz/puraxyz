import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 90)
    const since = new Date()
    since.setDate(since.getDate() - days)

    const logs = await prisma.verificationLog.findMany({
      where: { createdAt: { gte: since } },
      select: { verdict: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Bucket by date
    const buckets = new Map<string, { total: number; pass: number }>()
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10)
      const b = buckets.get(day) ?? { total: 0, pass: 0 }
      b.total++
      if (log.verdict === 'PASS') b.pass++
      buckets.set(day, b)
    }

    const timeline = Array.from(buckets.entries()).map(([date, b]) => ({
      date,
      total: b.total,
      passRate: b.total > 0 ? Math.round((b.pass / b.total) * 1000) / 10 : 0,
    }))

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Dashboard timeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
