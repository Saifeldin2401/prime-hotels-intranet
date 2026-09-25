import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CourseSourceDocuments } from '@/components/training/CourseSourceDocuments'
import type { TrainingContentBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle2, Trophy, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface PersistedQuizReviewItem {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  correct: boolean
  explanation?: string
  timeSpentSeconds: number
}

export interface PersistedQuizResult {
  quizId: string
  quizTitle: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  completedAt: string
  reviewItems: PersistedQuizReviewItem[]
}

export interface PlayerCompletionViewProps {
  moduleId: string
  moduleTitle: string
  finalScore: number | null
  finalPassed: boolean
  canViewCertificate: boolean
  quizBreakdown: Array<{ block: TrainingContentBlock; result: PersistedQuizResult }>
  onViewCertificate: () => void
  onBackToMyLearning: () => void
}

export function PlayerCompletionView({
  moduleId,
  moduleTitle,
  finalScore,
  finalPassed,
  canViewCertificate,
  quizBreakdown,
  onViewCertificate,
  onBackToMyLearning,
}: PlayerCompletionViewProps) {
  const { t } = useTranslation('training')

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="min-h-screen bg-ds-background flex items-center justify-center p-6 py-12"
      >
        <Card className="max-w-xl w-full text-center p-6 sm:p-12 shadow-xl border border-ds-border bg-ds-surface overflow-hidden relative">
          <div className="absolute top-0 start-0 w-full h-2 bg-ds-brass" />
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.25, delay: 0.1 }}
            className="h-24 w-24 bg-ds-brass/10 rounded-full flex items-center justify-center mx-auto mb-8 relative"
          >
            <Trophy className="h-12 w-12 text-ds-brass" />
            {finalPassed && (
              <m.span
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
                className="absolute inset-0 rounded-full border-2 border-ds-brass/50"
              />
            )}
          </m.div>

          <h2 className="text-3xl font-bold text-ds-ink mb-4 font-sans tracking-tight">
            {t('congratulations')}
          </h2>
          <p className="text-ds-muted mb-8 text-base sm:text-lg">
            {t('trainingCompletedMessage', { module: moduleTitle })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-ds-surface-subtle p-4 rounded-xl border border-ds-border">
              <p className="text-xs text-ds-muted mb-1 uppercase tracking-wider">
                {t('finalScore')}
              </p>
              <p className="text-2xl font-bold text-ds-ink">
                {finalScore !== null ? `${finalScore}%` : t('n_a')}
              </p>
            </div>
            <div className="bg-ds-surface-subtle p-4 rounded-xl border border-ds-border">
              <p className="text-xs text-ds-muted mb-1 uppercase tracking-wider">
                {t('status')}
              </p>
              <p className={cn('text-2xl font-bold', finalPassed ? 'text-ds-success' : 'text-ds-danger')}>
                {finalPassed ? t('passed') : t('quizNotPassed')}
              </p>
            </div>
          </div>

          {quizBreakdown.length > 1 && (
            <div className="mb-6 rounded-xl border border-ds-border overflow-hidden text-start">
              <div className="bg-ds-surface-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ds-muted">
                {t('quizBreakdown', 'Quiz results')}
              </div>
              <div className="divide-y divide-ds-border">
                {quizBreakdown.map(({ block, result }, idx) => (
                  <m.div
                    key={block.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 + idx * 0.04, ease: 'easeOut' }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {result.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-ds-success shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-ds-danger shrink-0" />
                      )}
                      <span className="text-sm text-ds-ink truncate">{result.quizTitle}</span>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums shrink-0',
                        result.passed ? 'text-ds-success' : 'text-ds-danger'
                      )}
                    >
                      {result.score}%
                    </span>
                  </m.div>
                ))}
              </div>
            </div>
          )}

          <CourseSourceDocuments
            trainingModuleId={moduleId}
            variant="learner"
            className="mb-8 text-start"
          />

          <div className="space-y-3">
            {canViewCertificate && (
              <Button
                className="w-full bg-ds-ink hover:bg-ds-ink-secondary text-white h-12 transition-transform active:scale-[0.98]"
                onClick={onViewCertificate}
              >
                {t('viewCertificate', 'View Certificate')}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-12 border-ds-border text-ds-ink hover:bg-ds-surface-subtle transition-transform active:scale-[0.98]"
              onClick={onBackToMyLearning}
            >
              {t('backToMyLearning')}
            </Button>
          </div>
        </Card>
      </m.div>
    </LazyMotion>
  )
}
