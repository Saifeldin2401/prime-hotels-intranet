/**
 * AssessmentPlayer
 *
 * The quiz a learner takes: a quiet frame around the quiz engine
 * (QuizComponentEnhanced), which owns timing, grading and progress.
 */
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { ChevronLeft } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function AssessmentPlayer() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { t } = useTranslation(['training', 'common'])

    const handleExit = useCallback(() => {
        navigate('/learn/my')
    }, [navigate])

    if (!id) {
        return (
            <div className="container mx-auto py-16 text-center">
                <div className="max-w-md mx-auto p-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive font-semibold">
                    {t('quizzes.player.invalid_id', { defaultValue: 'Invalid assessment identifier provided.' })}
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-ds-background">
            {/* A calm exam frame: a way out, what this is, nothing else competing with the questions */}
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ds-border bg-ds-surface px-3 sm:px-6">
                <button
                    type="button"
                    onClick={handleExit}
                    className="inline-flex min-h-[48px] items-center gap-1.5 text-sm font-medium text-ds-muted hover:text-ds-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                    {t('quizzes.player.back_to_learning', { defaultValue: 'My learning' })}
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">
                    {t('quizzes.player.label', { defaultValue: 'Quiz' })}
                </span>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    <QuizComponentEnhanced
                        quizId={id}
                        assignmentId={assignmentId}
                        onExit={handleExit}
                    />
                </div>
            </main>
        </div>
    )
}
