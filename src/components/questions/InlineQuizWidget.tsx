/**
 * InlineQuizWidget
 * 
 * Compact quiz widget for embedding in KnowledgeViewer.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Brain,
    CheckCircle,
    ChevronRight,
    Sparkles,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuestionsForContext, useRecordAttempt } from '@/hooks/useQuestions'
import { QuestionRenderer } from './QuestionRenderer'
import type { KnowledgeQuestion } from '@/types/questions'

interface InlineQuizWidgetProps {
    sopId: string
    sectionId?: string
    maxQuestions?: number
    className?: string
    title?: string
    showOnComplete?: 'summary' | 'reset' | 'hide'
}

export function InlineQuizWidget({
    sopId,
    sectionId,
    maxQuestions = 3,
    className,
    title = 'Quick Knowledge Check',
    showOnComplete = 'summary'
}: InlineQuizWidgetProps) {
    const { data: questions, isLoading } = useQuestionsForContext('sop_inline', sopId)
    const recordAttempt = useRecordAttempt()

    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, { answer: string | string[]; isCorrect: boolean }>>({})
    const [isStarted, setIsStarted] = useState(false)
    const [hintUsed, setHintUsed] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)

    // Limit questions
    const displayQuestions = questions?.slice(0, maxQuestions) || []
    const currentQuestion = displayQuestions[currentIndex]
    const isComplete = currentIndex >= displayQuestions.length && Object.keys(answers).length > 0
    const correctCount = Object.values(answers).filter(a => a.isCorrect).length
    const totalCount = Object.keys(answers).length

    if (isLoading) {
        return (
            <Card className={cn('border-dashed', className)}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!displayQuestions.length) {
        return null // Don't show widget if no questions
    }

    const handleStart = () => {
        setIsStarted(true)
        setStartTime(Date.now())
    }

    const handleAnswer = async (answer: string | string[]) => {
        if (!currentQuestion) return

        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0

        try {
            const result = await recordAttempt.mutateAsync({
                question_id: currentQuestion.id,
                selected_answer: typeof answer === 'string' ? answer : undefined,
                selected_options: Array.isArray(answer) ? answer : undefined,
                time_spent_seconds: timeSpent,
                hint_used: hintUsed,
                context_type: 'sop_inline',
                context_entity_id: sopId
            })

            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: { answer, isCorrect: result.isCorrect }
            }))
        } catch (error) {
            console.error('Failed to record attempt:', error)
        }
    }

    const handleNext = () => {
        setCurrentIndex(prev => prev + 1)
        setHintUsed(false)
        setStartTime(Date.now())
    }

    const handleReset = () => {
        setCurrentIndex(0)
        setAnswers({})
        setIsStarted(false)
        setHintUsed(false)
        setStartTime(null)
    }

    // Start screen
    if (!isStarted) {
        return (
            <Card className={cn('border-blue-200 bg-blue-50/50', className)}>
                <CardContent className="pt-6 text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-3">
                        <Brain className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Test your understanding with {displayQuestions.length} quick question{displayQuestions.length > 1 ? 's' : ''}
                    </p>
                    <Button onClick={handleStart} size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Start Quiz
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Completion screen
    if (isComplete) {
        const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
        const isPassing = percentage >= 70

        if (showOnComplete === 'hide') return null

        return (
            <Card className={cn(
                'border-2',
                isPassing ? 'border-green-300 bg-green-50/50' : 'border-yellow-300 bg-yellow-50/50',
                className
            )}>
                <CardContent className="pt-6 text-center">
                    <div className={cn(
                        'inline-flex items-center justify-center h-14 w-14 rounded-full mb-3',
                        isPassing ? 'bg-green-100' : 'bg-yellow-100'
                    )}>
                        {isPassing ? (
                            <Trophy className="h-7 w-7 text-green-600" />
                        ) : (
                            <Brain className="h-7 w-7 text-yellow-600" />
                        )}
                    </div>

                    <h3 className={cn(
                        'font-semibold mb-1',
                        isPassing ? 'text-green-800' : 'text-yellow-800'
                    )}>
                        {isPassing ? 'Great Job!' : 'Keep Learning!'}
                    </h3>

                    <p className="text-2xl font-bold mb-2">
                        {correctCount} / {totalCount}
                    </p>

                    <Progress
                        value={percentage}
                        className={cn(
                            'h-2 mb-4',
                            isPassing ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'
                        )}
                    />

                    <p className="text-sm text-gray-600 mb-4">
                        You scored {percentage}%
                    </p>

                    {showOnComplete === 'reset' && (
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Try Again
                        </Button>
                    )}
                </CardContent>
            </Card>
        )
    }

    // Question screen
    return (
        <Card className={cn('border-blue-200', className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        {title}
                    </CardTitle>
                    <Badge variant="secondary">
                        {currentIndex + 1} / {displayQuestions.length}
                    </Badge>
                </div>
                <Progress
                    value={((currentIndex + 1) / displayQuestions.length) * 100}
                    className="h-1 mt-2"
                />
            </CardHeader>
            <CardContent className="pt-3">
                {currentQuestion && (
                    <QuestionRenderer
                        question={currentQuestion}
                        onAnswer={handleAnswer}
                        onNext={handleNext}
                        onHintUsed={() => setHintUsed(true)}
                        previousAnswer={answers[currentQuestion.id]?.answer}
                        isCorrect={answers[currentQuestion.id]?.isCorrect}
                        showFeedback
                        showHint
                        compact
                    />
                )}
            </CardContent>
        </Card>
    )
}
