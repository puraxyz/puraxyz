'use client'

import { useState } from 'react'
import styles from './page.module.css'

interface ProofStep {
    sibling: string
    direction: string
}

interface ProofResult {
    artifact_hash: string
    merkle_root: string
    proof: ProofStep[]
    batch_id: string
    tx_hash: string | null
    chain: string
    verified: boolean
}

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org/tx/'
const BASE_EXPLORER = 'https://basescan.org/tx/'

export default function VerifyEvidence() {
    const [hash, setHash] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<ProofResult | null>(null)

    const apiBase = process.env.NEXT_PUBLIC_VR_API_URL || ''

    async function handleLookup() {
        const trimmed = hash.trim()
        if (!trimmed) return

        setLoading(true)
        setError('')
        setResult(null)

        try {
            const resp = await fetch(`${apiBase}/v1/evidence/${trimmed}/proof`, {
                headers: { 'X-API-Key': 'public' },
            })
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}))
                setError(data.detail || `Error ${resp.status}`)
                return
            }
            const data: ProofResult = await resp.json()
            setResult(data)
        } catch {
            setError('Failed to connect to verification API')
        } finally {
            setLoading(false)
        }
    }

    function explorerUrl(txHash: string, chain: string) {
        const base = chain === 'base' ? BASE_EXPLORER : BASE_SEPOLIA_EXPLORER
        return `${base}${txHash}`
    }

    return (
        <div className={styles.verify}>
            <div className={styles.content}>
                <h1>Verify Evidence</h1>
                <p className={styles.subtitle}>
                    Look up an artifact hash to verify its Merkle inclusion proof
                    and on-chain anchor. Evidence is tamper-evident: any
                    modification invalidates the proof chain.
                </p>

                <div className={styles.searchBox}>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Enter artifact hash (sha256:…)"
                        value={hash}
                        onChange={(e) => setHash(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    />
                    <button
                        className={styles.button}
                        onClick={handleLookup}
                        disabled={loading || !hash.trim()}
                    >
                        {loading ? 'Checking…' : 'Verify'}
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                {result && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultRow}>
                            <span className={styles.resultLabel}>Status</span>
                            <span
                                className={
                                    result.verified
                                        ? styles.verified
                                        : styles.unverified
                                }
                            >
                                {result.verified
                                    ? '✓ Verified'
                                    : '✗ Not Verified'}
                            </span>
                        </div>

                        <div className={styles.resultRow}>
                            <span className={styles.resultLabel}>
                                Artifact Hash
                            </span>
                            <span className={styles.resultValue}>
                                {result.artifact_hash}
                            </span>
                        </div>

                        <div className={styles.resultRow}>
                            <span className={styles.resultLabel}>
                                Merkle Root
                            </span>
                            <span className={styles.resultValue}>
                                {result.merkle_root}
                            </span>
                        </div>

                        <div className={styles.resultRow}>
                            <span className={styles.resultLabel}>Batch ID</span>
                            <span className={styles.resultValue}>
                                {result.batch_id}
                            </span>
                        </div>

                        <div className={styles.resultRow}>
                            <span className={styles.resultLabel}>Chain</span>
                            <span className={styles.resultValue}>
                                {result.chain}
                            </span>
                        </div>

                        {result.tx_hash && (
                            <div className={styles.resultRow}>
                                <span className={styles.resultLabel}>
                                    Tx Hash
                                </span>
                                <a
                                    className={styles.chainLink}
                                    href={explorerUrl(
                                        result.tx_hash,
                                        result.chain
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {result.tx_hash}
                                </a>
                            </div>
                        )}

                        {result.proof.length > 0 && (
                            <>
                                <h3 className={styles.sectionTitle}>
                                    Inclusion Proof ({result.proof.length} steps)
                                </h3>
                                <ul className={styles.proofList}>
                                    {result.proof.map((step, i) => (
                                        <li key={i}>
                                            {step.direction}: {step.sibling}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
