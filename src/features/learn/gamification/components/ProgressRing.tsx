import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  /** 0-100 */
  value: number
  size?: number
  stroke?: number
  /** Tailwind text-* class; the arc uses currentColor. */
  tone?: string
  label: string
  children?: ReactNode
  className?: string
}

/** Circular progress with an animated arc. The label is announced, the arc is decorative. */
export function ProgressRing({ value, size = 64, stroke = 6, tone = 'text-ds-accent', label, children, className }: ProgressRingProps) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ds-border" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={tone}
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? offset : c }}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
