'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './StatsCounter.module.css'
import { verifierCount, domainCount, fixtureCount } from '@/data/registryStats'

interface Stat {
  value: number
  label: string
  suffix?: string
}

const STATS: Stat[] = [
  { value: verifierCount, label: 'Verifiers' },
  { value: fixtureCount, label: 'Fixtures' },
  { value: domainCount, label: 'Domains' },
  { value: 3, label: 'Tiers' },
]

function useCountUp(target: number, active: boolean, duration = 1200): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)          // ease-out cubic
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])

  return count
}

function StatItem({ stat, active, delay }: { stat: Stat; active: boolean; delay: number }) {
  const [visible, setVisible] = useState(false)
  const count = useCountUp(stat.value, visible, 1200)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [active, delay])

  return (
    <div className={`${styles.stat} ${visible ? styles.visible : ''}`}>
      <div className={styles.value}>
        {count}
        {stat.suffix && <span className={styles.suffix}>{stat.suffix}</span>}
      </div>
      <div className={styles.label}>{stat.label}</div>
    </div>
  )
}

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={styles.grid}>
      {STATS.map((stat, i) => (
        <StatItem key={stat.label} stat={stat} active={active} delay={i * 100} />
      ))}
    </div>
  )
}
