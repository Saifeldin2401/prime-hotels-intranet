import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, XCircle, Award, Clock, ArrowRight, HelpCircle, ArrowLeft, PenBox, Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { learningService } from '@/services/learningService'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import { supabase } from '@/lib/supabase'
import type { LearningQuiz } from '@/types/learning'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'

interface QuizComponentProps {
    quizId: string
    assignmentId?: string | null
    onComplete?: (result: any) => void
    onExit?: () => void
    certificateEnabled?: boolean
    translationTarget?: TranslationTargetLanguage | null
    showBilingual?: boolean
}

export function QuizComponent({
    quizId,
    assignmentId,
    onComplete,
    onExit,
    certificateEnabled = true,
    translationTarget: propTranslationTarget,
    showBilingual: propShowBilingual
}: QuizComponentProps) {
    const { toast } = useToast()
    const { user, profile, properties, departments } = useAuth()
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar'
    const translateAI = useTranslationAI()

    const [quiz, setQuiz] = useState<LearningQuiz | null>(null)
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [attemptCount, setAttemptCount] = useState(0)
    const [attemptLimitReached, setAttemptLimitReached] = useState(false)
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(propTranslationTarget || null)
    const [showBilingual, setShowBilingual] = useState(propShowBilingual || false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translatedQuestions, setTranslatedQuestions] = useState<Record<string, Partial<Record<TranslationTargetLanguage, {
        text: string
        explanation?: string
        options?: Record<string, string>
    }>>>>({})

    // Quiz state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        if (quizId) {
            loadQuiz(quizId)
        }
    }, [quizId, user?.id])

    // Sync props to state if they change (controlled by parent)
    useEffect(() => {
        if (propTranslationTarget !== undefined) {
            setTranslationTarget(propTranslationTarget)
        }
    }, [propTranslationTarget])

    useEffect(() => {
        if (propShowBilingual !== undefined) {
            setShowBilingual(propShowBilingual)
        }
    }, [propShowBilingual])

    useEffect(() => {
        // Only reset if NOT controlled by props, or if props explain it
        // But generally we want to keep parent state source of truth
        if (!propTranslationTarget) {
            // Logic to reset if we switch quiz but not if we just have props
            // Actually, parent should handle reset on new module/block, so we might just leave this.
            // But existing behavior resets on quizId change.
            setTranslatedQuestions({})
        }
    }, [quizId])

    useEffect(() => {
        if (!translationTarget || !quiz?.questions?.length) return
        const current = quiz.questions[currentQuestionIndex]
        if (!current?.question) return
        const existing = translatedQuestions[current.question_id]?.[translationTarget]
        if (existing) return
        void translateQuestion(current)
    }, [translationTarget, currentQuestionIndex, quiz])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (timeLeft !== null && timeLeft > 0 && !submitted) {
            timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
            }, 1000)
        } else if (timeLeft === 0 && !submitted) {
            handleSubmit() // Auto submit
        }
        return () => clearInterval(timer)
    }, [timeLeft, submitted])

    const loadQuiz = async (id: string) => {
        try {
            setLoading(true)
            const data = await learningService.getQuiz(id)
            setQuiz(data)

            if (data.time_limit_minutes) {
                setTimeLeft(data.time_limit_minutes * 60)
            }

            if (user?.id) {
                const { data: progressData } = await supabase
                    .from('learning_progress')
                    .select('metadata')
                    .eq('user_id', user.id)
                    .eq('content_type', 'quiz')
                    .eq('content_id', id)
                    .maybeSingle()

                const recordedAttempts = Number((progressData?.metadata as any)?.quiz_attempt_count || 0)
                const safeAttempts = Number.isFinite(recordedAttempts) ? recordedAttempts : 0
                setAttemptCount(safeAttempts)
                setAttemptLimitReached(Boolean(data.max_attempts && safeAttempts >= data.max_attempts))
            } else {
                setAttemptCount(0)
                setAttemptLimitReached(false)
            }
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('training:quizzes.player.load_error'),
                variant: 'destructive',
            })
            if (onExit) onExit()
        } finally {
            setLoading(false)
        }
    }

    const hasAnswer = (questionId?: string) => {
        if (!questionId) return false
        const value = answers[questionId]
        if (Array.isArray(value)) return value.length > 0
        return typeof value === 'string' && value.trim().length > 0
    }

    const gradeQuestion = (
        question: NonNullable<NonNullable<LearningQuiz['questions']>[number]['question']>,
        userAnswer: string | string[] | undefined
    ): boolean => {
        switch (question.question_type) {
            case 'mcq': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                const selectedOption = question.options?.find(o => o.id === selected)
                return !!selectedOption?.is_correct
            }
            case 'mcq_multi': {
                const selectedOptions = Array.isArray(userAnswer)
                    ? userAnswer
                    : (typeof userAnswer === 'string' ? userAnswer.split(',').map(v => v.trim()).filter(Boolean) : [])
                const correctOptions = question.options?.filter(o => o.is_correct).map(o => o.id) || []
                return (
                    correctOptions.length === selectedOptions.length &&
                    correctOptions.every(id => selectedOptions.includes(id))
                )
            }
            case 'true_false':
            case 'fill_blank': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return selected.toLowerCase().trim() === (question.correct_answer || '').toLowerCase().trim()
            }
            case 'scenario': {
                const hasOptions = (question.options?.length || 0) > 0
                if (hasOptions) {
                    const selected = typeof userAnswer === 'string' ? userAnswer : ''
                    const selectedOption = question.options?.find(o => o.id === selected)
                    return !!selectedOption?.is_correct
                }
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return selected.toLowerCase().trim() === (question.correct_answer || '').toLowerCase().trim()
            }
            default:
                return false
        }
    }

    const handleSubmit = async () => {
        if (!quiz || !user || submitted) return

        try {
            if (quiz.max_attempts && attemptCount >= quiz.max_attempts) {
                setAttemptLimitReached(true)
                toast({
                    title: t('training:quizzes.player.limit_reached_title', 'Attempt limit reached'),
                    description: t('training:quizzes.player.limit_reached_desc', { count: quiz.max_attempts }),
                    variant: 'destructive'
                })
                return
            }

            setSubmitted(true) // Prevent double submit
            const nextAttemptCount = attemptCount + 1

            // Calculate Score
            let correctCount = 0
            const gradedAnswers = quiz.questions?.map(q => {
                const rawAnswer = answers[q.question_id]
                const userAnswer = Array.isArray(rawAnswer)
                    ? rawAnswer.join(',')
                    : (rawAnswer || '')
                const isCorrect = q.question
                    ? gradeQuestion(q.question, rawAnswer)
                    : false

                if (isCorrect) correctCount++
                return {
                    question_id: q.question_id,
                    answer: userAnswer,
                    raw_answer: rawAnswer,
                    correct: isCorrect
                }
            })

            const totalQuestions = quiz.questions?.length || 0
            const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
            const passed = percentage >= quiz.passing_score_percentage

            // Submit to backend
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: quiz.id,
                content_type: 'quiz',
                user_id: user.id,
                status: 'completed',
                progress_percentage: 100,
                score_percentage: Math.round(percentage),
                passed,
                completed_at: new Date().toISOString(),
                metadata: {
                    quiz_attempt_count: nextAttemptCount,
                    max_attempts: quiz.max_attempts ?? null
                }
            })

            setAttemptCount(nextAttemptCount)
            if (quiz.max_attempts && !passed && nextAttemptCount >= quiz.max_attempts) {
                setAttemptLimitReached(true)
            }

            const finalResult = {
                score: Math.round(percentage),
                passed,
                correctCount,
                totalQuestions,
                gradedAnswers // Add detailed answers for review
            }

            setResult(finalResult)

            // 🏆 AUTO-GENERATE CERTIFICATE when user PASSES the quiz
            if (passed && user && quiz && certificateEnabled) {
                try {
                    const primaryProperty = properties?.[0]
                    const primaryDepartment = departments?.[0]
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Quiz Participant',
                        recipientEmail: user.email,
                        certificateType: 'sop_quiz',
                        title: quiz.title,
                        description: `Successfully completed ${quiz.title} with a score of ${Math.round(percentage)}%.`,
                        completionDate: new Date(),
                        score: Math.round(percentage),
                        passingScore: quiz.passing_score_percentage,
                        propertyId: primaryProperty?.id,
                        propertyName: primaryProperty?.name,
                        departmentId: primaryDepartment?.id,
                        departmentName: primaryDepartment?.name
                    }

                    const certificate = await createCertificate(certificateData)

                    if (certificate) {
                        toast({
                            title: t('training:quizzes.player.certificate_earned'),
                            description: t('training:quizzes.player.certificate_desc', { title: quiz.title }),
                            variant: 'default'
                        })
                    }
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                    // Don't fail the quiz completion if certificate fails
                }
            }

            toast({
                title: passed ? t('training:quizzes.player.passed_toast_title') : t('training:quizzes.player.failed_toast_title'),
                description: t('training:quizzes.player.score_toast_desc', { score: Math.round(percentage) }),
                variant: passed ? 'default' : 'destructive'
            })

            if (onComplete) {
                onComplete(finalResult)
            }

        } catch (error) {
            console.error(error)
            toast({
                title: t('common.error'),
                description: t('training:quizzes.player.submit_error'),
                variant: 'destructive'
            })
            setSubmitted(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const translationTargetMeta = useMemo(() => (
        translationTarget
            ? SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === translationTarget)
            : null
    ), [translationTarget])

    const translateQuestion = async (questionItem: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!translationTarget || !questionItem?.question) return

        setIsTranslating(true)
        try {
            const questionText = questionItem.question.question_text || ''
            const explanationText = questionItem.question.explanation || ''
            const optionTexts = questionItem.question.options?.map(o => ({ id: o.id, text: o.option_text })) || []

            const [translatedQuestion, translatedExplanation] = await Promise.all([
                translateAI.mutateAsync({ text: questionText, target_lang: translationTarget, source_lang: 'auto' }),
                explanationText
                    ? translateAI.mutateAsync({ text: explanationText, target_lang: translationTarget, source_lang: 'auto' })
                    : Promise.resolve({ translated_text: '' })
            ])

            const translatedOptionsEntries = await Promise.all(
                optionTexts.map(async (opt) => {
                    const res = opt.text
                        ? await translateAI.mutateAsync({ text: opt.text, target_lang: translationTarget, source_lang: 'auto' })
                        : { translated_text: '' }
                    return [opt.id, res.translated_text]
                })
            )

            setTranslatedQuestions(prev => ({
                ...prev,
                [questionItem.question_id]: {
                    ...prev[questionItem.question_id],
                    [translationTarget]: {
                        text: translatedQuestion.translated_text,
                        explanation: translatedExplanation.translated_text,
                        options: Object.fromEntries(translatedOptionsEntries)
                    }
                }
            }))
        } catch (error) {
            console.error('Quiz translation failed:', error)
            const errorMessage = error instanceof Error ? error.message : t('training:translationFailed', 'Translation failed')
            toast({
                title: t('training:translationFailed', 'Translation failed'),
                description: errorMessage,
                variant: 'destructive'
            })
            setTranslationTarget(null)
        } finally {
            setIsTranslating(false)
        }
    }

    const getTranslatedQuestion = (questionItem?: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!questionItem || !translationTarget) return null
        return translatedQuestions[questionItem.question_id]?.[translationTarget] || null
    }

    if (loading || !quiz) {
        return <div className="p-8 text-center">{t('training:quizzes.player.loading')}</div>
    }

    if (result) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto space-y-6 pt-10"
            >
                <Card className="text-center p-8 border-2 border-hotel-gold/20 shadow-xl bg-white/50 backdrop-blur-sm">
                    <CardContent className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={result.passed ? 'passed' : 'failed'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-center"
                            >
                                {result.passed ? (
                                    <div className="bg-hotel-gold/10 p-6 rounded-2xl border-2 border-hotel-gold/30">
                                        <Award className="h-20 w-20 text-hotel-gold-dark" />
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200">
                                        <XCircle className="h-20 w-20 text-red-500" />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-hotel-navy">
                                {result.passed ? t('training:quizzes.player.success_passed') : t('training:quizzes.player.failed_title')}
                            </h2>
                            <p className="text-muted-foreground text-base md:text-lg">
                                {t('training:quizzes.player.score_text', { score: result.score })}
                                <span className="text-sm ml-2 font-medium bg-hotel-navy/5 px-2 py-1 rounded">
                                    {t('training:quizzes.player.pass_mark', { score: quiz.passing_score_percentage })}
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-sm mx-auto">
                            <div className="bg-white/80 p-3 md:p-5 rounded-2xl border border-hotel-navy/10 shadow-sm">
                                <div className="text-2xl md:text-3xl font-bold text-hotel-navy">{result.correctCount}</div>
                                <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                                    {t('training:quizzes.player.correct_answers')}
                                </div>
                            </div>
                            <div className="bg-white/80 p-3 md:p-5 rounded-2xl border border-hotel-navy/10 shadow-sm">
                                <div className="text-2xl md:text-3xl font-bold text-hotel-navy">{result.totalQuestions}</div>
                                <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                                    {t('training:quizzes.player.total_questions')}
                                </div>
                            </div>
                        </div>

                        {/* REVIEW ANSWERS SECTION */}
                        <div className="text-left space-y-4 mt-8 pt-6 border-t border-hotel-gold/20">
                            <h3 className={cn(
                                "font-bold text-xl text-hotel-navy mb-4",
                                isRTL && "text-right"
                            )}>
                                {t('training:quizzes.player.review_answers')}
                            </h3>
                            {result.gradedAnswers?.map((answer: any, index: number) => {
                                const question = quiz.questions?.find(q => q.question_id === answer.question_id)?.question
                                if (!question) return null

                                const translatedReview = translationTarget
                                    ? translatedQuestions[answer.question_id]?.[translationTarget]
                                    : null
                                const rawAnswer = answer.raw_answer
                                const answerList = Array.isArray(rawAnswer)
                                    ? rawAnswer
                                    : (typeof rawAnswer === 'string' && rawAnswer.length > 0 ? rawAnswer.split(',').map((v: string) => v.trim()).filter(Boolean) : [])
                                const hasOptions = question.question_type === 'mcq' || question.question_type === 'mcq_multi' || (question.question_type === 'scenario' && (question.options?.length || 0) > 0)

                                const userAnswerText = hasOptions
                                    ? (answerList.length > 0
                                        ? answerList
                                            .map((id: string) => translatedReview?.options?.[id] || question.options?.find(o => o.id === id)?.option_text)
                                            .filter(Boolean)
                                            .join(', ')
                                        : '(No Answer)')
                                    : (typeof rawAnswer === 'string' && rawAnswer.length > 0 ? rawAnswer : '(No Answer)')

                                const correctAnswerText = hasOptions
                                    ? (question.options || [])
                                        .filter(o => o.is_correct)
                                        .map(o => translatedReview?.options?.[o.id] || o.option_text)
                                        .filter(Boolean)
                                        .join(', ')
                                    : question.correct_answer

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={cn(
                                            "p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all",
                                            answer.correct
                                                ? 'bg-emerald-50/50 border-emerald-100'
                                                : 'bg-red-50/50 border-red-100',
                                            isRTL && "text-right"
                                        )}
                                    >
                                        <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
                                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-inherit text-sm font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-2 md:space-y-3">
                                                <p className="font-bold text-hotel-navy text-base md:text-lg">
                                                    {translatedReview?.text || question.question_text}
                                                </p>
                                                {showBilingual && translationTarget && translatedReview?.text && (
                                                    <p className="text-xs text-slate-500">
                                                        {question.question_text}
                                                    </p>
                                                )}

                                                <div className="text-xs md:text-sm space-y-1 md:space-y-2">
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        answer.correct ? 'text-emerald-700' : 'text-red-700',
                                                        isRTL && "flex-row-reverse"
                                                    )}>
                                                        <strong className="shrink-0">{t('training:quizzes.player.your_answer')}</strong>
                                                        <span className="font-medium">{userAnswerText || '(No Answer)'}</span>
                                                    </div>
                                                    {!answer.correct && (
                                                        <div className={cn(
                                                            "flex items-center gap-2 text-emerald-700",
                                                            isRTL && "flex-row-reverse"
                                                        )}>
                                                            <strong className="shrink-0">{t('training:quizzes.player.correct_answer')}</strong>
                                                            <span className="font-medium italic">{correctAnswerText}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {(translatedReview?.explanation || question.explanation) && (
                                                    <div className="mt-2 md:mt-4 p-3 md:p-4 bg-white/60 rounded-xl border border-white text-xs text-slate-600 leading-relaxed italic relative">
                                                        <div className={cn(
                                                            "absolute top-0 opacity-10",
                                                            isRTL ? "left-4" : "right-4"
                                                        )}>
                                                            <HelpCircle className="h-6 w-6 md:h-8 md:w-8" />
                                                        </div>
                                                        <strong>{t('training:quizzes.player.explanation')}</strong> {translatedReview?.explanation || question.explanation}
                                                    </div>
                                                )}
                                                {question.linked_sop_section && (
                                                    <div className="mt-2 p-3 bg-white/60 rounded-xl border border-white text-xs text-slate-600 leading-relaxed">
                                                        <strong>{t('training:quizzes.player.source', 'Source')}</strong> {question.linked_sop_section}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 pt-1">
                                                {answer.correct ? (
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                ) : (
                                                    <XCircle className="h-6 w-6 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <div className="pt-8 flex flex-wrap justify-center gap-4">
                            {onExit && (
                                <Button
                                    onClick={onExit}
                                    className="bg-hotel-navy hover:bg-hotel-navy-dark px-8 py-6 rounded-xl text-lg transition-all hover:scale-105"
                                >
                                    {t('training:quizzes.player.back')}
                                </Button>
                            )}
                            {!result.passed && !attemptLimitReached && (!quiz.max_attempts || attemptCount < quiz.max_attempts) && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setResult(null)
                                        setSubmitted(false)
                                        setAnswers({})
                                        setCurrentQuestionIndex(0)
                                        loadQuiz(quiz.id)
                                    }}
                                    className="border-hotel-gold text-hotel-gold-dark hover:bg-hotel-gold/10 px-8 py-6 rounded-xl text-lg transition-all"
                                >
                                    {t('training:quizzes.player.try_again')}
                                </Button>
                            )}
                            {!result.passed && attemptLimitReached && (
                                <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium">
                                    {t('training:quizzes.player.limit_reached_desc', { count: quiz.max_attempts || 0 })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    const currentQuestion = quiz.questions?.[currentQuestionIndex]
    const translatedCurrent = getTranslatedQuestion(currentQuestion)
    const displayQuestionText = translationTarget && translatedCurrent?.text
        ? translatedCurrent.text
        : currentQuestion?.question?.question_text
    const displayExplanation = translationTarget && translatedCurrent?.explanation
        ? translatedCurrent.explanation
        : currentQuestion?.question?.explanation
    const displayOptionText = (optionId?: string, fallback?: string) => {
        if (!translationTarget || !translatedCurrent?.options) return fallback
        return translatedCurrent.options[optionId || ''] || fallback
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-10">
            {/* Elegant Question Info Bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 py-2"
            >
                <div className={cn("space-y-1", isRTL && "text-right")}>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-hotel-gold-dark uppercase mb-1">
                        {t('training:quizzes.player.question_counter', {
                            current: currentQuestionIndex + 1,
                            total: quiz.questions?.length
                        })}
                    </p>
                    <h1 className="text-xl md:text-2xl font-bold text-hotel-navy">{quiz.title}</h1>
                </div>

                <div className="flex items-center gap-6">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-slate-200 bg-white"
                                disabled={isTranslating}
                            >
                                {isTranslating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Languages className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {translationTargetMeta
                                        ? t('training:translatedTo', { language: translationTargetMeta.label })
                                        : t('training:translate')}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {t('training:translateTo')}
                            </div>
                            {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => (
                                <DropdownMenuItem key={lang.code} onClick={() => setTranslationTarget(lang.code)}>
                                    {lang.label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={showBilingual}
                                onCheckedChange={() => setShowBilingual(prev => !prev)}
                            >
                                {t('training:showBilingual')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuItem onClick={() => setTranslationTarget(null)}>
                                {t('training:viewOriginal')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-3 px-3 md:px-5 py-2 md:py-3 rounded-2xl bg-white border-2 shadow-sm transition-all animate-in fade-in slide-in-from-right-4",
                            timeLeft < 60 ? 'border-red-200 text-red-600' : 'border-hotel-gold/30 text-hotel-navy'
                        )}>
                            <Clock className={cn("h-4 w-4 md:h-5 md:w-5", timeLeft < 60 && "animate-pulse")} />
                            <span className="font-mono text-lg md:text-xl font-bold tracking-tight">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Premium Progress Bar */}
            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-hotel-gold-dark via-hotel-gold to-hotel-gold-light"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / (quiz.questions?.length || 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                />
            </div>

            <AnimatePresence mode="wait">
                {currentQuestion && (
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-md rounded-2xl md:rounded-3xl overflow-hidden ring-1 ring-hotel-navy/5">
                            <CardContent className="p-5 md:p-10 space-y-6 md:space-y-10">
                                <div className={cn("space-y-4 md:space-y-6", isRTL && "text-right")}>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-hotel-navy text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                                        <HelpCircle className="h-3 w-3" />
                                        {t('knowledgeCheck')}
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-bold text-hotel-navy leading-tight">
                                        {displayQuestionText}
                                    </h2>
                                    {showBilingual && translationTarget && translatedCurrent?.text && (
                                        <p className={cn("text-sm text-slate-500", isRTL && "text-right")}>
                                            {currentQuestion.question?.question_text}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {currentQuestion.question?.question_type === 'mcq' && (
                                        <RadioGroup
                                            value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                            onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                            className="grid gap-3"
                                        >
                                            {!currentQuestion.question.options?.length && (
                                                <p className="text-red-500 p-4 border-2 border-dashed rounded-xl">{t('training:quizzes.player.no_options')}</p>
                                            )}
                                            {currentQuestion.question.options?.map((opt, idx) => {
                                                const isSelected = answers[currentQuestion.question_id] === opt.id
                                                const translatedOption = displayOptionText(opt.id, opt.option_text)
                                                return (
                                                    <motion.div
                                                        key={opt.id || idx}
                                                        whileHover={{ scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={cn(
                                                            "group flex items-center gap-3 md:gap-4 border-2 p-4 md:p-6 rounded-xl md:rounded-2xl transition-all cursor-pointer",
                                                            isSelected
                                                                ? 'bg-hotel-navy/5 border-hotel-gold shadow-lg ring-1 ring-hotel-gold'
                                                                : 'bg-white border-slate-100 hover:border-hotel-gold/50 hover:shadow-md'
                                                        )}
                                                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 md:h-6 md:w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                            isSelected ? "border-hotel-gold bg-hotel-gold" : "border-slate-200 group-hover:border-hotel-gold/50"
                                                        )}>
                                                            {isSelected && <div className="h-2 w-2 rounded-full bg-hotel-navy" />}
                                                        </div>
                                                        <span className={cn(
                                                            "flex-1 text-base md:text-lg transition-colors",
                                                            isSelected ? "text-hotel-navy font-bold" : "text-slate-600 group-hover:text-hotel-navy",
                                                            isRTL && "text-right"
                                                        )}>
                                                            {translatedOption || <span className="text-red-300 italic">{t('training:quizzes.player.empty_option')}</span>}
                                                            {showBilingual && translationTarget && translatedOption && opt.option_text && translatedOption !== opt.option_text && (
                                                                <span className="block text-xs text-slate-400 mt-1">
                                                                    {opt.option_text}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })}
                                        </RadioGroup>
                                    )}

                                    {currentQuestion.question?.question_type === 'mcq_multi' && (
                                        <div className="grid gap-3">
                                            {!currentQuestion.question.options?.length && (
                                                <p className="text-red-500 p-4 border-2 border-dashed rounded-xl">{t('training:quizzes.player.no_options')}</p>
                                            )}
                                            {currentQuestion.question.options?.map((opt, idx) => {
                                                const selectedAnswers = Array.isArray(answers[currentQuestion.question_id]) ? answers[currentQuestion.question_id] as string[] : []
                                                const isSelected = selectedAnswers.includes(opt.id)
                                                const translatedOption = displayOptionText(opt.id, opt.option_text)
                                                return (
                                                    <motion.div
                                                        key={opt.id || idx}
                                                        whileHover={{ scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={cn(
                                                            "group flex items-center gap-3 md:gap-4 border-2 p-4 md:p-6 rounded-xl md:rounded-2xl transition-all cursor-pointer",
                                                            isSelected
                                                                ? 'bg-hotel-navy/5 border-hotel-gold shadow-lg ring-1 ring-hotel-gold'
                                                                : 'bg-white border-slate-100 hover:border-hotel-gold/50 hover:shadow-md'
                                                        )}
                                                        onClick={() => {
                                                            const next = isSelected
                                                                ? selectedAnswers.filter(id => id !== opt.id)
                                                                : [...selectedAnswers, opt.id]
                                                            setAnswers({ ...answers, [currentQuestion.question_id]: Array.from(new Set(next)) })
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const next = checked
                                                                    ? [...selectedAnswers, opt.id]
                                                                    : selectedAnswers.filter(id => id !== opt.id)
                                                                setAnswers({ ...answers, [currentQuestion.question_id]: Array.from(new Set(next)) })
                                                            }}
                                                            className="h-5 w-5 md:h-6 md:w-6"
                                                        />
                                                        <span className={cn(
                                                            "flex-1 text-base md:text-lg transition-colors",
                                                            isSelected ? "text-hotel-navy font-bold" : "text-slate-600 group-hover:text-hotel-navy",
                                                            isRTL && "text-right"
                                                        )}>
                                                            {translatedOption || <span className="text-red-300 italic">{t('training:quizzes.player.empty_option')}</span>}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'true_false' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {['true', 'false'].map((option) => {
                                                const isSelected = answers[currentQuestion.question_id] === option
                                                return (
                                                    <motion.button
                                                        key={option}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: option })}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all gap-4",
                                                            isSelected
                                                                ? 'bg-hotel-navy border-hotel-gold text-white shadow-2xl'
                                                                : 'bg-white border-slate-100 text-slate-500 hover:border-hotel-gold/50'
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                            isSelected ? "bg-hotel-gold text-hotel-navy" : "bg-slate-50 text-slate-400 group-hover:bg-hotel-gold/10"
                                                        )}>
                                                            {option === 'true' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                                        </div>
                                                        <span className="text-xl font-bold uppercase tracking-widest">
                                                            {t(`training:quizzes.player.${option}_label`)}
                                                        </span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'fill_blank' && (
                                        <div className="relative group">
                                            <Input
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                                placeholder={t('training:quizzes.player.type_answer')}
                                                className={cn(
                                                    "text-lg md:text-2xl p-6 md:p-10 h-auto rounded-2xl md:rounded-3xl border-2 transition-all bg-white/50 backdrop-blur-sm",
                                                    "focus:ring-hotel-gold focus:border-hotel-gold placeholder:text-slate-300 border-slate-100 shadow-inner",
                                                    isRTL && "text-right"
                                                )}
                                            />
                                            <div className={cn(
                                                "absolute bottom-4 opacity-10 pointer-events-none",
                                                isRTL ? "left-6" : "right-6"
                                            )}>
                                                <PenBox className="h-10 w-10 text-hotel-navy" />
                                            </div>
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'scenario' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (
                                            <RadioGroup
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                                className="grid gap-3"
                                            >
                                                {currentQuestion.question.options?.map((opt, idx) => {
                                                    const isSelected = answers[currentQuestion.question_id] === opt.id
                                                    const translatedOption = displayOptionText(opt.id, opt.option_text)
                                                    return (
                                                        <motion.div
                                                            key={opt.id || idx}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className={cn(
                                                                "group flex items-center gap-3 md:gap-4 border-2 p-4 md:p-6 rounded-xl md:rounded-2xl transition-all cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-hotel-navy/5 border-hotel-gold shadow-lg ring-1 ring-hotel-gold'
                                                                    : 'bg-white border-slate-100 hover:border-hotel-gold/50 hover:shadow-md'
                                                            )}
                                                            onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                        >
                                                            <div className={cn(
                                                                "h-5 w-5 md:h-6 md:w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                isSelected ? "border-hotel-gold bg-hotel-gold" : "border-slate-200 group-hover:border-hotel-gold/50"
                                                            )}>
                                                                {isSelected && <div className="h-2 w-2 rounded-full bg-hotel-navy" />}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-base md:text-lg transition-colors",
                                                                isSelected ? "text-hotel-navy font-bold" : "text-slate-600 group-hover:text-hotel-navy",
                                                                isRTL && "text-right"
                                                            )}>
                                                                {translatedOption || <span className="text-red-300 italic">{t('training:quizzes.player.empty_option')}</span>}
                                                            </span>
                                                        </motion.div>
                                                    )
                                                })}
                                            </RadioGroup>
                                        ) : (
                                            <div className="relative group">
                                                <Input
                                                    value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                                    placeholder={t('training:quizzes.player.type_answer')}
                                                    className={cn(
                                                        "text-lg md:text-2xl p-6 md:p-10 h-auto rounded-2xl md:rounded-3xl border-2 transition-all bg-white/50 backdrop-blur-sm",
                                                        "focus:ring-hotel-gold focus:border-hotel-gold placeholder:text-slate-300 border-slate-100 shadow-inner",
                                                        isRTL && "text-right"
                                                    )}
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Navigation Controls */}
            <div className={cn(
                "flex items-center justify-between pt-6 px-2",
                isRTL && "flex-row-reverse"
            )}>
                <Button
                    variant="ghost"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="text-hotel-navy hover:bg-hotel-navy/5 hover:text-hotel-navy px-4 md:px-6 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl transition-all disabled:opacity-30"
                >
                    <ArrowLeft className={cn("h-4 w-4 md:h-5 md:w-5 md:mr-3", isRTL && "rotate-180")} />
                    <span className="hidden xs:inline font-bold tracking-wide uppercase text-[10px] md:text-xs">{t('training:quizzes.player.previous')}</span>
                </Button>

                {currentQuestionIndex < (quiz.questions?.length || 0) - 1 ? (
                    <Button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        disabled={!hasAnswer(currentQuestion?.question_id)}
                        className="bg-hotel-navy hover:bg-hotel-navy-dark text-white px-6 md:px-8 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 group"
                    >
                        <span className="font-bold tracking-widest uppercase text-[10px] md:text-xs mr-2 md:mr-3">{t('training:quizzes.player.next')}</span>
                        <ArrowRight className={cn("h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1", isRTL && "rotate-180")} />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitted || !hasAnswer(currentQuestion?.question_id)}
                        className="bg-gradient-to-r from-hotel-navy to-hotel-navy-dark hover:from-hotel-gold-dark hover:to-hotel-gold hover:text-hotel-navy text-white px-6 md:px-10 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 font-bold uppercase tracking-widest text-[10px] md:text-xs"
                    >
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 md:mr-3" />
                        <span>{t('training:quizzes.player.submit')}</span>
                    </Button>
                )}
            </div>
        </div>
    )
}
