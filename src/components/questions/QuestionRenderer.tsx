/**
 * QuestionRenderer
 * 
 * Main component that renders the appropriate question type with feedback.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { KnowledgeQuestion, QuestionGradeResult, QuestionOption } from '@/types/questions'
import { DIFFICULTY_CONFIG, QUESTION_TYPE_CONFIG } from '@/types/questions'
import {
    BookOpen,
    CheckCircle,
    ChevronRight,
    Clock,
    Lightbulb,
    XCircle
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from "react-i18next"
import { FillBlankQuestion } from './FillBlankQuestion'
import { MCQQuestion } from './MCQQuestion'
import { TrueFalseQuestion } from './TrueFalseQuestion'

export interface QuestionRendererProps {
    question: KnowledgeQuestion
    onAnswer: (answer: string | string[]) => void
    showFeedback?: boolean
    showHint?: boolean
    showExplanation?: boolean
    randomizeOptions?: boolean
    disabled?: boolean
    previousAnswer?: string | string[]
    // Result of the server-side grading RPC. The pre-fetched `question` never
    // carries the answer key, so correctness and any answer-key reveal
    // (correct answer, explanation, per-option correctness/feedback) come
    // exclusively from here, populated only after the learner has submitted.
    gradeResult?: QuestionGradeResult
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
    gradeResult,
    onNext,
    onHintUsed,
    timeLimit,
    questionNumber,
    totalQuestions,
    compact = false
}: QuestionRendererProps) {
    const { t } = useTranslation(['training', 'common'])
    const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(previousAnswer || null)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [showHintPanel, setShowHintPanel] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0)
    const [startTime, setStartTime] = useState(() => Date.now())

    const handleSubmit = useCallback(() => {
        if (!selectedAnswer || hasSubmitted) return
        setHasSubmitted(true)
        onAnswer(selectedAnswer)
    }, [selectedAnswer, hasSubmitted, onAnswer])

    // Randomize options if needed
    const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([])

    useEffect(() => {
        setSelectedAnswer(previousAnswer ?? null)
        setHasSubmitted(previousAnswer !== undefined && previousAnswer !== null && gradeResult !== undefined)
        setShowHintPanel(false)
        setTimeRemaining(timeLimit || 0)
        setStartTime(Date.now())
    }, [question.id, previousAnswer, gradeResult, timeLimit])

    useEffect(() => {
        if (question.options?.length) {
            if (randomizeOptions) {
                setShuffledOptions([...question.options].sort(() => Math.random() - 0.5))
            } else {
                setShuffledOptions([...question.options].sort((a, b) => a.display_order - b.display_order))
            }
        } else {
            setShuffledOptions([])
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
    }, [timeLimit, startTime, hasSubmitted, handleSubmit])

    const handleAnswerChange = useCallback((answer: string | string[]) => {
        if (disabled || hasSubmitted) return
        setSelectedAnswer(answer)
    }, [disabled, hasSubmitted])



    const handleShowHint = () => {
        setShowHintPanel(true)
        onHintUsed?.()
    }

    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level]
    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type]

    // Correctness is always sourced from the server grading result - the
    // pre-fetched `question` never carries the answer key, so there is no
    // safe client-side way to compute this.
    const answerIsCorrect = gradeResult?.isCorrect

    // Overlay the revealed per-option correctness/feedback onto the
    // render-safe options once the server has graded the answer.
    const revealedOptionsById = new Map((gradeResult?.options || []).map(o => [o.id, o]))
    const displayOptions: QuestionOption[] = shuffledOptions.map(option => {
        const revealed = revealedOptionsById.get(option.id)
        return revealed
            ? { ...option, is_correct: revealed.is_correct, feedback: revealed.feedback }
            : option
    })

    // Get feedback for selected option (MCQ)
    const selectedOptionFeedback = (() => {
        if (question.question_type !== 'mcq' && question.question_type !== 'scenario') return null
        const selected = displayOptions.find(o => o.id === selectedAnswer)
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
                    displayOptions.length > 0 ? (
                        <MCQQuestion
                            options={displayOptions}
                            selectedAnswer={selectedAnswer as string | null}
                            onSelect={handleAnswerChange}
                            disabled={disabled || hasSubmitted}
                            showCorrect={hasSubmitted && showFeedback}
                        />
                    ) : (
                        <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {t('training:quizzes.player.no_options', 'This question has no answer options configured.')}
                        </p>
                    )
                )}

                {question.question_type === 'mcq_multi' && (
                    displayOptions.length > 0 ? (
                        <MCQQuestion
                            options={displayOptions}
                            selectedAnswer={selectedAnswer as string[] | null}
                            onSelect={handleAnswerChange}
                            disabled={disabled || hasSubmitted}
                            showCorrect={hasSubmitted && showFeedback}
                            multiSelect
                        />
                    ) : (
                        <p className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {t('training:quizzes.player.no_options', 'This question has no answer options configured.')}
                        </p>
                    )
                )}

                {question.question_type === 'true_false' && (
                    <TrueFalseQuestion
                        selectedAnswer={selectedAnswer as string | null}
                        onSelect={(val) => handleAnswerChange(val)}
                        disabled={disabled || hasSubmitted}
                        correctAnswer={hasSubmitted && showFeedback ? gradeResult?.correctAnswer : undefined}
                    />
                )}

                {question.question_type === 'fill_blank' && (
                    <FillBlankQuestion
                        value={selectedAnswer as string || ''}
                        onChange={(val) => handleAnswerChange(val)}
                        disabled={disabled || hasSubmitted}
                        correctAnswer={hasSubmitted && showFeedback ? gradeResult?.correctAnswer : undefined}
                        isCorrect={hasSubmitted ? answerIsCorrect : undefined}
                    />
                )}

                {question.question_type === 'scenario' && (
                    displayOptions.length > 0 ? (
                        <MCQQuestion
                            options={displayOptions}
                            selectedAnswer={selectedAnswer as string | null}
                            onSelect={handleAnswerChange}
                            disabled={disabled || hasSubmitted}
                            showCorrect={hasSubmitted && showFeedback}
                        />
                    ) : (
                        <FillBlankQuestion
                            value={selectedAnswer as string || ''}
                            onChange={(val) => handleAnswerChange(val)}
                            disabled={disabled || hasSubmitted}
                            correctAnswer={hasSubmitted && showFeedback ? gradeResult?.correctAnswer : undefined}
                            isCorrect={hasSubmitted ? answerIsCorrect : undefined}
                        />
                    )
                )}

                {/* Hint Panel */}
                {showHint && question.hint && !showHintPanel && !hasSubmitted && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShowHint}
                        className="mt-4 text-amber-600 hover:text-amber-700"
                    >
                        <Lightbulb className="h-4 w-4 me-2" />
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
                            {showExplanation && gradeResult?.explanation && (
                                <div className="mt-2 pt-2 border-t border-gray-200/50">
                                    <p className="text-sm text-gray-700">{gradeResult.explanation}</p>
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
                                        <BookOpen className="h-4 w-4 me-1" />
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
                            Next <ChevronRight className="h-4 w-4 ms-1" />
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}
