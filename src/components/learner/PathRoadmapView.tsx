import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { Award, CheckCircle2, Clock, Flag, Loader2, MapPin, Play, Sparkles, Trophy } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { TrainingModule, TrainingPath, TrainingPathModule } from '@/lib/types'
import { CourseCover } from '@/features/learn/gamification/components/CourseCover'
import { ProgressRing } from '@/features/learn/gamification/components/ProgressRing'

interface PathWithModules extends TrainingPath {
  training_path_modules: (TrainingPathModule & {
    courses: TrainingModule
  })[]
}

interface PathRoadmapViewProps {
  path: PathWithModules
  userProgress?: Array<{
    training_id?: string
    status?: string
    progress_percentage?: number
  }>
  onContinue?: (moduleId: string) => void
  isEnrolled?: boolean
  onEnroll?: (pathId: string) => void
  isEnrolling?: boolean
}

type StopState = 'done' | 'current' | 'upcoming'

/**
 * A learning path drawn as a journey: a road of stops, each a course, with the
 * travelled part of the road filled in, a "you are here" marker on the next
 * course, and a finish line that promises a certificate only when the path
 * actually issues one.
 */
export const PathRoadmapView: React.FC<PathRoadmapViewProps> = ({
  path,
  userProgress = [],
  onContinue,
  isEnrolled = true,
  onEnroll,
  isEnrolling = false,
}) => {
  const { t } = useTranslation('training')
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const stops = useMemo(
    () => [...(path.training_path_modules || [])]
      .filter((m) => m.courses)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
    [path.training_path_modules],
  )

  const progressMap = useMemo(() => {
    const map = new Map<string, { status: string; pct: number }>()
    for (const p of userProgress) {
      if (p.training_id) map.set(p.training_id, { status: p.status || 'not_started', pct: p.progress_percentage || 0 })
    }
    return map
  }, [userProgress])

  const { states, doneCount, currentId } = useMemo(() => {
    let current: string | null = null
    let done = 0
    const s = stops.map((item) => {
      const p = progressMap.get(item.courses.id)
      if (p?.status === 'completed' || (p?.pct ?? 0) >= 100) {
        done++
        return 'done' as StopState
      }
      if (!current) {
        current = item.courses.id
        return 'current' as StopState
      }
      return 'upcoming' as StopState
    })
    return { states: s, doneCount: done, currentId: current as string | null }
  }, [stops, progressMap])

  const total = stops.length
  const percent = total ? Math.round((doneCount / total) * 100) : 0
  const complete = total > 0 && doneCount === total
  const hours = path.estimated_duration_hours

  const primary = () => {
    if (!isEnrolled && onEnroll) return onEnroll(path.id)
    const target = currentId ?? stops[0]?.courses.id
    if (!target) return
    if (onContinue) onContinue(target)
    else navigate(`/learn/player/${target}`)
  }

  const primaryLabel = !isEnrolled
    ? t('pathJourney.join', 'Join this path')
    : complete
      ? t('pathJourney.review', 'Review the path')
      : doneCount > 0
        ? t('pathJourney.continue', 'Continue the journey')
        : t('pathJourney.start', 'Start the first stop')

  return (
    <article className="overflow-hidden rounded-2xl border border-ds-border bg-ds-surface">
      {/* Header */}
      <header className="relative">
        <CourseCover course={{ id: path.id, title: path.title }} className="absolute inset-0 h-full w-full rounded-none" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ds-ink/90 via-ds-ink/75 to-ds-ink/40 rtl:bg-gradient-to-l" />
        <div className="relative flex flex-col gap-5 p-5 text-ds-on-ink sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-2xl space-y-2.5">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                <MapPin aria-hidden="true" className="h-3 w-3" />{t('pathJourney.eyebrow', 'Learning path')}
              </span>
              {path.is_mandatory && (
                <span className="rounded-full bg-ds-danger/80 px-2.5 py-1">{t('mandatory', 'Mandatory')}</span>
              )}
              {path.certificate_enabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ds-brass/80 px-2.5 py-1">
                  <Award aria-hidden="true" className="h-3 w-3" />{t('pathJourney.certificate', 'Certificate')}
                </span>
              )}
            </div>
            <h2 className="font-editorial text-2xl font-semibold leading-tight sm:text-3xl">{path.title}</h2>
            {path.description && <p className="line-clamp-2 text-sm text-white/80">{path.description}</p>}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
              <span>{t('pathJourney.stops', '{{count}} stops', { count: total })}</span>
              {hours ? <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="h-3 w-3" />{t('pathJourney.hours', 'about {{count}} h', { count: hours })}</span> : null}
              {isEnrolled && <span>{t('pathJourney.doneOf', '{{done}} of {{total}} done', { done: doneCount, total })}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isEnrolled && (
              <ProgressRing
                value={percent}
                size={72}
                stroke={7}
                tone={complete ? 'text-ds-success' : 'text-ds-brass'}
                label={t('pathJourney.progress', 'Path {{pct}}% complete', { pct: percent })}
                className="rounded-full bg-ds-surface/95"
              >
                <span className="font-mono text-sm font-bold tabular-nums text-ds-ink">{percent}%</span>
              </ProgressRing>
            )}
            <button
              type="button"
              onClick={primary}
              disabled={isEnrolling || total === 0}
              className={cn(
                'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                complete ? 'bg-ds-success text-white' : 'bg-ds-brass text-white hover:bg-ds-brass/90',
              )}
            >
              {isEnrolling ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : complete ? <Trophy aria-hidden="true" className="h-4 w-4" /> : !isEnrolled ? <Sparkles aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4 fill-current" />}
              {isEnrolling ? t('pathJourney.joining', 'Joining…') : primaryLabel}
            </button>
          </div>
        </div>
      </header>

      {/* The road */}
      <div className="relative px-4 py-8 sm:px-8">
        {/* Track: dashed road with the travelled part filled in */}
        <div aria-hidden="true" className="absolute bottom-10 top-10 start-[38px] w-0 border-s-4 border-dashed border-ds-border md:start-1/2 md:-ms-0.5" />
        <motion.div
          aria-hidden="true"
          className="absolute top-10 start-[39px] w-1 origin-top rounded-full bg-ds-success md:start-1/2 md:-ms-0.5"
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: `calc((100% - 5rem) * ${total ? doneCount / (total + 1) : 0})` }}
        />

        <ol className="relative space-y-8">
          {stops.map((item, idx) => {
            const course = item.courses
            const state = states[idx]
            const right = idx % 2 === 1
            return (
              <motion.li
                key={course.id}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
                className="relative grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]"
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {/* Node */}
                <div className="relative z-10 flex justify-center md:col-start-2 md:row-start-1">
                  <span
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-ds-surface text-sm font-bold shadow',
                      state === 'done' && 'bg-ds-success text-white',
                      state === 'current' && 'bg-ds-brass text-white',
                      state === 'upcoming' && 'bg-ds-surface-subtle text-ds-muted ring-1 ring-ds-border',
                    )}
                  >
                    {state === 'done' ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : state === 'current' ? <Play aria-hidden="true" className="h-4 w-4 fill-current" /> : idx + 1}
                    {state === 'current' && !reduce && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full border-2 border-ds-brass"
                        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                      />
                    )}
                  </span>
                </div>

                {/* Stop card */}
                <Link
                  to={state === 'upcoming' ? `/learn/courses/${course.id}` : `/learn/player/${course.id}`}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border bg-ds-surface p-2.5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent motion-reduce:hover:translate-y-0',
                    'md:row-start-1',
                    right ? 'md:col-start-3' : 'md:col-start-1 md:flex-row-reverse md:text-end',
                    state === 'current' ? 'border-ds-brass/60 shadow-sm' : state === 'done' ? 'border-ds-success/30' : 'border-ds-border',
                  )}
                >
                  <CourseCover course={course} className={cn('h-16 w-24', state === 'upcoming' && 'opacity-70 grayscale-[35%]')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[10px] font-semibold uppercase tracking-[0.14em]', state === 'current' ? 'text-ds-brass' : state === 'done' ? 'text-ds-success' : 'text-ds-muted')}>
                      {state === 'current'
                        ? t('pathJourney.youAreHere', 'You are here')
                        : state === 'done'
                          ? t('pathJourney.completed', 'Completed')
                          : t('pathJourney.stop', 'Stop {{n}}', { n: idx + 1 })}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-ds-ink group-hover:underline">{course.title}</span>
                    {course.estimated_duration_minutes ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-ds-muted">
                        <Clock aria-hidden="true" className="h-3 w-3" />{t('explore.minutes', '{{count}} min', { count: course.estimated_duration_minutes })}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </motion.li>
            )
          })}

          {/* Finish line */}
          <li className="relative grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
            <div className="relative z-10 flex justify-center md:col-start-2 md:row-start-1">
              <span className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border-4 border-ds-surface shadow',
                complete ? 'bg-ds-brass text-white' : 'bg-ds-surface-subtle text-ds-muted ring-1 ring-ds-border',
              )}>
                {path.certificate_enabled ? <Award aria-hidden="true" className="h-5 w-5" /> : <Flag aria-hidden="true" className="h-5 w-5" />}
              </span>
            </div>
            <div className={cn(
              'rounded-xl border p-4 md:row-start-1',
              stops.length % 2 === 1 ? 'md:col-start-3' : 'md:col-start-1 md:text-end',
              complete ? 'border-ds-brass/50 bg-ds-brass/10' : 'border-dashed border-ds-border bg-ds-surface-subtle',
            )}>
              <p className="text-sm font-semibold text-ds-ink">
                {complete
                  ? t('pathJourney.finished', 'Path complete. Well done!')
                  : path.certificate_enabled
                    ? t('pathJourney.finishCert', 'Finish every stop to earn the certificate')
                    : t('pathJourney.finishLine', 'Finish line')}
              </p>
              {complete && path.certificate_enabled && (
                <Link to="/learn/certificates" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ds-accent hover:underline">
                  <Award aria-hidden="true" className="h-4 w-4" />{t('viewCertificate', 'View certificate')}
                </Link>
              )}
            </div>
          </li>
        </ol>
      </div>
    </article>
  )
}
