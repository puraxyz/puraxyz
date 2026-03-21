'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import s from './PaymentFlowDiagram.module.css'

/* ───── flow steps ───── */
const PHASE_DURATION = 2400
const PHASES = ['key', 'call', 'gate', 'pay', 'hold'] as const
type Phase = (typeof PHASES)[number]

interface Tier {
  id: string
  label: string
  badge: string
  badgeClass: string
  steps: {
    keyIcon: string
    keySub: string
    callIcon: string
    callSub: string
    gateIcon: string
    gateSub: string
    payIcon: string
    paySub: string
    resultText: string
  }
}

const tiers: Tier[] = [
  {
    id: 'free',
    label: 'Free Tier',
    badge: 'FREE',
    badgeClass: 'badgeFree',
    steps: {
      keyIcon: '🔑',
      keySub: 'Sign up → get API key',
      callIcon: '📡',
      callSub: 'POST /v1/verify',
      gateIcon: '✅',
      gateSub: '< 1 000 calls - no charge',
      payIcon: '🆓',
      paySub: '$0.00 - open access',
      resultText: '✓ Verified - free tier',
    },
  },
  {
    id: 'testnet',
    label: 'Testnet',
    badge: 'TESTNET',
    badgeClass: 'badgeTestnet',
    steps: {
      keyIcon: '🔑',
      keySub: 'Enable testnet on dashboard',
      callIcon: '📡',
      callSub: 'POST /v1/verify',
      gateIcon: '💳',
      gateSub: 'x402 header → Base Sepolia',
      payIcon: '🪙',
      paySub: 'USDC on testnet - $0.005',
      resultText: '✓ Verified - testnet USDC',
    },
  },
  {
    id: 'mainnet',
    label: 'Mainnet',
    badge: 'MAINNET',
    badgeClass: 'badgeMainnet',
    steps: {
      keyIcon: '🔑',
      keySub: 'Upgrade to mainnet billing',
      callIcon: '📡',
      callSub: 'POST /v1/verify',
      gateIcon: '💳',
      gateSub: 'x402 header → Base mainnet',
      payIcon: '💰',
      paySub: 'Real USDC - $0.005/call',
      resultText: '✓ Verified - mainnet USDC',
    },
  },
]

export default function PaymentFlowDiagram() {
  const [tierIdx, setTierIdx] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tier = tiers[tierIdx]
  const phase = PHASES[phaseIdx]

  const startAnimation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhaseIdx(0)
    timerRef.current = setInterval(() => {
      setPhaseIdx((prev) => {
        if (prev >= PHASES.length - 1) {
          setTierIdx((ti) => (ti + 1) % tiers.length)
          return 0
        }
        return prev + 1
      })
    }, PHASE_DURATION)
  }, [])

  useEffect(() => {
    startAnimation()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [startAnimation])

  const selectTier = (idx: number) => {
    setTierIdx(idx)
    setPhaseIdx(0)
    startAnimation()
  }

  const stepPhases: Phase[] = ['key', 'call', 'gate', 'pay']
  const stepClass = (stepPhase: Phase) => {
    const stepI = stepPhases.indexOf(stepPhase)
    const currentI = stepPhases.indexOf(phase)
    const actualCurrent = phase === 'hold' ? 3 : currentI
    if (stepI === actualCurrent) return `${s.step} ${s.active}`
    if (stepI < actualCurrent || phase === 'hold') return `${s.step} ${s.done}`
    return s.step
  }

  const arrowClass = (afterPhase: Phase) => {
    const afterI = stepPhases.indexOf(afterPhase)
    const currentI = phase === 'hold' ? 4 : stepPhases.indexOf(phase)
    if (afterI + 1 === currentI) return `${s.arrow} ${s.lit} ${s.traveling}`
    if (afterI < currentI) return `${s.arrow} ${s.lit}`
    return s.arrow
  }

  const resultVisible = phase === 'pay' || phase === 'hold'

  return (
    <div className={s.wrapper}>
      <div className={s.flow}>
        {/* Step 1: API Key */}
        <div className={stepClass('key')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {tier.steps.keyIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>Get API Key</div>
            <div className={s.sublabel}>{tier.steps.keySub}</div>
          </div>
        </div>

        <div className={arrowClass('key')}>
          <div className={s.arrowLine}><div className={s.dot} /></div>
        </div>

        {/* Step 2: API Call */}
        <div className={stepClass('call')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {tier.steps.callIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>API Call</div>
            <div className={s.sublabel}>{tier.steps.callSub}</div>
          </div>
        </div>

        <div className={arrowClass('call')}>
          <div className={s.arrowLine}><div className={s.dot} /></div>
        </div>

        {/* Step 3: Payment Gate */}
        <div className={stepClass('gate')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {tier.steps.gateIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>Payment Gate</div>
            <div className={s.sublabel}>{tier.steps.gateSub}</div>
          </div>
        </div>

        <div className={arrowClass('gate')}>
          <div className={s.arrowLine}><div className={s.dot} /></div>
        </div>

        {/* Step 4: Settlement */}
        <div className={stepClass('pay')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {tier.steps.payIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>Settlement</div>
            <div className={s.sublabel}>{tier.steps.paySub}</div>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className={`${s.result} ${resultVisible ? s.visible : ''}`}>
        <span className={`${s.badge} ${s[tier.badgeClass]}`}>{tier.badge}</span>
        <span className={s.resultText}>{tier.steps.resultText}</span>
      </div>

      {/* Tier selector pills */}
      <div className={s.pills}>
        {tiers.map((t, i) => (
          <button
            key={t.id}
            className={`${s.pill} ${i === tierIdx ? s.pillActive : ''}`}
            onClick={() => selectTier(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
