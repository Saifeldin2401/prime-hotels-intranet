/**
 * Enhanced Quiz Component with Immediate Feedback & Gamification
 * 
 * Enhancements over base QuizComponent:
 * - Immediate feedback after each question (not just at end)
 * - Streak counter for consecutive correct answers
 * - Question-by-question progress with celebration animations
 * - Performance insights during quiz
 * - Power-ups system (earned through participation)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    CheckCircle2,
    XCircle,
    Award,
    Clock,
    ArrowRight,
    HelpCircle,
    ArrowLeft,
    PenBox,
    Languages,
    Loader2,
    Zap,
    Target,
    Lightbulb,
    SkipForward,
    Flame,
    TrendingUp,
    Brain,
    Sparkles
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { learningService } from '@/services/learningService'
import { supabase } from '@/lib/supabase'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import type { LearningQuiz } from '@/types/learning'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'

// --- Types ---

interface QuizComponentEnhancedProps {
    quizId: string
    assignmentId?: string | null
    onComplete?: (result: QuizResult) => void
    onExit?: () => void
    certificateEnabled?: boolean
    translationTarget?: TranslationTargetLanguage | null
    showBilingual?: boolean
    enableImmediateFeedback?: boolean
    enablePowerUps?: boolean
}

interface QuizResult {
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    gradedAnswers: GradedAnswer[]
    streakAchieved: number
    timeSpentSeconds: number
    powerUpsUsed: PowerUpType[]
}

interface GradedAnswer {
    question_id: string
    answer: string
    correct: boolean
    timeSpentSeconds: number
}

type PowerUpType = 'timeFreeze' | 'fiftyFifty' | 'hint' | 'skip'

interface PowerUp {
    type: PowerUpType
    name: string
    icon: React.ReactNode
    description: string
    count: number
}

interface QuestionState {
    status: 'unanswered' | 'correct' | 'incorrect'
    timeSpentSeconds: number
    powerUpsUsed: PowerUpType[]
}

// --- Component ---

export function QuizComponentEnhanced({
    quizId,
    assignmentId,
    onComplete,
    onExit,
    certificateEnabled = true,
    translationTarget: propTranslationTarget,
    showBilingual: propShowBilingual,
    enableImmediateFeedback = true,
    enablePowerUps = true
}: QuizComponentEnhancedProps) {
    const { toast } = useToast()
    const { user, profile, properties, departments } = useAuth()
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar'
    const translateAI = useTranslationAI()

    // Quiz data
    const [quiz, setQuiz] = useState<LearningQuiz | null>(null)
    const [loading, setLoading] = useState(true)

    // Answers & Progress
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [attemptCount, setAttemptCount] = useState(0)
    const [attemptLimitReached, setAttemptLimitReached] = useState(false)

    // Enhanced state
    const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({})
    const [streak, setStreak] = useState(0)
    const [maxStreak, setMaxStreak] = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [currentFeedback, setCurrentFeedback] = useState<'correct' | 'incorrect' | null>(null)
    const [eliminatedOptions, setEliminatedOptions] = useState<Set<string>>(new Set())
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
    const [quizStartTime] = useState<number>(Date.now())

    // Power-ups
    const [powerUps, setPowerUps] = useState<PowerUp[]>([
        { type: 'timeFreeze', name: 'Time Freeze', icon: <Zap className="h-4 w-4" />, description: '+30 seconds', count: 1 },
        { type: 'fiftyFifty', name: '50/50', icon: <Target className="h-4 w-4" />, description: 'Remove 2 wrong', count: 1 },
        { type: 'hint', name: 'Hint', icon: <Lightbulb className="h-4 w-4" />, description: 'Show explanation', count: 1 },
        { type: 'skip', name: 'Skip', icon: <SkipForward className="h-4 w-4" />, description: 'Next question', count: 0 },
    ])
    const [powerUpsUsed, setPowerUpsUsed] = useState<PowerUpType[]>([])
    const [hintRevealed, setHintRevealed] = useState<Set<string>>(new Set())

    // Timer
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [timeFrozen, setTimeFrozen] = useState(false)

    // Translation
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(propTranslationTarget || null)
    const [showBilingual, setShowBilingual] = useState(propShowBilingual || false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translatedQuestions, setTranslatedQuestions] = useState<Record<string, Partial<Record<TranslationTargetLanguage, {
        text: string
        explanation?: string
        options?: Record<string, string>
    }>>>>({})

    // Final result
    const [result, setResult] = useState<QuizResult | null>(null)

    // Load quiz
    useEffect(() => {
        if (quizId) {
            loadQuiz(quizId)
        }
    }, [quizId, user?.id])

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

    // Timer
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (timeLeft !== null && timeLeft > 0 && !submitted && !timeFrozen && !showFeedback) {
            timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
            }, 1000)
        } else if (timeLeft === 0 && !submitted) {
            handleTimeUp()
        }
        return () => clearInterval(timer)
    }, [timeLeft, submitted, timeFrozen, showFeedback])

    // Track time per question
    useEffect(() => {
        setQuestionStartTime(Date.now())
        setEliminatedOptions(new Set())
    }, [currentQuestionIndex])

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

            // Initialize question states
            const initialStates: Record<string, QuestionState> = {}
            data.questions?.forEach(q => {
                initialStates[q.question_id] = {
                    status: 'unanswered',
                    timeSpentSeconds: 0,
                    powerUpsUsed: []
                }
            })
            setQuestionStates(initialStates)
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

    const handleTimeUp = () => {
        toast({
            title: t('training:quizzes.player.time_up'),
            description: t('training:quizzes.player.auto_submitting'),
            variant: 'destructive'
        })
        handleSubmit(true)
    }

    const getCurrentQuestionTime = () => {
        return Math.floor((Date.now() - questionStartTime) / 1000)
    }

    const hasAnswer = (questionId?: string) => {
        if (!questionId) return false
        const value = answers[questionId]
        if (Array.isArray(value)) return value.length > 0
        return typeof value === 'string' && value.trim().length > 0
    }

    const normalizeSelectedOptions = (value: string | string[] | undefined): string[] => {
        if (Array.isArray(value)) return value
        if (typeof value === 'string' && value.length > 0) {
            return value.split(',').map(v => v.trim()).filter(Boolean)
        }
        return []
    }

    const gradeQuestionAnswer = (
        question: NonNullable<NonNullable<LearningQuiz['questions']>[number]['question']>,
        userAnswer: string | string[] | undefined
    ): boolean => {
        switch (question.question_type) {
            case 'mcq': {
                const hasOptions = (question.options?.length || 0) > 0
                if (hasOptions) {
                    const selected = typeof userAnswer === 'string' ? userAnswer : ''
                    const selectedOption = question.options?.find(o => o.id === selected)
                    return !!selectedOption?.is_correct
                }
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return selected.toLowerCase().trim() === (question.correct_answer || '').toLowerCase().trim()
            }
            case 'mcq_multi': {
                const selectedOptions = normalizeSelectedOptions(userAnswer)
                const correctOptions = question.options?.filter(o => o.is_correct).map(o => o.id) || []
                return (
                    correctOptions.length === selectedOptions.length &&
                    correctOptions.every(id => selectedOptions.includes(id))
                )
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
            case 'true_false':
            case 'fill_blank': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return selected.toLowerCase().trim() === (question.correct_answer || '').toLowerCase().trim()
            }
            default:
                return false
        }
    }

    const gradeCurrentQuestion = (): boolean => {
        const currentQuestion = quiz?.questions?.[currentQuestionIndex]
        if (!currentQuestion) return false

        return currentQuestion.question
            ? gradeQuestionAnswer(currentQuestion.question, answers[currentQuestion.question_id])
            : false
    }

    const handleAnswerSubmit = () => {
        const currentQuestion = quiz?.questions?.[currentQuestionIndex]
        if (!currentQuestion) return
        if (attemptLimitReached) return

        const isCorrect = gradeCurrentQuestion()
        const timeSpent = getCurrentQuestionTime()

        // Update question state
        setQuestionStates(prev => ({
            ...prev,
            [currentQuestion.question_id]: {
                status: isCorrect ? 'correct' : 'incorrect',
                timeSpentSeconds: timeSpent,
                powerUpsUsed: [...(prev[currentQuestion.question_id]?.powerUpsUsed || []), ...powerUpsUsed]
            }
        }))

        // Update streak
        if (isCorrect) {
            const newStreak = streak + 1
            setStreak(newStreak)
            if (newStreak > maxStreak) {
                setMaxStreak(newStreak)
            }
        } else {
            setStreak(0)
        }

        // Show feedback
        if (enableImmediateFeedback) {
            setCurrentFeedback(isCorrect ? 'correct' : 'incorrect')
            setShowFeedback(true)
        } else {
            // Classic mode - just advance
            advanceQuestion()
        }
    }

    const advanceQuestion = () => {
        setShowFeedback(false)
        setCurrentFeedback(null)

        const isLast = currentQuestionIndex >= (quiz?.questions?.length || 0) - 1
        if (isLast) {
            handleSubmit()
        } else {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }

    const handleSubmit = async (isTimeout = false) => {
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

            setSubmitted(true)
            const nextAttemptCount = attemptCount + 1

            // Grade all answers
            let correctCount = 0
            const gradedAnswers: GradedAnswer[] = quiz.questions?.map(q => {
                const rawAnswer = answers[q.question_id]
                const userAnswer = Array.isArray(rawAnswer) ? rawAnswer.join(',') : (rawAnswer || '')
                const isCorrect = q.question
                    ? gradeQuestionAnswer(q.question, rawAnswer)
                    : false

                if (isCorrect) correctCount++
                return {
                    question_id: q.question_id,
                    answer: userAnswer,
                    correct: isCorrect,
                    timeSpentSeconds: questionStates[q.question_id]?.timeSpentSeconds || 0
                }
            }) || []

            const totalQuestions = quiz.questions?.length || 0
            const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
            const passed = percentage >= quiz.passing_score_percentage
            const totalTimeSpent = Math.floor((Date.now() - quizStartTime) / 1000)

            const finalResult: QuizResult = {
                score: Math.round(percentage),
                passed,
                correctCount,
                totalQuestions,
                gradedAnswers,
                streakAchieved: maxStreak,
                timeSpentSeconds: totalTimeSpent,
                powerUpsUsed
            }

            setResult(finalResult)

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

            // Certificate generation
            if (passed && certificateEnabled) {
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
                    await createCertificate(certificateData)

                    toast({
                        title: t('training:quizzes.player.certificate_earned'),
                        description: t('training:quizzes.player.certificate_desc', { title: quiz.title }),
                        variant: 'default'
                    })
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                }
            }

            toast({
                title: passed
                    ? t('training:quizzes.player.passed_toast_title')
                    : t('training:quizzes.player.failed_toast_title'),
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

    // Power-up handlers
    const activatePowerUp = (type: PowerUpType) => {
        const powerUp = powerUps.find(p => p.type === type)
        if (!powerUp || powerUp.count <= 0) return

        const currentQuestion = quiz?.questions?.[currentQuestionIndex]
        if (!currentQuestion) return

        // Deduct power-up
        setPowerUps(prev => prev.map(p =>
            p.type === type ? { ...p, count: p.count - 1 } : p
        ))
        setPowerUpsUsed(prev => [...prev, type])

        switch (type) {
            case 'timeFreeze':
                setTimeFrozen(true)
                toast({ title: '⏱️ Time Frozen!', description: '+30 seconds added' })
                setTimeout(() => setTimeFrozen(false), 30000)
                break
            case 'fiftyFifty':
                if (currentQuestion.question?.question_type === 'mcq' || (currentQuestion.question?.question_type === 'scenario' && (currentQuestion.question.options?.length || 0) > 0)) {
                    const wrongOptions = currentQuestion.question.options?.filter(o => !o.is_correct) || []
                    const toEliminate = wrongOptions.slice(0, Math.min(2, wrongOptions.length)).map(o => o.id)
                    setEliminatedOptions(new Set(toEliminate))
                }
                break
            case 'hint':
                setHintRevealed(prev => new Set(prev).add(currentQuestion.question_id))
                break
            case 'skip':
                advanceQuestion()
                break
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Translation helpers
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
            const options = questionItem.question.options || []

            // 1. Collect all texts: [Question, Explanation, Option1, Option2, ...]
            const textsToTranslate = [
                questionText,
                explanationText,
                ...options.map(o => o.option_text || '')
            ]

            // 2. Batch translation call
            const res = await translateAI.mutateAsync({
                texts: textsToTranslate,
                target_lang: translationTarget,
                source_lang: 'auto'
            })

            if (!res.translated_texts) throw new Error('No translations returned')

            // 3. Unpack results
            const translatedQText = res.translated_texts[0]
            const translatedExpText = res.translated_texts[1]
            const translatedOptsList = res.translated_texts.slice(2)

            const translatedOptionsMap: Record<string, string> = {}
            options.forEach((opt, idx) => {
                translatedOptionsMap[opt.id] = translatedOptsList[idx] || ''
            })

            setTranslatedQuestions(prev => ({
                ...prev,
                [questionItem.question_id]: {
                    ...prev[questionItem.question_id],
                    [translationTarget]: {
                        text: translatedQText,
                        explanation: translatedExpText,
                        options: translatedOptionsMap
                    }
                }
            }))
        } catch (error) {
            console.error('Quiz translation failed:', error)
        } finally {
            setIsTranslating(false)
        }
    }

    // Trigger translation when question or language changes
    useEffect(() => {
        const currentQ = quiz?.questions?.[currentQuestionIndex]
        if (translationTarget && currentQ) {
             // Use translateQuestion which is available in scope (hoisted via closure capture or defined above)
             // But getTranslatedQuestion is defined below.
             // To be 100% safe, we can move the check logic or access getTranslatedQuestion if we trust it's initialized.
             // Given getTranslatedQuestion is const, it is initialized by the time effect runs.

             // However, to avoid any linter warnings about missing deps or scope:
             const translated = translatedQuestions[currentQ.question_id]?.[translationTarget]
             if (!translated || !translated.text) {
                 translateQuestion(currentQ)
             }
        }
    }, [translationTarget, currentQuestionIndex, quiz, translatedQuestions])

    const getTranslatedQuestion = (questionItem?: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!questionItem || !translationTarget) return null
        return translatedQuestions[questionItem.question_id]?.[translationTarget] || null
    }

    // Render helpers
    const currentQuestion = quiz?.questions?.[currentQuestionIndex]
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

    if (loading || !quiz) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-hotel-gold/20 border-t-hotel-gold rounded-full animate-spin" />
                        <Brain className="h-6 w-6 text-hotel-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-slate-500 font-medium">{t('training:quizzes.player.loading')}</p>
                </motion.div>
            </div>
        )
    }

    // Results screen
    if (result) {
        return (
            <QuizResultsScreen
                result={result}
                quiz={quiz}
                onExit={onExit}
                onRetry={() => {
                    setResult(null)
                    setSubmitted(false)
                    setAnswers({})
                    setCurrentQuestionIndex(0)
                    setStreak(0)
                    setMaxStreak(0)
                    setPowerUpsUsed([])
                    loadQuiz(quiz.id)
                }}
                isRTL={isRTL}
                t={t}
                translatedQuestions={translatedQuestions}
                translationTarget={translationTarget}
                showBilingual={showBilingual}
                canRetry={!attemptLimitReached && (!quiz.max_attempts || attemptCount < quiz.max_attempts)}
            />
        )
    }

    // Feedback overlay
    const renderFeedbackOverlay = () => {
        if (!showFeedback || !currentFeedback) return null

        const isCorrect = currentFeedback === 'correct'
        const currentQ = quiz?.questions?.[currentQuestionIndex]
        const explanation = displayExplanation || currentQ?.question?.explanation
        const sourceSnippet = currentQ?.question?.linked_sop_section

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
                onClick={advanceQuestion}
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={cn(
                        "max-w-lg w-full rounded-3xl p-8 text-center shadow-2xl",
                        isCorrect ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" : "bg-gradient-to-br from-slate-700 to-slate-800 text-white"
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {isCorrect ? (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 className="h-12 w-12" />
                            </motion.div>
                            <h3 className="text-3xl font-bold mb-2">Correct!</h3>
                            {streak > 1 && (
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <Flame className="h-5 w-5 text-orange-300" />
                                    <span className="text-lg font-semibold">{streak} in a row!</span>
                                </div>
                            )}
                            <p className="text-white/80 mb-6">+10 points</p>
                        </>
                    ) : (
                        <>
                            <motion.div
                                initial={{ x: -10 }}
                                animate={{ x: [0, 10, -10, 10, 0] }}
                                transition={{ duration: 0.4 }}
                                className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <XCircle className="h-12 w-12" />
                            </motion.div>
                            <h3 className="text-3xl font-bold mb-2">Not quite</h3>
                            <p className="text-white/70 mb-6">Don't worry, keep learning!</p>
                        </>
                    )}

                    {explanation && (
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                            <p className="text-sm text-white/60 mb-1">Explanation:</p>
                            <p className="text-sm">{explanation}</p>
                        </div>
                    )}
                    {sourceSnippet && (
                        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                            <p className="text-sm text-white/60 mb-1">Source:</p>
                            <p className="text-sm">{sourceSnippet}</p>
                        </div>
                    )}

                    <Button
                        onClick={advanceQuestion}
                        className={cn(
                            "px-8 py-6 rounded-xl font-bold text-lg",
                            isCorrect
                                ? "bg-white text-emerald-600 hover:bg-white/90"
                                : "bg-white text-slate-700 hover:bg-white/90"
                        )}
                    >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </motion.div>
            </motion.div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* Header with Stats */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4"
            >
                <div className={cn("space-y-1", isRTL && "text-right")}>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-hotel-gold-dark uppercase">
                        {t('training:quizzes.player.question_counter', {
                            current: currentQuestionIndex + 1,
                            total: quiz.questions?.length
                        })}
                    </p>
                    <h1 className="text-xl md:text-2xl font-bold text-hotel-navy">{quiz.title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Streak Badge */}
                    {streak > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-xl font-bold"
                        >
                            <Flame className="h-4 w-4" />
                            {streak}
                        </motion.div>
                    )}

                    {/* Timer */}
                    {timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono font-bold",
                            timeLeft < 60 ? 'border-red-200 text-red-600 bg-red-50' : 'border-hotel-gold/30 text-hotel-navy bg-white',
                            timeFrozen && "border-blue-200 text-blue-600 bg-blue-50"
                        )}>
                            <Clock className={cn("h-4 w-4", timeLeft < 60 && "animate-pulse")} />
                            <span>{formatTime(timeLeft)}</span>
                            {timeFrozen && <span className="text-xs">FROZEN</span>}
                        </div>
                    )}

                    {/* Translation */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isTranslating}>
                                {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => (
                                <DropdownMenuItem key={lang.code} onClick={() => setTranslationTarget(lang.code)}>
                                    {lang.label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem checked={showBilingual} onCheckedChange={() => setShowBilingual(!showBilingual)}>
                                Show Bilingual
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-hotel-gold-dark via-hotel-gold to-hotel-gold-light"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex) / (quiz.questions?.length || 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                />
            </div>

            {/* Power-ups Bar */}
            {enablePowerUps && (
                <div className="flex items-center gap-2 justify-center">
                    {powerUps.filter(p => p.count > 0).map(powerUp => (
                        <Button
                            key={powerUp.type}
                            variant="outline"
                            size="sm"
                            onClick={() => activatePowerUp(powerUp.type)}
                            className="gap-2 border-hotel-gold/30 hover:bg-hotel-gold/10"
                            disabled={showFeedback}
                        >
                            {powerUp.icon}
                            <span className="hidden sm:inline">{powerUp.name}</span>
                            <Badge variant="secondary" className="ml-1">{powerUp.count}</Badge>
                        </Button>
                    ))}
                </div>
            )}

            {/* Question Card */}
            <AnimatePresence mode="wait">
                {currentQuestion && (
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
                            <CardContent className="p-6 md:p-10 space-y-6">
                                {/* Question */}
                                <div className={cn("space-y-4", isRTL && "text-right")}>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-hotel-navy text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                                        <HelpCircle className="h-3 w-3" />
                                        Question {currentQuestionIndex + 1}
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-bold text-hotel-navy leading-tight">
                                        {displayQuestionText}
                                    </h2>
                                    {showBilingual && translationTarget && translatedCurrent?.text && (
                                        <p className="text-sm text-slate-500">{currentQuestion.question?.question_text}</p>
                                    )}
                                </div>

                                {/* Hint (if revealed) */}
                                {hintRevealed.has(currentQuestion.question_id) && displayExplanation && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-800">{displayExplanation}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Answer Options */}
                                <div className="space-y-3">
                                    {currentQuestion.question?.question_type === 'mcq' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (
                                            <RadioGroup
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                                className="grid gap-3"
                                            >
                                                {currentQuestion.question.options?.map((opt, idx) => {
                                                    const isEliminated = eliminatedOptions.has(opt.id)
                                                    const isSelected = answers[currentQuestion.question_id] === opt.id
                                                    const translatedOption = displayOptionText(opt.id, opt.option_text)

                                                    if (isEliminated) return null

                                                    return (
                                                        <motion.div
                                                            key={opt.id || idx}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className={cn(
                                                                "group flex items-center gap-4 border-2 p-4 rounded-xl transition-all cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-hotel-navy/5 border-hotel-gold shadow-md'
                                                                    : 'bg-white border-slate-100 hover:border-hotel-gold/50'
                                                            )}
                                                            onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                        >
                                                            <div className={cn(
                                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                isSelected ? "border-hotel-gold bg-hotel-gold" : "border-slate-200"
                                                            )}>
                                                                {isSelected && <div className="h-2 w-2 rounded-full bg-hotel-navy" />}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-base",
                                                                isSelected ? "text-hotel-navy font-bold" : "text-slate-600",
                                                                isRTL && "text-right"
                                                            )}>
                                                                {translatedOption}
                                                            </span>
                                                        </motion.div>
                                                    )
                                                })}
                                            </RadioGroup>
                                        ) : (
                                            <Input
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                                placeholder="Type your answer..."
                                                className="text-lg p-6 h-auto rounded-xl border-2"
                                            />
                                        )
                                    )}

                                    {currentQuestion.question?.question_type === 'mcq_multi' && (
                                        <div className="grid gap-3">
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
                                                            "group flex items-center gap-4 border-2 p-4 rounded-xl transition-all cursor-pointer",
                                                            isSelected
                                                                ? 'bg-hotel-navy/5 border-hotel-gold shadow-md'
                                                                : 'bg-white border-slate-100 hover:border-hotel-gold/50'
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
                                                            className="h-5 w-5"
                                                        />
                                                        <span className={cn(
                                                            "flex-1 text-base",
                                                            isSelected ? "text-hotel-navy font-bold" : "text-slate-600",
                                                            isRTL && "text-right"
                                                        )}>
                                                            {translatedOption}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'true_false' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {['true', 'false'].map((option) => {
                                                const isSelected = answers[currentQuestion.question_id] === option
                                                return (
                                                    <motion.button
                                                        key={option}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: option })}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
                                                            isSelected
                                                                ? 'bg-hotel-navy border-hotel-gold text-white'
                                                                : 'bg-white border-slate-100 text-slate-500 hover:border-hotel-gold/50'
                                                        )}
                                                    >
                                                        {option === 'true' ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                                                        <span className="text-lg font-bold uppercase">{option}</span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'fill_blank' && (
                                        <Input
                                            value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                            onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                            placeholder="Type your answer..."
                                            className="text-lg p-6 h-auto rounded-xl border-2"
                                        />
                                    )}

                                    {currentQuestion.question?.question_type === 'scenario' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (
                                            <RadioGroup
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                                className="grid gap-3"
                                            >
                                                {currentQuestion.question.options?.map((opt, idx) => {
                                                    const isEliminated = eliminatedOptions.has(opt.id)
                                                    const isSelected = answers[currentQuestion.question_id] === opt.id
                                                    const translatedOption = displayOptionText(opt.id, opt.option_text)

                                                    if (isEliminated) return null

                                                    return (
                                                        <motion.div
                                                            key={opt.id || idx}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className={cn(
                                                                "group flex items-center gap-4 border-2 p-4 rounded-xl transition-all cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-hotel-navy/5 border-hotel-gold shadow-md'
                                                                    : 'bg-white border-slate-100 hover:border-hotel-gold/50'
                                                            )}
                                                            onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                        >
                                                            <div className={cn(
                                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                isSelected ? "border-hotel-gold bg-hotel-gold" : "border-slate-200"
                                                            )}>
                                                                {isSelected && <div className="h-2 w-2 rounded-full bg-hotel-navy" />}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-base",
                                                                isSelected ? "text-hotel-navy font-bold" : "text-slate-600",
                                                                isRTL && "text-right"
                                                            )}>
                                                                {translatedOption}
                                                            </span>
                                                        </motion.div>
                                                    )
                                                })}
                                            </RadioGroup>
                                        ) : (
                                            <Input
                                                value={typeof answers[currentQuestion.question_id] === 'string' ? answers[currentQuestion.question_id] as string : ''}
                                                onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                                placeholder="Type your answer..."
                                                className="text-lg p-6 h-auto rounded-xl border-2"
                                            />
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation */}
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <Button
                    variant="ghost"
                    disabled={currentQuestionIndex === 0 || showFeedback}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    <ArrowLeft className={cn("h-4 w-4 mr-2", isRTL && "rotate-180")} />
                    Previous
                </Button>

                <Button
                    onClick={handleAnswerSubmit}
                    disabled={!hasAnswer(currentQuestion?.question_id) || showFeedback || attemptLimitReached}
                    className="bg-hotel-navy hover:bg-hotel-navy-dark text-white px-8 py-6 rounded-xl font-bold"
                >
                    Submit Answer
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                </Button>
            </div>

            {attemptLimitReached && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {t('training:quizzes.player.limit_reached_desc', { count: quiz.max_attempts || 0 })}
                </div>
            )}

            {/* Feedback Overlay */}
            <AnimatePresence>
                {renderFeedbackOverlay()}
            </AnimatePresence>
        </div>
    )
}

