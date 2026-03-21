import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profiles = await prisma.agentProfile.findMany({
      orderBy: { totalVerifications: 'desc' },
    })

    const agents = profiles.map((p) => ({
      name: p.name,
      framework: p.framework,
      totalVerifications: p.totalVerifications,
      passRate: Math.round(p.passRate * 10) / 10,
      firstSeen: p.firstSeen.toISOString(),
      lastSeen: p.lastSeen.toISOString(),
    }))

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Dashboard agents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
