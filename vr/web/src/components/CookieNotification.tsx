'use client'

import { useState, useEffect } from 'react'
import { Button, Text, Paper } from '@mantine/core'
import Link from 'next/link'
import { acknowledgeCookie, getCookieAcknowledgment } from '@/app/actions'

const STORAGE_KEY = 'cookie_ack'

export default function CookieNotification() {
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkAcknowledgment() {
            try {
                // Check localStorage first (works for all users)
                if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
                    setLoading(false)
                    return
                }
                // Fall back to server check (logged-in users)
                const acknowledged = await getCookieAcknowledgment()
                if (!acknowledged) {
                    setVisible(true)
                }
            } catch (error) {
                console.error('Error checking cookie acknowledgment:', error)
                setVisible(true)
            } finally {
                setLoading(false)
            }
        }
        checkAcknowledgment()
    }, [])

    if (loading || !visible) return null

    return (
        <Paper
            shadow="md"
            radius="md"
            p="md"
            style={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                zIndex: 1000,
                maxWidth: 300,
            }}
        >
            <Text size="sm" c="white" mb="xs">
                We use cookies to improve your experience. By using our site, you agree to our{' '}
                <Link href="/terms" style={{ color: '#90caf9', textDecoration: 'underline' }}>
                    Terms of Service
                </Link>{' '}
                and Cookie Policy.
            </Text>
            <Button
                size="xs"
                color="blue.3"
                c="dark"
                onClick={async () => {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(STORAGE_KEY, 'true')
                    }
                    await acknowledgeCookie()
                    setVisible(false)
                }}
            >
                Dismiss
            </Button>
        </Paper>
    )
}
