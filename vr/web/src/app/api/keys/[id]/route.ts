import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { revokeApiKey } from '@/app/key-actions'

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
        }

        const result = await revokeApiKey(id)
        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        const status = message.includes('not found') ? 404 : 500
        console.error('Revoke key error:', error)
        return NextResponse.json({ error: message }, { status })
    }
}
