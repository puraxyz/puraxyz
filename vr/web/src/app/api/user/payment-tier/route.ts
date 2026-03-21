import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const VALID_TIERS = ['free', 'testnet', 'mainnet'] as const
type PaymentTier = (typeof VALID_TIERS)[number]

// Tier upgrade rules: free → testnet → mainnet (no downgrades)
const TIER_ORDER: Record<PaymentTier, number> = {
  free: 0,
  testnet: 1,
  mainnet: 2,
}

export async function GET() {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT payment_tier, total_keys_created, lifetime_verifications
    FROM users WHERE neon_id = ${user.id}
  `
  if (!rows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    paymentTier: rows[0].payment_tier || 'free',
    totalKeysCreated: rows[0].total_keys_created || 0,
    lifetimeVerifications: rows[0].lifetime_verifications || 0,
  })
}

export async function PUT(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const newTier = body.tier as PaymentTier | undefined

  if (!newTier || !VALID_TIERS.includes(newTier)) {
    return NextResponse.json(
      { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
      { status: 400 }
    )
  }

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT payment_tier FROM users WHERE neon_id = ${user.id}
  `
  if (!rows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const currentTier = (rows[0].payment_tier || 'free') as PaymentTier
  if (TIER_ORDER[newTier] <= TIER_ORDER[currentTier]) {
    return NextResponse.json(
      { error: `Cannot downgrade from ${currentTier} to ${newTier}` },
      { status: 400 }
    )
  }

  await sql`
    UPDATE users SET payment_tier = ${newTier}, date_updated = NOW()
    WHERE neon_id = ${user.id}
  `

  return NextResponse.json({ paymentTier: newTier })
}
