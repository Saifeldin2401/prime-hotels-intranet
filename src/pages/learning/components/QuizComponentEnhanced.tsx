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
import { decodeMatchingAnswer, encodeMatchingAnswer } from '@/lib/questionOrderingMatching'
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

// --- Types ---

interface QuizComponentEnhancedProps {
    quizId: string
    assignmentId?: string | null
    contextType?: string
    contextEntityId?: string
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
    contextType,
    contextEntityId,
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
    // A ref (not state) so it can be reset on retry without needing a setter
    // that would otherwise be unused for the rest of the component's life.
    const quizStartTimeRef = useRef<number>(Date.now())
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
        quizStartTimeRef.current = Date.now()
        feedbackPauseMsRef.current = 0
        feedbackPauseStartMsRef.current = null
    }, [buildInitialQuestionStates])

    const loadQuiz = useCallback(async (id: string) => {
        try {
            setLoading(true)
            setLoadError(null)
            // Fetch via server RPC — questions arrive WITHOUT answer keys
            // (is_correct, correct_answer, explanation are stripped).
            const data = await learningService.getQuizForPlayerRPC(id)
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

    const handleAnswerSubmit = async () => {
        const currentQuestion = quiz?.questions?.[currentQuestionIndex]
        if (!currentQuestion) return
        if (attemptLimitReached) return

        const timeSpent = getCurrentQuestionTime()
        const rawAnswer = answers[currentQuestion.question_id]
        const wantsFeedback = enableImmediateFeedback && (quiz?.show_feedback_during ?? true)

        // Grade via server RPC — the only path that has access to the answer key.
        let isCorrect = false
        if (wantsFeedback) {
            try {
                const selectedAnswer = typeof rawAnswer === 'string' ? rawAnswer : undefined
                const selectedOptions = Array.isArray(rawAnswer) ? rawAnswer : undefined
                const result = await supabase.rpc('grade_question_attempt', {
                    p_question_id: currentQuestion.question_id,
                    p_selected_answer: selectedAnswer || null,
                    p_selected_options: selectedOptions || null,
                    p_session_id: null,
                    p_context_type: 'learning_quiz',
                    p_context_entity_id: quiz?.id || null,
                    p_time_spent_seconds: timeSpent,
                    p_hint_used: hintRevealed.has(currentQuestion.question_id),
                })
                if (!result.error && result.data) {
                    isCorrect = (result.data as { is_correct: boolean }).is_correct
                }
            } catch {
                // If the per-question RPC fails, fall through — the final submit
                // is the authoritative grading path and will still work.
            }
        }

        // Update question state
        setQuestionStates(prev => ({
            ...prev,
            [currentQuestion.question_id]: {
                status: wantsFeedback ? (isCorrect ? 'correct' : 'incorrect') : 'unanswered',
                timeSpentSeconds: timeSpent,
                powerUpsUsed: [...(prev[currentQuestion.question_id]?.powerUpsUsed || []), ...powerUpsUsed]
            }
        }))

        // Update streak
        if (wantsFeedback) {
            if (isCorrect) {
                const newStreak = streak + 1
                setStreak(newStreak)
                if (newStreak > maxStreak) {
                    setMaxStreak(newStreak)
                }
            } else {
                setStreak(0)
            }
        }

        // Show feedback or advance
        if (wantsFeedback) {
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

            const extraPauseMs = feedbackPauseStartMsRef.current ? Math.max(0, Date.now() - feedbackPauseStartMsRef.current) : 0
            const totalTimeSpent = Math.floor(Math.max(0, (Date.now() - quizStartTimeRef.current) - (feedbackPauseMsRef.current + extraPauseMs)) / 1000)

            // Build answers payload for the server RPC
            const answersPayload = (quiz.questions || []).map(q => {
                const rawAnswer = answers[q.question_id]
                return {
                    question_id: q.question_id,
                    selected_answer: typeof rawAnswer === 'string' ? rawAnswer : undefined,
                    selected_options: Array.isArray(rawAnswer) ? rawAnswer : undefined,
                    time_spent_seconds: questionStates[q.question_id]?.timeSpentSeconds || 0,
                    hint_used: hintRevealed.has(q.question_id),
                }
            })

            // Submit for server-side grading — the server reads the answer key,
            // grades every answer, writes unified_quiz_sessions + attempts,
            // and updates training_progress via the trusted RPC path.
            const serverResult = await learningService.submitQuizAttemptRPC(
                quiz.id,
                answersPayload,
                {
                    contextType: contextType || 'quiz',
                    contextEntityId: contextEntityId || quiz.id,
                    assignmentId: assignmentId || undefined,
                    timeSpentSeconds: totalTimeSpent,
                }
            )

            // Map server results into the UI's existing QuizResult shape
            const resultsByQuestion = new Map(
                (serverResult.results || []).map(r => [r.question_id, r.is_correct])
            )

            const gradedAnswers: GradedAnswer[] = (quiz.questions || []).map(q => {
                const rawAnswer = answers[q.question_id]
                const userAnswer = Array.isArray(rawAnswer) ? rawAnswer.join(',') : (rawAnswer || '')
                return {
                    question_id: q.question_id,
                    answer: userAnswer,
                    correct: resultsByQuestion.get(q.question_id) ?? false,
                    timeSpentSeconds: questionStates[q.question_id]?.timeSpentSeconds || 0,
                }
            })

            const reviewItems: QuizReviewItem[] = (quiz.questions || []).map(q => {
                const rawAnswer = answers[q.question_id]
                const question = q.question
                const isCorrect = resultsByQuestion.get(q.question_id) ?? false
                return {
                    questionId: q.question_id,
                    questionText: question?.question_text || 'Question',
                    selectedAnswer: question ? getAnswerDisplay(question, rawAnswer) : '(No answer)',
                    // Server doesn't leak correct answers until after submission;
                    // the review screen shows just the user's answer + correct/incorrect.
                    correctAnswer: '—',
                    correct: isCorrect,
                    explanation: undefined,
                    timeSpentSeconds: questionStates[q.question_id]?.timeSpentSeconds || 0,
                }
            })

            const finalResult: QuizResult = {
                score: serverResult.score_percentage,
                passed: serverResult.passed,
                correctCount: serverResult.correct_count,
                totalQuestions: serverResult.total_questions,
                gradedAnswers,
                reviewItems,
                streakAchieved: maxStreak,
                timeSpentSeconds: totalTimeSpent,
                powerUpsUsed,
            }

            setResult(finalResult)
            setAttemptCount(serverResult.attempt_number)
            if (quiz.max_attempts && !serverResult.passed && serverResult.attempt_number >= quiz.max_attempts) {
                setAttemptLimitReached(true)
            }

            // Certificate generation
            if (serverResult.passed && certificateEnabled) {
                try {
                    const primaryProperty = properties?.[0]
                    const primaryDepartment = departments?.[0]
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Quiz Participant',
                        recipientEmail: user.email,
                        certificateType: 'sop_quiz',
                        title: quiz.title,
                        description: `Successfully completed ${quiz.title} with a score of ${serverResult.score_percentage}%.`,
                        completionDate: new Date(),
                        score: serverResult.score_percentage,
                        passingScore: quiz.passing_score_percentage,
                        propertyId: primaryProperty?.id,
                        propertyName: primaryProperty?.name,
                        departmentId: primaryDepartment?.id,
                        departmentName: primaryDepartment?.name,
                    }
                    await createCertificate(certificateData)

                    toast({
                        title: t('training:quizzes.player.certificate_earned'),
                        description: t('training:quizzes.player.certificate_desc', { title: quiz.title }),
                        variant: 'default',
                    })
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                }
            }

            toast({
                title: serverResult.passed
                    ? t('training:quizzes.player.passed_toast_title')
                    : t('training:quizzes.player.failed_toast_title'),
                description: t('training:quizzes.player.score_toast_desc', { score: serverResult.score_percentage }),
                variant: serverResult.passed ? 'default' : 'destructive',
            })

            if (onComplete) {
                onComplete(finalResult)
            }

        } catch (error) {
            console.error(error)
            toast({
                title: t('common.error'),
                description: t('training:quizzes.player.submit_error'),
                variant: 'destructive',
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
    const activatePowerUp = async (type: PowerUpType) => {
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
                    // The client never has answer-key data (getQuizForPlayerRPC masks
                    // is_correct on every option), so eliminations must come from a
                    // server RPC that reads the real answer key without leaking it.
                    try {
                        const { data, error } = await supabase.rpc('get_fifty_fifty_eliminations', {
                            p_question_id: currentQuestion.question_id,
                        })
                        if (error) throw error
                        const toEliminate = Array.isArray(data) ? (data as string[]) : []
                        if (toEliminate.length > 0) {
                            setEliminatedOptions(new Set(toEliminate))
                        }
                    } catch {
                        toast({
                            title: t('common.error'),
                            description: t('training:quizzes.player.powerup_error', 'Could not activate power-up. Please try again.'),
                            variant: 'destructive',
                        })
                    }
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

    // learningService has already applied the persisted answer-order rule. Reuse that
    // order for every question type, including ordering and matching, rather than
    // introducing a second unpersisted shuffle in the player.
    const orderingShuffledIds = useMemo(() => {
        if (currentQuestion?.question?.question_type !== 'ordering') return []
        return (currentQuestion.question.options || []).map(o => o.id)
    }, [currentQuestion])

    const matchingShuffledValues = useMemo(() => {
        if (currentQuestion?.question?.question_type !== 'matching') return []
        const values = (currentQuestion.question.options || [])
            .map(o => o.match_value)
            .filter((v): v is string => !!v)
        return values
    }, [currentQuestion])

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
                    // Resets answers/streak/questionStates/feedback pauses AND
                    // quizStartTimeRef — without this, a retry's "time spent"
                    // would accumulate every prior attempt's duration plus all
                    // idle time spent on the results screen in between.
                    resetQuizSession(quiz)
                    void loadQuiz(quiz.id)
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

                    {/* Luxury Countdown Timer Badge */}
                    {timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-xs sm:text-sm shadow-sm transition-all",
                            timeLeft < 60
                                ? 'border-destructive/40 text-destructive bg-destructive/10 animate-pulse'
                                : 'border-amber-500/30 text-foreground bg-card',
                            timeFrozen && "border-blue-500/40 text-blue-600 bg-blue-500/10"
                        )}>
                            <Clock className={cn("h-4 w-4", timeLeft < 60 ? "text-destructive" : "text-amber-500")} />
                            <span>{formatTime(timeLeft)}</span>
                            {timeFrozen && <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-400 text-blue-600">FROZEN</Badge>}
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

            {/* Smooth Question Step Indicators */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
                    <span>
                        Question <strong className="text-foreground">{currentQuestionIndex + 1}</strong> of {quiz.questions?.length || 1}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                        {Math.round(((currentQuestionIndex + 1) / (quiz.questions?.length || 1)) * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar">
                    {quiz.questions?.map((q, idx) => {
                        const isCurrent = idx === currentQuestionIndex
                        const isAnswered = hasAnswer(q.question_id)

                        return (
                            <button
                                key={q.question_id || idx}
                                type="button"
                                onClick={() => {
                                    if (!showFeedback) setCurrentQuestionIndex(idx)
                                }}
                                disabled={showFeedback}
                                className={cn(
                                    "flex-1 min-w-[20px] max-w-[40px] h-2 rounded-full transition-all duration-300 relative",
                                    isCurrent
                                        ? "h-2.5 bg-amber-500 shadow-sm shadow-amber-500/40"
                                        : isAnswered
                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                            : "bg-muted hover:bg-muted-foreground/30"
                                )}
                                title={`Question ${idx + 1}`}
                            />
                        )
                    })}
                </div>
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
                                                                "group flex items-center gap-4 border-2 p-4 rounded-2xl transition-all duration-200 cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-amber-500/[0.06] border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                                                    : 'bg-card border-border/60 hover:border-amber-500/40 hover:bg-muted/30'
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
                                                                "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                isSelected ? "border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-sm" : "border-muted-foreground/30 bg-transparent"
                                                            )}>
                                                                {isSelected ? (
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                ) : (
                                                                    <div className="h-2 w-2 rounded-full bg-transparent group-hover:bg-muted-foreground/20" />
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-sm sm:text-base font-sans transition-colors",
                                                                isSelected ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground",
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
                                                                "group flex items-center gap-4 border-2 p-4 rounded-2xl transition-all duration-200 cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-amber-500/[0.06] border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                                                    : 'bg-card border-border/60 hover:border-amber-500/40 hover:bg-muted/30'
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
                                                            <div className={cn(
                                                                "h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                                                isSelected ? "border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-sm" : "border-muted-foreground/30 bg-transparent"
                                                            )}>
                                                                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-sm sm:text-base font-sans transition-colors",
                                                                isSelected ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground",
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
                                                            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 cursor-pointer shadow-sm",
                                                            isSelected
                                                                ? 'bg-amber-500/[0.08] border-amber-500 ring-2 ring-amber-500/20 text-foreground font-bold'
                                                                : 'bg-card border-border/60 text-muted-foreground hover:border-amber-500/40 hover:bg-muted/30'
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all",
                                                            isSelected
                                                                ? "border-amber-500 bg-amber-500 text-slate-950 shadow-md"
                                                                : "border-border bg-background"
                                                        )}>
                                                            {option === 'true' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                                        </div>
                                                        <span className="text-base font-bold uppercase tracking-wider font-mono">
                                                            {option === 'true' ? (isRTL ? 'صحيح' : 'True') : (isRTL ? 'خطأ' : 'False')}
                                                        </span>
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
                                                                "group flex items-center gap-4 border-2 p-4 rounded-2xl transition-all duration-200 cursor-pointer",
                                                                isSelected
                                                                    ? 'bg-amber-500/[0.06] border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                                                    : 'bg-card border-border/60 hover:border-amber-500/40 hover:bg-muted/30'
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
                                                                "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                isSelected ? "border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-sm" : "border-muted-foreground/30 bg-transparent"
                                                            )}>
                                                                {isSelected ? (
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                ) : (
                                                                    <div className="h-2 w-2 rounded-full bg-transparent group-hover:bg-muted-foreground/20" />
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "flex-1 text-sm sm:text-base font-sans transition-colors",
                                                                isSelected ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground",
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
                "text-center p-8 sm:p-10 border-2 rounded-3xl shadow-2xl overflow-hidden relative backdrop-blur-xl",
                result.passed
                    ? "border-emerald-500/40 bg-gradient-to-br from-card via-card/95 to-emerald-500/[0.06]"
                    : "border-destructive/40 bg-gradient-to-br from-card via-card/95 to-destructive/[0.06]"
            )}>
                {/* Decorative top accent bar */}
                <div className={cn(
                    "absolute top-0 start-0 end-0 h-1.5",
                    result.passed
                        ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-600"
                        : "bg-gradient-to-r from-destructive via-orange-500 to-destructive"
                )} />

                <CardContent className="space-y-6 pt-2">
                    {/* Status Icon */}
                    <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className={cn(
                            "w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-inner border-2",
                            result.passed
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/15 border-destructive/30 text-destructive"
                        )}>
                        {result.passed ? (
                            <Award className="h-12 w-12" />
                        ) : (
                            <XCircle className="h-12 w-12" />
                        )}
                    </m.div>

                    {/* Score Title & Feedback */}
                    <div className="space-y-2">
                        <Badge variant="outline" className={cn(
                            "text-xs px-3 py-1 font-semibold uppercase tracking-wider",
                            result.passed
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 border-destructive/30 text-destructive"
                        )}>
                            {result.passed ? 'Assessment Passed' : 'Assessment Incomplete'}
                        </Badge>

                        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                            {result.passed ? 'Hospitality Standard Achieved' : 'Review & Practice Recommended'}
                        </h2>

                        <div className="flex items-center justify-center gap-2 pt-2">
                            <span className="font-mono text-4xl sm:text-5xl font-bold text-foreground">
                                {result.score}%
                            </span>
                            <span className="text-sm text-muted-foreground font-mono self-end pb-1">
                                ({result.correctCount}/{result.totalQuestions} correct)
                            </span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <StatCard
                            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                            value={result.correctCount}
                            label="Correct"
                            color="emerald"
                        />
                        <StatCard
                            icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                            value={`${result.score}%`}
                            label="Final Score"
                            color="amber"
                        />
                        <StatCard
                            icon={<Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                            value={result.streakAchieved}
                            label="Best Streak"
                            color="orange"
                        />
                        <StatCard
                            icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                            value={formatTime(result.timeSpentSeconds)}
                            label={t("common:time", "Time")}
                            color="blue"
                        />
                    </div>

                    {/* Achievements & Streak pill */}
                    {result.streakAchieved >= 3 && (
                        <m.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-full text-xs font-bold"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>{result.streakAchieved} Consecutive Answers Streak!</span>
                        </m.div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-border/40">
                        {onExit && (
                            <Button
                                onClick={onExit}
                                variant="outline"
                                className="px-6 h-11 rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted/60"
                            >
                                Back to Learning Dashboard
                            </Button>
                        )}
                        {!result.passed && canRetry && (
                            <Button
                                onClick={onRetry}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 h-11 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95"
                            >
                                Retry Assessment
                            </Button>
                        )}
                        {result.passed && (
                            <Button
                                onClick={() => {
                                    if (onExit) onExit()
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-11 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 gap-2"
                            >
                                <Award className="h-4 w-4" />
                                Claim & View Credential
                            </Button>
                        )}
                        {!result.passed && !canRetry && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
                                Maximum attempt limit reached
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Review Answers Card */}
            <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                        <h3 className="font-display font-bold text-lg text-foreground">
                            Question Breakdown & Official Rationale
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground">
                            {result.reviewItems?.length || 0} questions reviewed
                        </span>
                    </div>

                    <div className="space-y-3">
                        {result.reviewItems?.map((item, index) => (
                            <m.div
                                key={item.questionId || `answer-${index}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-2",
                                    item.correct
                                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                                        : "bg-destructive/[0.04] border-destructive/20"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5",
                                        item.correct
                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                            : "bg-destructive/20 text-destructive"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        <p className="font-semibold text-sm text-foreground">{item.questionText}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
                                            <span className={cn(
                                                "font-medium",
                                                item.correct ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                            )}>
                                                Your response: <strong>{item.selectedAnswer}</strong>
                                            </span>
                                            {!item.correct && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                    Correct answer: <strong>{item.correctAnswer}</strong>
                                                </span>
                                            )}
                                        </div>
                                        {item.explanation && (
                                            <div className="text-xs text-muted-foreground p-3 rounded-xl bg-background/60 border border-border/40 font-sans mt-2">
                                                <span className="font-semibold text-foreground block mb-0.5">SOP Guideline & Rationale:</span>
                                                {item.explanation}
                                            </div>
                                        )}
                                    </div>
                                    {item.correct ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                    )}
                                </div>
                            </m.div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </m.div>
    )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode, value: string | number, label: string, color: string }) {
    const colorClasses: Record<string, string> = {
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
    }

    return (
        <div className={cn("p-3.5 sm:p-4 rounded-2xl border text-center transition-all", colorClasses[color] || colorClasses.amber)}>
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
        </div>
    )
}

