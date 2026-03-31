/**
 * MobileQuizPlayer Component
 * 
 * A mobile-optimized quiz interface with:
 * - Swipe between questions
 * - Card-based layout
 * - Progress indicator
 * - Immediate feedback
 * - Review mode
 * - Haptic feedback
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Trophy, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface QuizQuestion {
    id: string
    text: string
    options: {
        id: string
        text: string
        isCorrect?: boolean
    }[]
    explanation?: string
    timeLimit?: number // in seconds
}

interface Quiz {
    id: string
    title: string
    description?: string
    passingScore: number
    randomizeQuestions: boolean
    showFeedbackDuring: boolean
    questions: QuizQuestion[]
}

interface QuizResult {
    score: number
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
    answers: Record<string, string>
}

interface MobileQuizPlayerProps {
    quiz: Quiz
    onComplete: (result: QuizResult) => void
    onExit: () => void
    assignmentId?: string
}

type QuizState = 'intro' | 'playing' | 'feedback' | 'review' | 'completed'

/**
 * MobileQuizPlayer - Touch-optimized quiz interface
 */
export function MobileQuizPlayer({ quiz, onComplete, onExit }: MobileQuizPlayerProps) {
    const [state, setState] = useState<QuizState>('intro')
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [showExplanation, setShowExplanation] = useState(false)
    const [timeSpent, setTimeSpent] = useState(0)
    const [questionStartTime, setQuestionStartTime] = useState(Date.now())
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left')

    // Shuffle questions if needed
    const questions = useMemo(() => {
        if (!quiz.randomizeQuestions) return quiz.questions
        return [...quiz.questions].sort(() => Math.random() - 0.5)
    }, [quiz.questions, quiz.randomizeQuestions])

    const currentQuestion = questions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === questions.length - 1
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    // Timer
    useEffect(() => {
        if (state !== 'playing') return

        const interval = setInterval(() => {
            setTimeSpent(prev => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [state])

    // Question timer
    useEffect(() => {
        setQuestionStartTime(Date.now())
        setSelectedOption(null)
        setShowExplanation(false)
    }, [currentQuestionIndex])

    const handleAnswer = useCallback((optionId: string) => {
        if (selectedOption) return // Already answered

        setSelectedOption(optionId)
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }))

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10)
        }

        if (quiz.showFeedbackDuring) {
            setShowExplanation(true)
            setState('feedback')
        } else {
            // Auto advance after short delay
            setTimeout(() => {
                if (isLastQuestion) {
                    handleComplete()
                } else {
                    handleNext()
                }
            }, 500)
        }
    }, [currentQuestion.id, isLastQuestion, quiz.showFeedbackDuring])

    const handleNext = useCallback(() => {
        if (isLastQuestion) {
            handleComplete()
            return
        }

        setSwipeDirection('left')
        setCurrentQuestionIndex(prev => prev + 1)
        setState('playing')

        if (navigator.vibrate) {
            navigator.vibrate(5)
        }
    }, [isLastQuestion])

    const handlePrevious = useCallback(() => {
        if (currentQuestionIndex === 0) return

        setSwipeDirection('right')
        setCurrentQuestionIndex(prev => prev - 1)
        setState('playing')
    }, [currentQuestionIndex])

    const handleComplete = useCallback(() => {
        const correctAnswers = questions.filter(q => {
            const userAnswer = answers[q.id]
            const correctOption = q.options.find(o => o.isCorrect)
            return userAnswer === correctOption?.id
        }).length

        const score = Math.round((correctAnswers / questions.length) * 100)
        const passed = score >= quiz.passingScore

        const result: QuizResult = {
            score,
            correctAnswers,
            totalQuestions: questions.length,
            timeSpent,
            answers
        }

        setState('completed')
        onComplete(result)
    }, [questions, answers, quiz.passingScore, timeSpent, onComplete])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Intro Screen
    if (state === 'intro') {
        return (
            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="p-6 text-center space-y-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Trophy className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-2">{quiz.title}</h2>
                            {quiz.description && (
                                <p className="text-muted-foreground text-sm">{quiz.description}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="font-semibold">{questions.length}</div>
                                <div className="text-muted-foreground">Questions</div>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="font-semibold">{quiz.passingScore}%</div>
                                <div className="text-muted-foreground">Passing Score</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Button 
                                className="w-full touch-target-lg" 
                                onClick={() => setState('playing')}
                            >
                                Start Quiz
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full touch-target-lg"
                                onClick={onExit}
                            >
                                Exit
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Completion Screen
    if (state === 'completed') {
        const correctAnswers = questions.filter(q => {
            const userAnswer = answers[q.id]
            const correctOption = q.options.find(o => o.isCorrect)
            return userAnswer === correctOption?.id
        }).length
        const score = Math.round((correctAnswers / questions.length) * 100)
        const passed = score >= quiz.passingScore

        return (
            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="p-6 text-center space-y-6">
                        <div className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center mx-auto',
                            passed ? 'bg-green-100' : 'bg-amber-100'
                        )}>
                            {passed ? (
                                <Trophy className="h-10 w-10 text-green-600" />
                            ) : (
                                <AlertCircle className="h-10 w-10 text-amber-600" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">
                                {passed ? 'Congratulations!' : 'Almost There!'}
                            </h2>
                            <p className="text-muted-foreground">
                                {passed 
                                    ? 'You passed the quiz!' 
                                    : `You need ${quiz.passingScore}% to pass. Try again!`}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="text-xl font-bold">{score}%</div>
                                <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="text-xl font-bold">{correctAnswers}</div>
                                <div className="text-xs text-muted-foreground">Correct</div>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="text-xl font-bold">{formatTime(timeSpent)}</div>
                                <div className="text-xs text-muted-foreground">Time</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Button 
                                className="w-full touch-target-lg"
                                onClick={onExit}
                            >
                                Continue
                            </Button>
                            {!passed && (
                                <Button 
                                    variant="outline" 
                                    className="w-full touch-target-lg"
                                    onClick={() => {
                                        setState('playing')
                                        setCurrentQuestionIndex(0)
                                        setAnswers({})
                                        setTimeSpent(0)
                                    }}
                                >
                                    Retry Quiz
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const isCorrect = selectedOption && currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect

    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 px-4 py-3 border-b">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatTime(timeSpent)}
                    </div>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Question */}
            <div className="flex-1 p-4">
                <AnimatePresence mode="wait" initial={false}>
                    <m.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: swipeDirection === 'left' ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: swipeDirection === 'left' ? -50 : 50 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-xl mx-auto"
                    >
                        {/* Question Text */}
                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <h3 className="text-lg font-medium leading-relaxed">
                                    {currentQuestion.text}
                                </h3>
                            </CardContent>
                        </Card>

                        {/* Options */}
                        <div className="space-y-2">
                            {currentQuestion.options.map((option) => {
                                const isSelected = selectedOption === option.id
                                const showResult = state === 'feedback' || state === 'review'
                                const isOptionCorrect = option.isCorrect

                                return (
                                    <button
                                        key={option.id}
                                        disabled={!!selectedOption}
                                        onClick={() => handleAnswer(option.id)}
                                        className={cn(
                                            'w-full p-4 rounded-xl text-left border-2 transition-all',
                                            'touch-target-lg',
                                            showResult && isOptionCorrect
                                                ? 'border-green-500 bg-green-50'
                                                : showResult && isSelected && !isOptionCorrect
                                                    ? 'border-red-500 bg-red-50'
                                                    : isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                                                showResult && isOptionCorrect
                                                    ? 'border-green-500 bg-green-500'
                                                    : showResult && isSelected && !isOptionCorrect
                                                        ? 'border-red-500 bg-red-500'
                                                        : isSelected
                                                            ? 'border-primary'
                                                            : 'border-muted-foreground'
                                            )}>
                                                {showResult && isOptionCorrect && (
                                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                                )}
                                                {showResult && isSelected && !isOptionCorrect && (
                                                    <XCircle className="h-4 w-4 text-white" />
                                                )}
                                                {!showResult && isSelected && (
                                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <span className="flex-1">{option.text}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Explanation */}
                        {showExplanation && currentQuestion.explanation && (
                            <m.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200"
                            >
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-blue-900 mb-1">
                                            {isCorrect ? 'Correct!' : 'Not quite right'}
                                        </p>
                                        <p className="text-sm text-blue-800">
                                            {currentQuestion.explanation}
                                        </p>
                                    </div>
                                </div>
                            </m.div>
                        )}
                    </m.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="sticky bottom-0 bg-background border-t p-4">
                <div className="flex items-center gap-3 max-w-xl mx-auto">
                    <Button
                        variant="outline"
                        className="touch-target-lg"
                        disabled={currentQuestionIndex === 0}
                        onClick={handlePrevious}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    {state === 'feedback' ? (
                        <Button
                            className="flex-1 touch-target-lg"
                            onClick={isLastQuestion ? handleComplete : handleNext}
                        >
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                            <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                    ) : (
                        <div className="flex-1 text-center text-sm text-muted-foreground">
                            Select an answer to continue
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
