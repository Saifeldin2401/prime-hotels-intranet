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
import { ArrowLeft, ChevronLeft, FileQuestion, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react'
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
        <div className="min-h-screen bg-gradient-to-b from-background via-card/40 to-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Navigation & Assessment Metadata Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
                    <Button
                        variant="ghost"
                        onClick={handleExit}
                        className={cn(
                            "text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl h-9 px-3 gap-1.5 self-start",
                            isRTL && "flex-row-reverse"
                        )}
                    >
                        <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                        <span>{t('quizzes.player.back_to_learning', { defaultValue: 'Back to Learning Dashboard' })}</span>
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1.5 px-3 py-1">
                            <Sparkles className="h-3 w-3" />
                            {isRTL ? 'تقييم الجودة والمعايير الفندقية' : 'Hospitality Standards Evaluation'}
                        </Badge>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/60 text-[11px] font-mono text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{isRTL ? 'جلسة تقييم موثقة' : 'Verified Integrity'}</span>
                        </div>
                    </div>
                </div>

                {/* Main Quiz Engine */}
                <QuizComponentEnhanced
                    quizId={id}
                    assignmentId={assignmentId}
                    onExit={handleExit}
                />
            </div>
        </div>
    )
}
