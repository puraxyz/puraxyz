'use server'

import { currentUser } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

export async function acknowledgeCookie() {
    const user = await currentUser()

    if (!user) {
        return
    }

    const sql = neon(process.env.DATABASE_URL!)

    const response = await sql`
        UPDATE users
        SET cookie_ack = true, date_updated = NOW()
        WHERE neon_id = ${user.id}
        RETURNING cookie_ack;
    `

    if (response.length === 0) {
        throw new Error("Failed to update cookie acknowledgment")
    }

    return response[0].cookie_ack
}

export async function getCookieAcknowledgment(): Promise<boolean> {
    const user = await currentUser()

    if (!user) {
        return false
    }

    const sql = neon(process.env.DATABASE_URL!)

    const response = await sql`
        SELECT cookie_ack
        FROM users
        WHERE neon_id = ${user.id}
        LIMIT 1;
    `

    if (response.length === 0) {
        return false
    }

    return response[0].cookie_ack === true
}
