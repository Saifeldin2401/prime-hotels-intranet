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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import { createCertificate, type CertificateData } from '@/services/certificateService'
import { isFreeTextAnswerCorrect } from '@/lib/questionAnswerMatch'
import { decodeMatchingAnswer, encodeMatchingAnswer, isMatchingAnswerCorrect, isOrderingAnswerCorrect } from '@/lib/questionOrderingMatching'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { learningService } from '@/services/learningService'
import type { LearningProgress, LearningQuiz } from '@/types/learning'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import {
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Award,
    Brain,
    CheckCircle2,
    Clock,
    Flame,
    HelpCircle,
    Languages,
    Lightbulb,
    Loader2,
    SkipForward,
    Sparkles,
    Target,
    TrendingUp,
    XCircle,
    Zap
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Deterministic-enough shuffle for presenting ordering/matching options -- doesn't need to be
// cryptographically random, just not the already-correct order.
function shuffleArrayStable<T>(items: T[]): T[] {
    const clone = [...items]
    for (let i = clone.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = clone[i]
        clone[i] = clone[j]
        clone[j] = temp
    }
    return clone
}

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
    initialQuiz?: LearningQuiz | null
}

interface QuizResult {
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    gradedAnswers: GradedAnswer[]
    reviewItems: QuizReviewItem[]
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

interface QuizReviewItem {
    questionId: string
    questionText: string
    selectedAnswer: string
    correctAnswer: string
    correct: boolean
    explanation?: string
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

const DEFAULT_POWER_UP_COUNTS: Record<PowerUpType, number> = {
    timeFreeze: 1,
    fiftyFifty: 1,
    hint: 1,
    skip: 0
}

const buildPowerUps = (counts: Partial<Record<PowerUpType, number>> = {}): PowerUp[] => ([
    {
        type: 'timeFreeze',
        name: 'Time Freeze',
        icon: <Zap className="h-4 w-4" />,
        description: '+30 seconds',
        count: Math.max(0, counts.timeFreeze ?? DEFAULT_POWER_UP_COUNTS.timeFreeze)
    },
    {
        type: 'fiftyFifty',
        name: '50/50',
        icon: <Target className="h-4 w-4" />,
        description: 'Remove 2 wrong',
        count: Math.max(0, counts.fiftyFifty ?? DEFAULT_POWER_UP_COUNTS.fiftyFifty)
    },
    {
        type: 'hint',
        name: 'Hint',
        icon: <Lightbulb className="h-4 w-4" />,
        description: 'Show explanation',
        count: Math.max(0, counts.hint ?? DEFAULT_POWER_UP_COUNTS.hint)
    },
    {
        type: 'skip',
        name: 'Skip',
        icon: <SkipForward className="h-4 w-4" />,
        description: 'Next question',
        count: Math.max(0, counts.skip ?? DEFAULT_POWER_UP_COUNTS.skip)
    }
])

type FeedbackOverlayProps = {
    showFeedback: boolean
    currentFeedback: 'correct' | 'incorrect' | null
    quiz: LearningQuiz | null
    currentQuestionIndex: number
    displayExplanation?: string | null
    streak: number
    onAdvance: () => void
}

function FeedbackOverlay({
    showFeedback,
    currentFeedback,
    quiz,
    currentQuestionIndex,
    displayExplanation,
    streak,
    onAdvance
}: FeedbackOverlayProps) {
    if (!showFeedback || !currentFeedback) return null

    const isCorrect = currentFeedback === 'correct'
    const currentQ = quiz?.questions?.[currentQuestionIndex]
    const explanation = displayExplanation || currentQ?.question?.explanation
    const sourceSnippet = currentQ?.question?.linked_sop_section

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-slate-950/55 p-4 backdrop-blur-sm"
            onClick={onAdvance}
        >
            <m.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={cn(
                    "max-h-[calc(100%-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl p-8 text-center shadow-2xl",
                    isCorrect ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" : "bg-gradient-to-br from-slate-700 to-slate-800 text-white"
                )}
                onClick={e => e.stopPropagation()}
            >
                {isCorrect ? (
                    <>
                        <m.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <CheckCircle2 className="h-12 w-12" />
                        </m.div>
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
                        <m.div
                            initial={{ x: -10 }}
                            animate={{ x: [0, 10, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                            className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <XCircle className="h-12 w-12" />
                        </m.div>
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
                    onClick={onAdvance}
                    className={cn(
                        "px-8 py-6 rounded-xl font-bold text-lg",
                        isCorrect
                            ? "bg-white text-emerald-600 hover:bg-white/90"
                            : "bg-white text-slate-700 hover:bg-white/90"
                    )}
                >
                    Continue
                    <ArrowRight className="ms-2 h-5 w-5" />
                </Button>
            </m.div>
        </m.div>
    )
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
    enablePowerUps = true,
    initialQuiz = null
}: QuizComponentEnhancedProps) {
    const { toast } = useToast()
    const { user, profile, properties, departments } = useAuth()
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar'
    const translateAI = useTranslationAI()

    // Quiz data
    const [quiz, setQuiz] = useState<LearningQuiz | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Answers & Progress
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [attemptCount, setAttemptCount] = useState(0)
    const [attemptLimitReached, setAttemptLimitReached] = useState(false)
    const attemptCountRef = useRef(0)
    const progressMetadataRef = useRef<Record<string, unknown> | null>(null)
    const attemptContextKey = assignmentId ? `assignment:${assignmentId}` : `quiz:${quizId}`

    // Enhanced state
    const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({})
    const [streak, setStreak] = useState(0)
    const [maxStreak, setMaxStreak] = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [currentFeedback, setCurrentFeedback] = useState<'correct' | 'incorrect' | null>(null)
    const [eliminatedOptions, setEliminatedOptions] = useState<Set<string>>(new Set())
    const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now())
    const [quizStartTime] = useState<number>(() => Date.now())
    const feedbackPauseMsRef = useRef(0)
    const feedbackPauseStartMsRef = useRef<number | null>(null)

    // Power-ups
    const [powerUps, setPowerUps] = useState<PowerUp[]>(() => buildPowerUps())
    const [powerUpsUsed, setPowerUpsUsed] = useState<PowerUpType[]>([])
    const [hintRevealed, setHintRevealed] = useState<Set<string>>(new Set())
    const powerUpsStorageKey = user?.id ? `quiz-powerups:${user.id}` : null

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
    const onExitRef = useRef(onExit)
    const toastRef = useRef(toast)

    // Final result
    const [result, setResult] = useState<QuizResult | null>(null)

    const submitRef = useRef<((isTimeout?: boolean) => Promise<void>) | null>(null)

    useEffect(() => {
        onExitRef.current = onExit
    }, [onExit])

    useEffect(() => {
        attemptCountRef.current = attemptCount
    }, [attemptCount])

    useEffect(() => {
        toastRef.current = toast
    }, [toast])

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
        if (!powerUpsStorageKey) {
            setPowerUps(buildPowerUps())
            return
        }

        try {
            const stored = localStorage.getItem(powerUpsStorageKey)
            if (!stored) {
                setPowerUps(buildPowerUps())
                return
            }

            const parsed = JSON.parse(stored) as Partial<Record<PowerUpType, number>>
            setPowerUps(buildPowerUps(parsed))
        } catch {
            setPowerUps(buildPowerUps())
        }
    }, [powerUpsStorageKey])

    useEffect(() => {
        if (!powerUpsStorageKey) return
        const counts = powerUps.reduce<Record<PowerUpType, number>>((acc, item) => {
            acc[item.type] = item.count
            return acc
        }, { ...DEFAULT_POWER_UP_COUNTS })
        localStorage.setItem(powerUpsStorageKey, JSON.stringify(counts))
    }, [powerUps, powerUpsStorageKey])

    useEffect(() => {
        if (showFeedback) {
            if (feedbackPauseStartMsRef.current === null) {
                feedbackPauseStartMsRef.current = Date.now()
            }
            return
        }

        if (feedbackPauseStartMsRef.current !== null) {
            feedbackPauseMsRef.current += Math.max(0, Date.now() - feedbackPauseStartMsRef.current)
            feedbackPauseStartMsRef.current = null
        }
    }, [showFeedback])

    // Track time per question
    useEffect(() => {
        setQuestionStartTime(Date.now())
        setEliminatedOptions(new Set())
    }, [currentQuestionIndex])

    const buildInitialQuestionStates = useCallback((quizData: LearningQuiz | null) => {
        const initialStates: Record<string, QuestionState> = {}
        quizData?.questions?.forEach(q => {
            initialStates[q.question_id] = {
                status: 'unanswered',
                timeSpentSeconds: 0,
                powerUpsUsed: []
            }
        })
        return initialStates
    }, [])

    const resolveAttemptCountFromMetadata = useCallback((metadataValue: unknown) => {
        const metadata = (
            metadataValue &&
            typeof metadataValue === 'object' &&
            !Array.isArray(metadataValue)
        ) ? metadataValue as Record<string, unknown> : null

        progressMetadataRef.current = metadata

        const attemptsByContext = (
            metadata?.quiz_attempts_by_context &&
            typeof metadata.quiz_attempts_by_context === 'object' &&
            !Array.isArray(metadata.quiz_attempts_by_context)
        ) ? metadata.quiz_attempts_by_context as Record<string, unknown> : null

        const contextAttemptsRaw = attemptsByContext?.[attemptContextKey]
        const fallbackAttemptsRaw = metadata?.quiz_attempt_count
        const recordedAttempts = Number(
            typeof contextAttemptsRaw === 'number' ? contextAttemptsRaw : (fallbackAttemptsRaw || 0)
        )

        return Number.isFinite(recordedAttempts) ? recordedAttempts : 0
    }, [attemptContextKey])

    const applyAttemptProgress = useCallback((metadataValue: unknown, maxAttempts?: number | null) => {
        const safeAttempts = resolveAttemptCountFromMetadata(metadataValue)
        setAttemptCount(safeAttempts)
        setAttemptLimitReached(Boolean(maxAttempts && safeAttempts >= maxAttempts))
        return safeAttempts
    }, [resolveAttemptCountFromMetadata])

    const resetQuizSession = useCallback((quizData: LearningQuiz | null) => {
        setAnswers({})
        setCurrentQuestionIndex(0)
        setSubmitted(false)
        setResult(null)
        setQuestionStates(buildInitialQuestionStates(quizData))
        setStreak(0)
        setMaxStreak(0)
        setShowFeedback(false)
        setCurrentFeedback(null)
        setEliminatedOptions(new Set())
        setHintRevealed(new Set())
        setPowerUpsUsed([])
        setTimeFrozen(false)
        setQuestionStartTime(Date.now())
        feedbackPauseMsRef.current = 0
        feedbackPauseStartMsRef.current = null
    }, [buildInitialQuestionStates])

    const loadQuiz = useCallback(async (id: string) => {
        try {
            setLoading(true)
            setLoadError(null)
            const data = await learningService.getQuiz(id)
            setQuiz(data)

            if (data.time_limit_minutes) {
                setTimeLeft(data.time_limit_minutes * 60)
            }

            if (user?.id) {
                const { data: progressData } = await supabase
                    .from('training_progress')
                    .select('metadata')
                    .eq('user_id', user.id)
                    .eq('lp_content_type', 'quiz')
                    .eq('training_id', id)
                    .maybeSingle()

                applyAttemptProgress(progressData?.metadata, data.max_attempts)
            } else {
                progressMetadataRef.current = null
                setAttemptCount(0)
                setAttemptLimitReached(false)
            }

            setQuestionStates(buildInitialQuestionStates(data))
        } catch (_error) {
            setQuiz(null)
            setLoadError(i18n.t('training:quizzes.player.load_error'))
            toastRef.current({
                title: i18n.t('common.error'),
                description: i18n.t('training:quizzes.player.load_error'),
                variant: 'destructive',
            })
            onExitRef.current?.()
        } finally {
            setLoading(false)
        }
    }, [applyAttemptProgress, buildInitialQuestionStates, i18n, user?.id])

    // Load quiz
    useEffect(() => {
        if (initialQuiz) {
            setQuiz(initialQuiz)
            setLoadError(null)
            setLoading(false)
            if (initialQuiz.time_limit_minutes) {
                setTimeLeft(initialQuiz.time_limit_minutes * 60)
            }
            setQuestionStates(buildInitialQuestionStates(initialQuiz))
        } else if (quizId) {
            void loadQuiz(quizId)
        }
    }, [buildInitialQuestionStates, initialQuiz, loadQuiz, quizId])

    useEffect(() => {
        if (!user?.id || !quiz?.id) return

        const channel = supabase
            .channel(`quiz-progress-${user.id}-${quiz.id}-${attemptContextKey}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'training_progress', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const row = (payload.new && typeof payload.new === 'object'
                        ? payload.new
                        : null) as Partial<LearningProgress> | null

                    if (!row || row.content_type !== 'quiz' || row.content_id !== quiz.id) return

                    const nextAttempts = applyAttemptProgress(row.metadata, quiz.max_attempts)
                    if (nextAttempts < attemptCountRef.current) {
                        resetQuizSession(quiz)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [applyAttemptProgress, attemptContextKey, quiz, resetQuizSession, user?.id])

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
                return isFreeTextAnswerCorrect(selected, question.correct_answer, question.accepted_answers)
            }
            case 'true_false': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return selected.toLowerCase().trim() === (question.correct_answer || '').toLowerCase().trim()
            }
            case 'fill_blank': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return isFreeTextAnswerCorrect(selected, question.correct_answer, question.accepted_answers)
            }
            case 'ordering': {
                const selected = Array.isArray(userAnswer) ? userAnswer : []
                return isOrderingAnswerCorrect(selected, question.options)
            }
            case 'matching': {
                const selected = typeof userAnswer === 'string' ? userAnswer : ''
                return isMatchingAnswerCorrect(selected, question.options)
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

    const getAnswerDisplay = useCallback((
        question: NonNullable<NonNullable<LearningQuiz['questions']>[number]['question']>,
        userAnswer: string | string[] | undefined
    ) => {
        // Ordering answers are persisted the same way as any other array answer (either the raw
        // array, or comma-joined once results are snapshotted), so reuse the same parsing.
        const selectedValues = Array.isArray(userAnswer)
            ? userAnswer
            : (typeof userAnswer === 'string' && userAnswer.length > 0
                ? userAnswer.split(',').map(value => value.trim()).filter(Boolean)
                : [])

        if (question.question_type === 'ordering') {
            const labels = selectedValues
                .map(id => question.options?.find(option => option.id === id)?.option_text)
                .filter((value): value is string => typeof value === 'string' && value.length > 0)
            return labels.length > 0 ? labels.map((label, idx) => `${idx + 1}. ${label}`).join('  ') : '(No answer)'
        }

        if (question.question_type === 'matching') {
            const mapping = decodeMatchingAnswer(typeof userAnswer === 'string' ? userAnswer : undefined)
            const labels = (question.options || [])
                .filter(option => !!option.match_value)
                .map(option => `${option.option_text} → ${mapping[option.id] || '?'}`)
            return labels.length > 0 ? labels.join('  ') : '(No answer)'
        }

        const hasOptions =
            question.question_type === 'mcq' ||
            question.question_type === 'mcq_multi' ||
            (question.question_type === 'scenario' && (question.options?.length || 0) > 0)

        if (!hasOptions) {
            return typeof userAnswer === 'string' && userAnswer.trim().length > 0
                ? userAnswer
                : '(No answer)'
        }

        const labels = selectedValues
            .map((id) => question.options?.find(option => option.id === id)?.option_text)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)

        return labels.length > 0 ? labels.join(', ') : '(No answer)'
    }, [])

    const getCorrectAnswerDisplay = useCallback((
        question: NonNullable<NonNullable<LearningQuiz['questions']>[number]['question']>
    ) => {
        if (question.question_type === 'ordering') {
            const labels = [...(question.options || [])]
                .sort((a, b) => a.display_order - b.display_order)
                .map((option, idx) => `${idx + 1}. ${option.option_text}`)
            return labels.length > 0 ? labels.join('  ') : '(No answer)'
        }

        if (question.question_type === 'matching') {
            const labels = (question.options || [])
                .filter(option => !!option.match_value)
                .map(option => `${option.option_text} → ${option.match_value}`)
            return labels.length > 0 ? labels.join('  ') : '(No answer)'
        }

        const hasOptions =
            question.question_type === 'mcq' ||
            question.question_type === 'mcq_multi' ||
            (question.question_type === 'scenario' && (question.options?.length || 0) > 0)

        if (!hasOptions) {
            return question.correct_answer || '(No answer)'
        }

        const labels = (question.options || [])
            .filter(option => option.is_correct)
            .map(option => option.option_text)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)

        return labels.length > 0 ? labels.join(', ') : '(No answer)'
    }, [])

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

    const handleSubmit = async (_isTimeout = false) => {
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
            const reviewItems: QuizReviewItem[] = quiz.questions?.map((q) => {
                const rawAnswer = answers[q.question_id]
                const question = q.question

                return {
                    questionId: q.question_id,
                    questionText: question?.question_text || 'Question',
                    selectedAnswer: question ? getAnswerDisplay(question, rawAnswer) : '(No answer)',
                    correctAnswer: question ? getCorrectAnswerDisplay(question) : '(No answer)',
                    correct: question ? gradeQuestionAnswer(question, rawAnswer) : false,
                    explanation: question?.explanation || undefined,
                    timeSpentSeconds: questionStates[q.question_id]?.timeSpentSeconds || 0
                }
            }) || []

            const totalQuestions = quiz.questions?.length || 0
            const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
            const passed = percentage >= quiz.passing_score_percentage
            const extraPauseMs = feedbackPauseStartMsRef.current ? Math.max(0, Date.now() - feedbackPauseStartMsRef.current) : 0
            const totalTimeSpent = Math.floor(Math.max(0, (Date.now() - quizStartTime) - (feedbackPauseMsRef.current + extraPauseMs)) / 1000)

            const finalResult: QuizResult = {
                score: Math.round(percentage),
                passed,
                correctCount,
                totalQuestions,
                gradedAnswers,
                reviewItems,
                streakAchieved: maxStreak,
                timeSpentSeconds: totalTimeSpent,
                powerUpsUsed
            }

            setResult(finalResult)
            const previousMetadata = progressMetadataRef.current || {}
            const previousContextMap = (
                previousMetadata.quiz_attempts_by_context &&
                typeof previousMetadata.quiz_attempts_by_context === 'object' &&
                !Array.isArray(previousMetadata.quiz_attempts_by_context)
            )
                ? previousMetadata.quiz_attempts_by_context as Record<string, unknown>
                : {}
            const metadata = {
                ...previousMetadata,
                quiz_attempt_count: nextAttemptCount,
                quiz_attempts_by_context: {
                    ...previousContextMap,
                    [attemptContextKey]: nextAttemptCount
                },
                max_attempts: quiz.max_attempts ?? null,
                latest_quiz_result: {
                    quiz_id: quiz.id,
                    quiz_title: quiz.title,
                    score: finalResult.score,
                    passed: finalResult.passed,
                    correct_count: finalResult.correctCount,
                    total_questions: finalResult.totalQuestions,
                    completed_at: new Date().toISOString(),
                    review_items: finalResult.reviewItems
                }
            }

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
                metadata
            })
            progressMetadataRef.current = metadata
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

    useEffect(() => {
        submitRef.current = handleSubmit
    }, [handleSubmit])

    // Timer
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (timeLeft !== null && timeLeft > 0 && !submitted && !timeFrozen && !showFeedback) {
            timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
            }, 1000)
        } else if (timeLeft === 0 && !submitted) {
            toast({
                title: t('training:quizzes.player.time_up'),
                description: t('training:quizzes.player.auto_submitting'),
                variant: 'destructive'
            })
            void submitRef.current?.(true)
        }
        return () => clearInterval(timer)
    }, [showFeedback, submitted, t, timeFrozen, timeLeft, toast])

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

    const translateQuestion = useCallback(async (questionItem: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!translationTarget || !questionItem?.question) return

        setIsTranslating(true)
        try {
            const questionText = questionItem.question.question_text || ''
            const explanationText = questionItem.question.explanation || ''
            const options = questionItem.question.options || []
            const textsToTranslate = [
                questionText,
                explanationText,
                ...options.map(option => option.option_text || '')
            ]

            let translatedTexts: string[] = []

            if (textsToTranslate.length > 0) {
                const batchResult = await translateAI.mutateAsync({
                    texts: textsToTranslate,
                    target_lang: translationTarget,
                    source_lang: 'auto'
                })

                if (Array.isArray(batchResult.translated_texts)) {
                    translatedTexts = batchResult.translated_texts
                }
            }

            if (translatedTexts.length !== textsToTranslate.length) {
                translatedTexts = await Promise.all(
                    textsToTranslate.map(async (text) => {
                        if (!text) return ''
                        const result = await translateAI.mutateAsync({
                            text,
                            target_lang: translationTarget,
                            source_lang: 'auto'
                        })
                        return result.translated_text || ''
                    })
                )
            }

            const translatedQuestionText = translatedTexts[0] || ''
            const translatedExplanation = translatedTexts[1] || ''
            const translatedOptionsMap: Record<string, string> = {}

            options.forEach((option, index) => {
                translatedOptionsMap[option.id] = translatedTexts[index + 2] || ''
            })

            setTranslatedQuestions(prev => ({
                ...prev,
                [questionItem.question_id]: {
                    ...prev[questionItem.question_id],
                    [translationTarget]: {
                        text: translatedQuestionText,
                        explanation: translatedExplanation,
                        options: translatedOptionsMap
                    }
                }
            }))
        } catch (error) {
            console.error('Quiz translation failed:', error)
        } finally {
            setIsTranslating(false)
        }
    }, [translationTarget, translateAI])

    useEffect(() => {
        if (!translationTarget || !quiz || isTranslating) return

        const currentQ = quiz.questions?.[currentQuestionIndex]
        if (!currentQ) return

        const existingTranslation = translatedQuestions[currentQ.question_id]?.[translationTarget]
        if (existingTranslation?.text) return

        void translateQuestion(currentQ)
    }, [translationTarget, currentQuestionIndex, quiz, isTranslating, translatedQuestions, translateQuestion])

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

    // Stable-per-question shuffles so 'ordering'/'matching' don't hand the learner the
    // options already in the correct order/pairing.
    const orderingShuffledIds = useMemo(() => {
        if (currentQuestion?.question?.question_type !== 'ordering') return []
        const ids = (currentQuestion.question.options || []).map(o => o.id)
        return shuffleArrayStable(ids)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion?.question_id])

    const matchingShuffledValues = useMemo(() => {
        if (currentQuestion?.question?.question_type !== 'matching') return []
        const values = (currentQuestion.question.options || [])
            .map(o => o.match_value)
            .filter((v): v is string => !!v)
        return shuffleArrayStable(values)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion?.question_id])

    const feedbackOverlay = (
        <FeedbackOverlay
            showFeedback={showFeedback}
            currentFeedback={currentFeedback}
            quiz={quiz}
            currentQuestionIndex={currentQuestionIndex}
            displayExplanation={displayExplanation}
            streak={streak}
            onAdvance={advanceQuestion}
        />
    )

    let mainContent: React.ReactNode

    if (loading) {
        mainContent = (
            <div className="min-h-[60vh] flex items-center justify-center">
                <m.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-hotel-gold/20 border-t-hotel-gold rounded-full animate-spin" />
                        <Brain className="h-6 w-6 text-hotel-gold absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-slate-500 font-medium">{t('training:quizzes.player.loading')}</p>
                </m.div>
            </div>
        )
    } else if (loadError || !quiz) {
        mainContent = (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Card className="max-w-xl border-red-200 bg-red-50 shadow-sm">
                    <CardContent className="space-y-4 p-6 text-center">
                        <XCircle className="mx-auto h-10 w-10 text-red-600" />
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-red-700">
                                {t('training:quizzes.player.load_error')}
                            </h2>
                            <p className="text-sm text-red-700/80">
                                {t('quizConfigurationIssue', 'This quiz is not available to learners right now. Please contact an administrator to review the quiz configuration.')}
                            </p>
                        </div>
                        {onExit && (
                            <Button type="button" variant="outline" onClick={onExit}>
                                {t('training:quizzes.player.back_to_learning')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    } else if (!quiz.questions || quiz.questions.length === 0 || !currentQuestion || !currentQuestion.question || !displayQuestionText) {
        mainContent = (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Card className="max-w-xl border-amber-200 bg-amber-50 shadow-sm">
                    <CardContent className="space-y-4 p-6 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-amber-700">
                                {t('quizUnavailableTitle', 'Quiz unavailable')}
                            </h2>
                            <p className="text-sm text-amber-700/80">
                                {t('quizUnavailableDesc', 'This quiz contains unpublished, deleted, or incomplete questions. Ask an administrator to review the quiz before learners continue.')}
                            </p>
                        </div>
                        {onExit && (
                            <Button type="button" variant="outline" onClick={onExit}>
                                {t('training:quizzes.player.back_to_learning')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    } else if (result) {
        mainContent = (
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
    } else {
        mainContent = (
        <div className="relative isolate mx-auto max-w-4xl space-y-6 pb-10">
            {/* Header with Stats */}
            <m.div
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
                        <m.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-xl font-bold"
                        >
                            <Flame className="h-4 w-4" />
                            {streak}
                        </m.div>
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
            </m.div>

            {/* Progress Bar */}
            <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <m.div
                    className="absolute start-0 top-0 h-full bg-gradient-to-r from-hotel-gold-dark via-hotel-gold to-hotel-gold-light"
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
                            <Badge variant="secondary" className="ms-1">{powerUp.count}</Badge>
                        </Button>
                    ))}
                </div>
            )}

            {/* Question Card */}
            <AnimatePresence mode="wait">
                {currentQuestion && (
                    <m.div
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
                                    <m.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-800">{displayExplanation}</p>
                                        </div>
                                    </m.div>
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
                                                        <m.div
                                                            key={opt.id || `option-${idx}`}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className={cn(
                                                                "group flex items-center gap-4 border-2 p-4 rounded-xl transition-all cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-hotel-navy/5 border-hotel-gold shadow-md'
                                                                    : 'bg-white border-slate-100 hover:border-hotel-gold/50'
                                                            )}
                                                            onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })
                                                                }
                                                            }}
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
                                                        </m.div>
                                                    )
                                                })}
                                            </RadioGroup>
                                        ) : (
                                            <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                {t('training:quizzes.player.no_options')}
                                            </p>
                                        )
                                    )}

                                    {currentQuestion.question?.question_type === 'mcq_multi' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (
                                            <div className="grid gap-3">
                                                {currentQuestion.question.options?.map((opt, idx) => {
                                                    const selectedAnswers = Array.isArray(answers[currentQuestion.question_id]) ? answers[currentQuestion.question_id] as string[] : []
                                                    const isSelected = selectedAnswers.includes(opt.id)
                                                    const translatedOption = displayOptionText(opt.id, opt.option_text)
                                                    return (
                                                        <m.div
                                                            key={opt.id || `option-${idx}`}
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
                                                            role="checkbox"
                                                            aria-checked={isSelected}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    const next = isSelected
                                                                        ? selectedAnswers.filter(id => id !== opt.id)
                                                                        : [...selectedAnswers, opt.id]
                                                                    setAnswers({ ...answers, [currentQuestion.question_id]: Array.from(new Set(next)) })
                                                                }
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
                                                        </m.div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                {t('training:quizzes.player.no_options')}
                                            </p>
                                        )
                                    )}

                                    {currentQuestion.question?.question_type === 'true_false' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {['true', 'false'].map((option) => {
                                                const isSelected = answers[currentQuestion.question_id] === option
                                                return (
                                                    <m.button
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
                                                    </m.button>
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
                                                        <m.div
                                                            key={opt.id || `option-${idx}`}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className={cn(
                                                                "group flex items-center gap-4 border-2 p-4 rounded-xl transition-all cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-hotel-navy/5 border-hotel-gold shadow-md'
                                                                    : 'bg-white border-slate-100 hover:border-hotel-gold/50'
                                                            )}
                                                            onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })
                                                                }
                                                            }}
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
                                                        </m.div>
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

                                    {currentQuestion.question?.question_type === 'ordering' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (() => {
                                            const currentOrder = Array.isArray(answers[currentQuestion.question_id]) && (answers[currentQuestion.question_id] as string[]).length > 0
                                                ? answers[currentQuestion.question_id] as string[]
                                                : orderingShuffledIds
                                            const optionsById = new Map(currentQuestion.question.options?.map(o => [o.id, o]))

                                            const moveItem = (index: number, direction: -1 | 1) => {
                                                const next = [...currentOrder]
                                                const target = index + direction
                                                if (target < 0 || target >= next.length) return
                                                ;[next[index], next[target]] = [next[target], next[index]]
                                                setAnswers({ ...answers, [currentQuestion.question_id]: next })
                                            }

                                            return (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-500">{t('training:quizzes.player.ordering_hint', 'Arrange these in the correct order:')}</p>
                                                    {currentOrder.map((optionId, index) => {
                                                        const opt = optionsById.get(optionId)
                                                        if (!opt) return null
                                                        return (
                                                            <div
                                                                key={optionId}
                                                                className="flex items-center gap-3 border-2 border-slate-100 bg-white p-4 rounded-xl"
                                                            >
                                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hotel-navy/5 font-bold text-hotel-navy">
                                                                    {index + 1}
                                                                </span>
                                                                <span className={cn("flex-1 text-base text-slate-700", isRTL && "text-right")}>
                                                                    {displayOptionText(opt.id, opt.option_text)}
                                                                </span>
                                                                <div className="flex flex-col gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        disabled={index === 0}
                                                                        onClick={() => moveItem(index, -1)}
                                                                        aria-label="Move up"
                                                                    >
                                                                        <ArrowUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        disabled={index === currentOrder.length - 1}
                                                                        onClick={() => moveItem(index, 1)}
                                                                        aria-label="Move down"
                                                                    >
                                                                        <ArrowDown className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })() : (
                                            <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                {t('training:quizzes.player.no_options')}
                                            </p>
                                        )
                                    )}

                                    {currentQuestion.question?.question_type === 'matching' && (
                                        (currentQuestion.question.options?.length || 0) > 0 ? (() => {
                                            const mapping = decodeMatchingAnswer(
                                                typeof answers[currentQuestion.question_id] === 'string'
                                                    ? answers[currentQuestion.question_id] as string
                                                    : undefined
                                            )
                                            const setPair = (optionId: string, value: string) => {
                                                const next = { ...mapping, [optionId]: value }
                                                setAnswers({ ...answers, [currentQuestion.question_id]: encodeMatchingAnswer(next) })
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    {(currentQuestion.question.options || []).filter(o => !!o.match_value).map((opt) => (
                                                        <div
                                                            key={opt.id}
                                                            className="flex flex-col sm:flex-row sm:items-center gap-3 border-2 border-slate-100 bg-white p-4 rounded-xl"
                                                        >
                                                            <span className={cn("flex-1 text-base font-medium text-slate-700", isRTL && "text-right")}>
                                                                {displayOptionText(opt.id, opt.option_text)}
                                                            </span>
                                                            <select
                                                                className="flex-1 rounded-lg border-2 border-slate-200 bg-white p-2.5 text-sm"
                                                                value={mapping[opt.id] || ''}
                                                                onChange={(e) => setPair(opt.id, e.target.value)}
                                                            >
                                                                <option value="" disabled>
                                                                    {t('training:quizzes.player.select_match', 'Select a match...')}
                                                                </option>
                                                                {matchingShuffledValues.map((value) => (
                                                                    <option key={value} value={value}>{value}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })() : (
                                            <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                {t('training:quizzes.player.no_options')}
                                            </p>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Navigation */}
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <Button
                    variant="ghost"
                    disabled={currentQuestionIndex === 0 || showFeedback}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    <ArrowLeft className={cn("h-4 w-4 me-2", isRTL && "rotate-180")} />
                    Previous
                </Button>

                <Button
                    onClick={handleAnswerSubmit}
                    disabled={!hasAnswer(currentQuestion?.question_id) || showFeedback || attemptLimitReached}
                    className="bg-hotel-navy hover:bg-hotel-navy-dark text-white px-8 py-6 rounded-xl font-bold"
                >
                    Submit Answer
                    <CheckCircle2 className="ms-2 h-5 w-5" />
                </Button>
            </div>

            {attemptLimitReached && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {t('training:quizzes.player.limit_reached_desc', { count: quiz.max_attempts || 0 })}
                </div>
            )}

            {/* Feedback Overlay */}
            <AnimatePresence>
                {feedbackOverlay}
            </AnimatePresence>
        </div>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            {mainContent}
        </LazyMotion>
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
    t
    translatedQuestions
    translationTarget: TranslationTargetLanguage | null
    showBilingual: boolean
}

function QuizResultsScreen({
    result,
    quiz,
    onExit,
    onRetry,
    canRetry,
    t}: QuizResultsScreenProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    return (
        <m.div
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
                    <m.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
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
                    </m.div>

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
                        <m.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">{result.streakAchieved} Answer Streak!</span>
                        </m.div>
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
                            const userAnswerDisplay = typeof answer.answer === 'object' ? JSON.stringify(answer.answer) : String(answer.answer || '')
                            const correctAnswerDisplay = typeof question.correct_answer === 'object' ? JSON.stringify(question.correct_answer) : String(question.correct_answer || '')

                            return (
                                <m.div
                                    key={answer.question_id || `answer-${index}`}
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
                                </m.div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </m.div>
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