// --- Results Screen Component ---

interface QuizResultsScreenProps {
    result: QuizResult
    quiz: LearningQuiz
    onExit?: () => void
    onRetry: () => void
    canRetry: boolean
    isRTL: boolean
    t: any
    translatedQuestions: Record<string, any>
    translationTarget: TranslationTargetLanguage | null
    showBilingual: boolean
}

function QuizResultsScreen({
    result,
    quiz,
    onExit,
    onRetry,
    canRetry,
    isRTL,
    t,
    translatedQuestions,
    translationTarget,
    showBilingual
}: QuizResultsScreenProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
        >
            {/* Main Result Card */}
            <Card className={cn(
                "text-center p-8 border-2 shadow-xl",
                result.passed ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-red-200 bg-gradient-to-br from-red-50 to-white"
            )}>
                <CardContent className="space-y-6">
                    {/* Status Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={cn(
                            "w-24 h-24 rounded-full flex items-center justify-center mx-auto",
                            result.passed ? "bg-emerald-100" : "bg-red-100"
                        )}>
                        {result.passed ? (
                            <Award className="h-12 w-12 text-emerald-600" />
                        ) : (
                            <XCircle className="h-12 w-12 text-red-500" />
                        )}
                    </motion.div>

                    {/* Score */}
                    <div>
                        <h2 className="text-3xl font-bold mb-2 text-hotel-navy">
                            {result.passed ? 'Congratulations!' : 'Keep Practicing'}
                        </h2>
                        <p className="text-muted-foreground">
                            You scored <span className="font-bold text-hotel-navy">{result.score}%</span>
                            {' '}({result.correctCount}/{result.totalQuestions} correct)
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                            value={result.correctCount}
                            label="Correct"
                            color="emerald"
                        />
                        <StatCard
                            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                            value={`${result.score}%`}
                            label="Score"
                            color="blue"
                        />
                        <StatCard
                            icon={<Flame className="h-5 w-5 text-orange-600" />}
                            value={result.streakAchieved}
                            label="Best Streak"
                            color="orange"
                        />
                        <StatCard
                            icon={<Clock className="h-5 w-5 text-purple-600" />}
                            value={formatTime(result.timeSpentSeconds)}
                            label={t("common:time")}
                            color="purple"
                        />
                    </div>

                    {/* Achievements */}
                    {result.streakAchieved >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">{result.streakAchieved} Answer Streak!</span>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap justify-center gap-3 pt-4">
                        {onExit && (
                            <Button onClick={onExit} variant="outline" className="px-6">
                                Back to Learning
                            </Button>
                        )}
                        {!result.passed && canRetry && (
                            <Button onClick={onRetry} className="bg-hotel-navy hover:bg-hotel-navy-dark px-6">
                                Try Again
                            </Button>
                        )}
                        {!result.passed && !canRetry && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                                Attempt limit reached
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Review Answers */}
            <Card className="border-slate-200">
                <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-hotel-navy mb-4">Review Answers</h3>
                    <div className="space-y-4">
                        {result.gradedAnswers?.map((answer, index) => {
                            const question = quiz.questions?.find(q => q.question_id === answer.question_id)?.question
                            if (!question) return null
                            const selectedValues = answer.answer
                                ? answer.answer.split(',').map(v => v.trim()).filter(Boolean)
                                : []
                            const hasOptions = question.question_type === 'mcq' || question.question_type === 'mcq_multi' || (question.question_type === 'scenario' && (question.options?.length || 0) > 0)
                            const userAnswerDisplay = hasOptions
                                ? (selectedValues.length > 0
                                    ? selectedValues
                                        .map((id) => question.options?.find(o => o.id === id)?.option_text)
                                        .filter(Boolean)
                                        .join(', ')
                                    : '(No answer)')
                                : (answer.answer || '(No answer)')
                            const correctAnswerDisplay = hasOptions
                                ? (question.options || [])
                                    .filter(o => o.is_correct)
                                    .map(o => o.option_text)
                                    .filter(Boolean)
                                    .join(', ')
                                : question.correct_answer

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "p-4 rounded-xl border-2",
                                        answer.correct ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                                            answer.correct ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="font-medium text-slate-800">{question.question_text}</p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className={answer.correct ? "text-emerald-700" : "text-red-700"}>
                                                    Your answer: {userAnswerDisplay}
                                                </span>
                                                {!answer.correct && (
                                                    <span className="text-emerald-700">
                                                        Correct: {correctAnswerDisplay}
                                                    </span>
                                                )}
                                            </div>
                                            {question.explanation && (
                                                <p className="text-xs text-slate-500 italic">{question.explanation}</p>
                                            )}
                                        </div>
                                        {answer.correct ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode, value: string | number, label: string, color: string }) {
    const colorClasses: Record<string, string> = {
        emerald: 'bg-emerald-50 border-emerald-100',
        blue: 'bg-blue-50 border-blue-100',
        orange: 'bg-orange-50 border-orange-100',
        purple: 'bg-purple-50 border-purple-100',
    }

    return (
        <div className={cn("p-4 rounded-xl border-2 text-center", colorClasses[color])}>
            <div className="flex justify-center mb-2">{icon}</div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    )
}
