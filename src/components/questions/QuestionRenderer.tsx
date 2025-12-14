/**
 * QuestionRenderer
 * 
 * Main component that renders the appropriate question type with feedback.
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    CheckCircle,
    XCircle,
    Lightbulb,
    BookOpen,
    Clock,
    HelpCircle,
    ChevronRight
} from 'lucide-react'
import type { KnowledgeQuestion, QuestionOption } from '@/types/questions'
import { DIFFICULTY_CONFIG, QUESTION_TYPE_CONFIG } from '@/types/questions'
import { MCQQuestion } from './MCQQuestion'
import { TrueFalseQuestion } from './TrueFalseQuestion'
import { FillBlankQuestion } from './FillBlankQuestion'

export interface QuestionRendererProps {
    question: KnowledgeQuestion
    onAnswer: (answer: string | string[]) => void
    showFeedback?: boolean
    showHint?: boolean
    showExplanation?: boolean
    randomizeOptions?: boolean
    disabled?: boolean
    previousAnswer?: string | string[]
    isCorrect?: boolean
    onNext?: () => void
    onHintUsed?: () => void
    timeLimit?: number
    questionNumber?: number
    totalQuestions?: number
    compact?: boolean
}

export function QuestionRenderer({
    question,
    onAnswer,
    showFeedback = true,
    showHint = true,
    showExplanation = true,
    randomizeOptions = true,
    disabled = false,
    previousAnswer,
    isCorrect,
    onNext,
    onHintUsed,
    timeLimit,
    questionNumber,
    totalQuestions,
    compact = false
}: QuestionRendererProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(previousAnswer || null)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [showHintPanel, setShowHintPanel] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0)
    const [startTime] = useState(Date.now())

    // Randomize options if needed
    const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([])

    useEffect(() => {
        if (question.options) {
            if (randomizeOptions) {
                setShuffledOptions([...question.options].sort(() => Math.random() - 0.5))
            } else {
                setShuffledOptions(question.options.sort((a, b) => a.display_order - b.display_order))
            }
        }
    }, [question.id, question.options, randomizeOptions])

    // Timer
    useEffect(() => {
        if (!timeLimit || hasSubmitted) return

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            const remaining = Math.max(0, timeLimit - elapsed)
            setTimeRemaining(remaining)

            if (remaining === 0) {
                handleSubmit()
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLimit, startTime, hasSubmitted])

    const handleAnswerChange = useCallback((answer: string | string[]) => {
        if (disabled || hasSubmitted) return
        setSelectedAnswer(answer)
    }, [disabled, hasSubmitted])

    const handleSubmit = useCallback(() => {
        if (!selectedAnswer || hasSubmitted) return
        setHasSubmitted(true)
        onAnswer(selectedAnswer)
    }, [selectedAnswer, hasSubmitted, onAnswer])

    const handleShowHint = () => {
        setShowHintPanel(true)
        onHintUsed?.()
    }

    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level]
    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type]

    // Determine if answer is correct (for UI feedback)
    const answerIsCorrect = isCorrect !== undefined ? isCorrect : (() => {
        if (!hasSubmitted || !selectedAnswer) return undefined

        switch (question.question_type) {
            case 'true_false':
                return selectedAnswer === question.correct_answer
            case 'fill_blank':
                return (selectedAnswer as string).toLowerCase().trim() ===
                    question.correct_answer?.toLowerCase().trim()
            case 'mcq':
                const selected = shuffledOptions.find(o => o.id === selectedAnswer)
                return selected?.is_correct
            case 'mcq_multi':
                const correctIds = shuffledOptions.filter(o => o.is_correct).map(o => o.id)
                const selectedIds = selectedAnswer as string[]
                return correctIds.length === selectedIds.length &&
                    correctIds.every(id => selectedIds.includes(id))
            default:
                return undefined
        }
    })()

    // Get feedback for selected option (MCQ)
    const selectedOptionFeedback = (() => {
        if (question.question_type !== 'mcq') return null
        const selected = shuffledOptions.find(o => o.id === selectedAnswer)
        return selected?.feedback
    })()

    return (
        <Card className={cn(
            'question-card transition-all duration-300',
            compact ? 'p-4' : '',
            hasSubmitted && answerIsCorrect && 'border-green-300 bg-green-50/50',
            hasSubmitted && answerIsCorrect === false && 'border-red-300 bg-red-50/50'
        )}>
            <CardHeader className={cn(compact && 'p-0 pb-3')}>
                {/* Progress & Timer */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {questionNumber && totalQuestions && (
                            <span className="text-sm text-gray-500">
                                Question {questionNumber} of {totalQuestions}
                            </span>
                        )}
                        <Badge variant="outline" className={`text-${difficultyConfig.color}-600`}>
                            {difficultyConfig.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {typeConfig.label}
                        </Badge>
                    </div>

                    {timeLimit && !hasSubmitted && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className={cn(
                                'text-sm font-mono',
                                timeRemaining < 10 && 'text-red-600 animate-pulse'
                            )}>
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}
                </div>

                {questionNumber && totalQuestions && (
                    <Progress
                        value={(questionNumber / totalQuestions) * 100}
                        className="h-1 mb-3"
                    />
                )}

                {/* Question Text */}
                <h3 className={cn(
                    'font-medium text-gray-900',
                    compact ? 'text-base' : 'text-lg'
                )}>
                    {question.question_text}
                </h3>

                {/* Points */}
                {question.points > 1 && !compact && (
                    <p className="text-sm text-gray-500 mt-1">
                        {question.points} points
                    </p>
                )}
            </CardHeader>

            <CardContent className={cn(compact && 'p-0 pb-3')}>
                {/* Question Type Renderer */}
                {question.question_type === 'mcq' && (
                    <MCQQuestion
                        options={shuffledOptions}
                        selectedAnswer={selectedAnswer as string | null}
                        onSelect={handleAnswerChange}
                        disabled={disabled || hasSubmitted}
                        showCorrect={hasSubmitted && showFeedback}
                    />
                )}

                {question.question_type === 'mcq_multi' && (
                    <MCQQuestion
                        options={shuffledOptions}
                        selectedAnswer={selectedAnswer as string[] | null}
                        onSelect={handleAnswerChange}
                        disabled={disabled || hasSubmitted}
                        showCorrect={hasSubmitted && showFeedback}
                        multiSelect
                    />
                )}

                {question.question_type === 'true_false' && (
                    <TrueFalseQuestion
                        selectedAnswer={selectedAnswer as string | null}
                        onSelect={(val) => handleAnswerChange(val)}
                        disabled={disabled || hasSubmitted}
                        correctAnswer={hasSubmitted && showFeedback ? question.correct_answer : undefined}
                    />
                )}

                {question.question_type === 'fill_blank' && (
                    <FillBlankQuestion
                        value={selectedAnswer as string || ''}
                        onChange={(val) => handleAnswerChange(val)}
                        disabled={disabled || hasSubmitted}
                        correctAnswer={hasSubmitted && showFeedback ? question.correct_answer : undefined}
                        isCorrect={hasSubmitted ? answerIsCorrect : undefined}
                    />
                )}

                {/* Hint Panel */}
                {showHint && question.hint && !showHintPanel && !hasSubmitted && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShowHint}
                        className="mt-4 text-amber-600 hover:text-amber-700"
                    >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Show Hint
                    </Button>
                )}

                {showHintPanel && question.hint && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">{question.hint}</p>
                        </div>
                    </div>
                )}

                {/* Feedback after submission */}
                {hasSubmitted && showFeedback && (
                    <div className={cn(
                        'mt-4 p-4 rounded-lg flex items-start gap-3',
                        answerIsCorrect
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-red-100 border border-red-300'
                    )}>
                        {answerIsCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={cn(
                                'font-medium',
                                answerIsCorrect ? 'text-green-800' : 'text-red-800'
                            )}>
                                {answerIsCorrect ? 'Correct!' : 'Incorrect'}
                            </p>

                            {/* Option-specific feedback for MCQ */}
                            {!answerIsCorrect && selectedOptionFeedback && (
                                <p className="text-sm text-red-700 mt-1">{selectedOptionFeedback}</p>
                            )}

                            {/* Show explanation */}
                            {showExplanation && question.explanation && (
                                <div className="mt-2 pt-2 border-t border-gray-200/50">
                                    <p className="text-sm text-gray-700">{question.explanation}</p>
                                </div>
                            )}

                            {/* Link to SOP */}
                            {question.linked_sop && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 p-0 h-auto text-blue-600"
                                    asChild
                                >
                                    <a href={`/knowledge/${question.linked_sop_id}`}>
                                        <BookOpen className="h-4 w-4 mr-1" />
                                        Read more in: {question.linked_sop.title}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className={cn(
                'flex justify-between',
                compact && 'p-0 pt-3'
            )}>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    ~{question.estimated_time_seconds}s
                </div>

                <div className="flex gap-2">
                    {!hasSubmitted ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedAnswer || disabled}
                        >
                            Submit Answer
                        </Button>
                    ) : onNext && (
                        <Button onClick={onNext}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}
