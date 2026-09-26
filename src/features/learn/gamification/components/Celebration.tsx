import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { BadgeId, LearningStats } from '../gamificationApi'
import { LEVEL_TITLES, levelFromPoints, pointsForLevel } from '../levels'
import { BadgeMedal, useBadgeCopy } from './BadgeTile'

export type Milestone = { type: 'badge'; id: BadgeId } | { type: 'level'; level: number }

const STORAGE_PREFIX = 'altus.momentum.v1'

function readSeen(key: string): { badges: string[]; level: number } | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as { badges: string[]; level: number }) : null
  } catch {
    return null
  }
}

function writeSeen(key: string, value: { badges: string[]; level: number }) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: celebrations simply repeat or are skipped */
  }
}

/**
 * Milestones reached since this browser last saw the learner's stats. The very
 * first visit records the current state silently so existing learners are not
 * greeted with a pile of old badges.
 */
export function useMilestones(stats: LearningStats | undefined, userId: string | undefined, orgId: string | undefined) {
  const [queue, setQueue] = useState<Milestone[]>([])
  const key = userId && orgId ? `${STORAGE_PREFIX}.${userId}.${orgId}` : null

  useEffect(() => {
    if (!stats || !key) return
    const earned = stats.badges.filter((b) => b.earned_at).map((b) => b.id)
    const level = levelFromPoints(stats.points_total).level
    const seen = readSeen(key)
    if (!seen) {
      writeSeen(key, { badges: earned, level })
      return
    }
    const fresh: Milestone[] = earned.filter((id) => !seen.badges.includes(id)).map((id) => ({ type: 'badge', id }))
    if (level > seen.level) fresh.unshift({ type: 'level', level })
    if (fresh.length > 0) setQueue((q) => [...q, ...fresh])
    writeSeen(key, { badges: Array.from(new Set([...seen.badges, ...earned])), level: Math.max(level, seen.level) })
  }, [stats, key])

  return { current: queue[0] ?? null, dismiss: () => setQueue((q) => q.slice(1)) }
}

const CONFETTI_TONES = ['bg-ds-brass', 'bg-ds-accent', 'bg-ds-success', 'bg-ds-warning', 'bg-ds-info']

export function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.4
      const distance = 140 + Math.random() * 160
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 60,
        rotate: Math.random() * 540 - 270,
        delay: Math.random() * 0.12,
        tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
        round: i % 3 === 0,
      }
    }),
    [],
  )
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={cn('absolute block h-2.5 w-1.5', p.round && 'h-2 w-2 rounded-full', p.tone)}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 120], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1.6, delay: p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.55, 1] }}
        />
      ))}
    </div>
  )
}

export function Celebration({ milestone, onClose }: { milestone: Milestone | null; onClose: () => void }) {
  const { t } = useTranslation('training')
  const reduce = useReducedMotion()
  const badgeCopy = useBadgeCopy()
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!milestone) return
    buttonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [milestone, onClose])

  const content = milestone?.type === 'badge'
    ? {
        eyebrow: t('game.celebrate.badgeEyebrow', 'Badge unlocked'),
        title: badgeCopy(milestone.id).title,
        body: badgeCopy(milestone.id).description,
      }
    : milestone?.type === 'level'
      ? {
          eyebrow: t('game.celebrate.levelEyebrow', 'Level up'),
          title: t('game.celebrate.levelTitle', 'You reached level {{level}}', { level: milestone.level }),
          body: (() => {
            const key = levelFromPoints(pointsForLevel(milestone.level)).titleKey
            return t('game.celebrate.levelBody', 'You are now a {{title}}. Keep learning to reach the next level.', {
              title: t(`game.levels.${key}`, LEVEL_TITLES[key]),
            })
          })(),
        }
      : null

  return createPortal(
    <AnimatePresence>
      {milestone && content && (
        <motion.div
          key={milestone.type === 'badge' ? milestone.id : `level-${milestone.level}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ds-ink/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onClick={onClose}
        >
          {!reduce && <Confetti />}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            aria-describedby="celebration-body"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-ds-border bg-ds-surface p-6 text-center shadow-2xl"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 16 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 24 }}
          >
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ds-brass/15 to-transparent" />
            <motion.div
              className="relative mx-auto mb-4 flex justify-center"
              initial={reduce ? false : { scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 14, delay: 0.08 }}
            >
              {milestone.type === 'badge' ? (
                <BadgeMedal id={milestone.id} earned size="lg" />
              ) : (
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-ds-brass/15 font-editorial text-3xl font-bold text-ds-brass ring-2 ring-ds-brass/50 ring-offset-2 ring-offset-ds-surface">
                  {milestone.level}
                </span>
              )}
            </motion.div>
            <p className="relative inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-brass">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              {content.eyebrow}
            </p>
            <h2 id="celebration-title" className="relative mt-1 font-editorial text-2xl font-semibold text-ds-ink">{content.title}</h2>
            <p id="celebration-body" className="relative mt-1.5 text-sm text-ds-ink-secondary">{content.body}</p>
            <button
              ref={buttonRef}
              type="button"
              onClick={onClose}
              className="relative mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
            >
              {t('game.celebrate.continue', 'Keep going')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
