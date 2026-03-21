'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import s from './VerifierFlowDiagram.module.css'

/* ───── scenario data ───── */
interface Scenario {
  id: string
  label: string
  tier: 'HARD' | 'SOFT' | 'AGENTIC'
  verifier: string
  actionIcon: string
  actionLabel: string
  actionSub: string
  evidenceIcon: string
  evidenceLabel: string
  evidenceSub: string
  verifierIcon: string
  verifierSub: string
  resultScore: string
  resultEvidence: string
}

const scenarios: Scenario[] = [
  {
    id: 'retail',
    label: 'Cancel Order',
    tier: 'HARD',
    verifier: 'tau2.retail.order_cancelled',
    actionIcon: '🛒',
    actionLabel: 'Agent Action',
    actionSub: 'API: POST /orders/ORD-42/cancel',
    evidenceIcon: '📡',
    evidenceLabel: 'System State',
    evidenceSub: 'HTTP 200 + DB row captured',
    verifierIcon: '🔒',
    verifierSub: 'Assert order.status == cancelled',
    resultScore: '✓ PASS  1.0',
    resultEvidence: 'evidence: api-state',
  },
  {
    id: 'email',
    label: 'Send Email',
    tier: 'SOFT',
    verifier: 'rubric.email.tone_professional',
    actionIcon: '✉️',
    actionLabel: 'Agent Action',
    actionSub: 'Compose apology to customer',
    evidenceIcon: '📋',
    evidenceLabel: 'Email Content',
    evidenceSub: 'Extract subject + body + headers',
    verifierIcon: '🧠',
    verifierSub: 'LLM rubric: tone ≥ 0.8, no blame',
    resultScore: '✓ PASS  0.92',
    resultEvidence: 'evidence: llm-rubric',
  },
  {
    id: 'code',
    label: 'Write Code',
    tier: 'HARD',
    verifier: 'code.python.tests_pass',
    actionIcon: '💻',
    actionLabel: 'Agent Action',
    actionSub: 'Generate utils.py module',
    evidenceIcon: '⚙️',
    evidenceLabel: 'Test Execution',
    evidenceSub: 'Run pytest in sandbox',
    verifierIcon: '🔒',
    verifierSub: 'Assert exit_code == 0, all green',
    resultScore: '✓ PASS  1.0',
    resultEvidence: 'evidence: test-output',
  },
  {
    id: 'browser',
    label: 'Web Task',
    tier: 'AGENTIC',
    verifier: 'web.browser.element_visible',
    actionIcon: '🌐',
    actionLabel: 'Agent Action',
    actionSub: 'Navigate → click Checkout',
    evidenceIcon: '📸',
    evidenceLabel: 'Screenshot',
    evidenceSub: 'DOM snapshot + screenshot',
    verifierIcon: '🤖',
    verifierSub: 'Agent checks #order-confirm visible',
    resultScore: '✓ PASS  1.0',
    resultEvidence: 'evidence: dom-state',
  },
]

/* ───── animation phases ───── */
const PHASE_DURATION = 2800 // ms per step
const PHASES = ['action', 'evidence', 'verifier', 'result', 'hold'] as const
type Phase = (typeof PHASES)[number]

export default function VerifierFlowDiagram() {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scenario = scenarios[scenarioIdx]
  const phase = PHASES[phaseIdx]

  const startAnimation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhaseIdx(0)
    timerRef.current = setInterval(() => {
      setPhaseIdx((prev) => {
        if (prev >= PHASES.length - 1) {
          // cycle to next scenario
          setScenarioIdx((si) => (si + 1) % scenarios.length)
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

  // When user clicks a scenario, restart animation from that scenario
  const selectScenario = (idx: number) => {
    setScenarioIdx(idx)
    setPhaseIdx(0)
    startAnimation()
  }

  /* helper: step className */
  const stepPhases: Phase[] = ['action', 'evidence', 'verifier', 'result']
  const stepClass = (stepPhase: Phase) => {
    const stepI = stepPhases.indexOf(stepPhase)
    const currentI = stepPhases.indexOf(phase)
    const actualCurrent = phase === 'hold' ? 3 : currentI
    if (stepI === actualCurrent) return `${s.step} ${s.active}`
    if (stepI < actualCurrent || phase === 'hold') return `${s.step} ${s.done}`
    return s.step
  }

  /* helper: arrow className */
  const arrowClass = (afterPhase: Phase) => {
    const afterI = stepPhases.indexOf(afterPhase)
    const currentI = phase === 'hold' ? 4 : stepPhases.indexOf(phase)
    if (afterI + 1 === currentI) return `${s.arrow} ${s.lit} ${s.traveling}`
    if (afterI < currentI) return `${s.arrow} ${s.lit}`
    return s.arrow
  }

  /* helper: tier badge */
  const tierClass =
    scenario.tier === 'HARD'
      ? s.tierHard
      : scenario.tier === 'SOFT'
        ? s.tierSoft
        : s.tierAgentic

  const resultVisible = phase === 'result' || phase === 'hold'

  return (
    <div className={s.wrapper}>
      {/* ── Pipeline Flow ── */}
      <div className={s.flow}>
        {/* Step 1: Agent Action */}
        <div className={stepClass('action')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {scenario.actionIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>{scenario.actionLabel}</div>
            <div className={s.sublabel}>{scenario.actionSub}</div>
          </div>
        </div>

        {/* Arrow 1→2 */}
        <div className={arrowClass('action')}>
          <div className={s.arrowLine}>
            <div className={s.dot} />
          </div>
        </div>

        {/* Step 2: Evidence Capture */}
        <div className={stepClass('evidence')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {scenario.evidenceIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>{scenario.evidenceLabel}</div>
            <div className={s.sublabel}>{scenario.evidenceSub}</div>
          </div>
        </div>

        {/* Arrow 2→3 */}
        <div className={arrowClass('evidence')}>
          <div className={s.arrowLine}>
            <div className={s.dot} />
          </div>
        </div>

        {/* Step 3: Verifier */}
        <div className={stepClass('verifier')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            {scenario.verifierIcon}
          </div>
          <div className={s.stepText}>
            <div className={s.label}>{scenario.verifier}</div>
            <div className={s.sublabel}>{scenario.verifierSub}</div>
            <span className={`${s.tier} ${tierClass}`}>{scenario.tier}</span>
          </div>
        </div>

        {/* Arrow 3→4 */}
        <div className={arrowClass('verifier')}>
          <div className={s.arrowLine}>
            <div className={s.dot} />
          </div>
        </div>

        {/* Step 4: Result */}
        <div className={stepClass('result')}>
          <div className={s.node}>
            <div className={s.pulseRing} />
            ✅
          </div>
          <div className={s.stepText}>
            <div className={s.label}>Verdict</div>
            <div className={`${s.result} ${resultVisible ? s.visible : ''} ${s.resultPass}`}>
              {scenario.resultScore}
            </div>
            <div className={`${s.resultEvidence} ${resultVisible ? s.visible : ''}`}>
              {scenario.resultEvidence}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scenario Pills ── */}
      <div className={s.scenarios}>
        {scenarios.map((sc, i) => (
          <button
            key={sc.id}
            className={`${s.scenarioBtn} ${i === scenarioIdx ? s.activeScenario : ''}`}
            onClick={() => selectScenario(i)}
          >
            {sc.label}
          </button>
        ))}
      </div>
    </div>
  )
}
