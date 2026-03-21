import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

interface LogPayload {
  verifierId: string
  verdict: string
  score: number
  tier: string
  agentName?: string
  agentFramework?: string
  sessionId?: string
  latencyMs?: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as LogPayload

    if (!body.verifierId || !body.verdict || body.score == null || !body.tier) {
      return NextResponse.json(
        { error: 'verifierId, verdict, score, and tier are required' },
        { status: 400 },
      )
    }

    const validVerdicts = ['PASS', 'FAIL', 'ERROR']
    if (!validVerdicts.includes(body.verdict)) {
      return NextResponse.json(
        { error: `verdict must be one of: ${validVerdicts.join(', ')}` },
        { status: 400 },
      )
    }

    // Parse Clerk user id as integer (from neon_id mapping) - use a hash for now
    const userIdHash = Math.abs(
      user.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0),
    )

    const log = await prisma.verificationLog.create({
      data: {
        userId: userIdHash,
        verifierId: body.verifierId.slice(0, 128),
        verdict: body.verdict.slice(0, 16),
        score: Math.max(0, Math.min(1, body.score)),
        tier: body.tier.slice(0, 16),
        agentName: body.agentName?.slice(0, 128) ?? null,
        agentFramework: body.agentFramework?.slice(0, 64) ?? null,
        sessionId: body.sessionId?.slice(0, 128) ?? null,
        latencyMs: Math.max(0, Math.round(body.latencyMs ?? 0)),
      },
    })

    // Upsert agent profile if agentName is provided
    if (body.agentName) {
      const existing = await prisma.agentProfile.findUnique({
        where: { name: body.agentName.slice(0, 128) },
      })
      if (existing) {
        const newTotal = existing.totalVerifications + 1
        const newPassCount =
          (existing.passRate / 100) * existing.totalVerifications +
          (body.verdict === 'PASS' ? 1 : 0)
        await prisma.agentProfile.update({
          where: { name: existing.name },
          data: {
            lastSeen: new Date(),
            totalVerifications: newTotal,
            passRate: Math.round((newPassCount / newTotal) * 1000) / 10,
            framework: body.agentFramework?.slice(0, 64) ?? existing.framework,
          },
        })
      } else {
        await prisma.agentProfile.create({
          data: {
            name: body.agentName.slice(0, 128),
            framework: body.agentFramework?.slice(0, 64) ?? null,
            totalVerifications: 1,
            passRate: body.verdict === 'PASS' ? 100 : 0,
          },
        })
      }
    }

    return NextResponse.json({ id: log.id }, { status: 201 })
  } catch (error) {
    console.error('Verification log ingest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
