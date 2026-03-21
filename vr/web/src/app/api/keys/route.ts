import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createApiKey, listApiKeys } from '@/app/key-actions'

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const keys = await listApiKeys()
        return NextResponse.json({ keys })
    } catch (error) {
        console.error('List keys error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const name = typeof body.name === 'string' ? body.name.trim() : 'Default'

        if (!name || name.length > 100) {
            return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
        }

        const result = await createApiKey(name)
        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        const status = message.includes('Maximum') ? 429 : 500
        console.error('Create key error:', error)
        return NextResponse.json({ error: message }, { status })
    }
}
