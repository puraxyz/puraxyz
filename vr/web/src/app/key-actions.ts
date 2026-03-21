'use server'

import { randomBytes, createHash } from 'crypto'
import { neon } from '@neondatabase/serverless'
import { currentUser } from '@clerk/nextjs/server'

const MAX_ACTIVE_KEYS = 5
const KEY_PREFIX = 'vr_live_'

function hashKey(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
}

async function resolveUserId(): Promise<number> {
    const user = await currentUser()
    if (!user) throw new Error('Must be signed in')

    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`SELECT id FROM users WHERE neon_id = ${user.id};`
    if (!rows.length) throw new Error('User not found in database')
    return rows[0].id
}

export async function createApiKey(name: string): Promise<{
    id: string
    key: string
    prefix: string
    name: string
}> {
    const userId = await resolveUserId()
    const sql = neon(process.env.DATABASE_URL!)

    const safeName = (name || 'Default').slice(0, 100)

    // Enforce max active keys
    const active = await sql`
        SELECT COUNT(*)::int AS count FROM api_keys
        WHERE user_id = ${userId} AND revoked_at IS NULL;
    `
    if (active[0].count >= MAX_ACTIVE_KEYS) {
        throw new Error(`Maximum of ${MAX_ACTIVE_KEYS} active API keys allowed`)
    }

    // Generate key: vr_live_ + 32 random hex chars
    const rawSecret = randomBytes(32).toString('hex')
    const fullKey = KEY_PREFIX + rawSecret
    const keyHash = hashKey(fullKey)
    const prefix = fullKey.slice(0, 16) // "vr_live_XXXXXXXX"

    const rows = await sql`
        INSERT INTO api_keys (user_id, key_hash, prefix, name)
        VALUES (${userId}, ${keyHash}, ${prefix}, ${safeName})
        RETURNING id;
    `

    // Increment total keys created counter (never decrements on revoke)
    await sql`
        UPDATE users SET total_keys_created = total_keys_created + 1
        WHERE id = ${userId};
    `

    return {
        id: rows[0].id,
        key: fullKey,
        prefix,
        name: safeName,
    }
}

export interface ApiKeyInfo {
    id: string
    prefix: string
    name: string
    createdAt: string
    revokedAt: string | null
    lastUsedAt: string | null
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
    const userId = await resolveUserId()
    const sql = neon(process.env.DATABASE_URL!)

    const rows = await sql`
        SELECT id, prefix, name, created_at, revoked_at, last_used_at
        FROM api_keys
        WHERE user_id = ${userId}
        ORDER BY created_at DESC;
    `

    return rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        prefix: String(r.prefix),
        name: String(r.name),
        createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
        revokedAt: r.revoked_at ? new Date(r.revoked_at as string).toISOString() : null,
        lastUsedAt: r.last_used_at ? new Date(r.last_used_at as string).toISOString() : null,
    }))
}

export async function revokeApiKey(keyId: string): Promise<{ success: boolean }> {
    const userId = await resolveUserId()
    const sql = neon(process.env.DATABASE_URL!)

    const rows = await sql`
        UPDATE api_keys
        SET revoked_at = NOW()
        WHERE id = ${keyId} AND user_id = ${userId} AND revoked_at IS NULL
        RETURNING id;
    `

    if (!rows.length) {
        throw new Error('Key not found or already revoked')
    }

    return { success: true }
}
