/**
 * AssessmentPlayer
 *
 * Immersive Executive Assessment & Quiz Runtime.
 * Consolidates assessment verification, timer management, and real-time grading.
 * Powered by QuizComponentEnhanced engine.
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { cn } from '@/lib/utils'
import { ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function AssessmentPlayer() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

    const handleExit = useCallback(() => {
        navigate('/learning/my')
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
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-background via-card/40 to-background animate-fade-in">
            {/* Sticky top strip - the app Header is not rendered on full-bleed routes */}
            <header className={cn(
                "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6",
                isRTL && "flex-row-reverse"
            )}>
                <Button
                    variant="ghost"
                    onClick={handleExit}
                    className={cn(
                        "text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl h-9 px-3 gap-1.5",
                        isRTL && "flex-row-reverse"
                    )}
                >
                    <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    <span>{t('quizzes.player.back_to_learning', { defaultValue: 'Back to Learning Dashboard' })}</span>
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1.5 px-3 py-1">
                        <Sparkles className="h-3 w-3" />
                        {isRTL ? 'تقييم الجودة والمعايير الفندقية' : 'Hospitality Standards Evaluation'}
                    </Badge>
                    <div className="hidden items-center gap-1.5 rounded-xl border border-border/60 bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:flex">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{isRTL ? 'جلسة تقييم موثقة' : 'Verified Integrity'}</span>
                    </div>
                </div>
            </header>

            {/* Single scroll region */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <QuizComponentEnhanced
                        quizId={id}
                        assignmentId={assignmentId}
                        onExit={handleExit}
                    />
                </div>
            </div>
        </div>
    )
}
