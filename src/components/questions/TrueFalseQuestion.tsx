/**
 * TrueFalseQuestion
 * 
 * Binary true/false question with toggle buttons.
 */

import { cn } from '@/lib/utils'
import { Check, X, CheckCircle, XCircle } from 'lucide-react'

interface TrueFalseQuestionProps {
    selectedAnswer: string | null
    onSelect: (answer: 'true' | 'false') => void
    disabled?: boolean
    correctAnswer?: string
}

export function TrueFalseQuestion({
    selectedAnswer,
    onSelect,
    disabled = false,
    correctAnswer
}: TrueFalseQuestionProps) {
    const showFeedback = correctAnswer !== undefined

    const isCorrectTrue = correctAnswer === 'true'
    const isCorrectFalse = correctAnswer === 'false'
    const selectedTrue = selectedAnswer === 'true'
    const selectedFalse = selectedAnswer === 'false'

    return (
        <div className="flex gap-4 justify-center">
            {/* True Button */}
            <button
                onClick={() => onSelect('true')}
                disabled={disabled}
                className={cn(
                    'flex-1 max-w-[200px] flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
                    disabled && 'cursor-not-allowed opacity-75 hover:scale-100',

                    // Default state
                    !selectedTrue && !showFeedback && 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50',

                    // Selected without feedback
                    selectedTrue && !showFeedback && 'border-green-500 bg-green-100 ring-2 ring-green-500',

                    // Correct answer revealed
                    showFeedback && isCorrectTrue && 'border-green-500 bg-green-100',

                    // Wrong answer (selected but wrong)
                    showFeedback && selectedTrue && !isCorrectTrue && 'border-red-500 bg-red-100'
                )}
            >
                <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center',
                    !selectedTrue && !showFeedback && 'bg-green-100',
                    selectedTrue && !showFeedback && 'bg-green-500 text-white',
                    showFeedback && isCorrectTrue && 'bg-green-500 text-white',
                    showFeedback && selectedTrue && !isCorrectTrue && 'bg-red-500 text-white'
                )}>
                    {showFeedback && isCorrectTrue ? (
                        <CheckCircle className="h-6 w-6" />
                    ) : showFeedback && selectedTrue && !isCorrectTrue ? (
                        <XCircle className="h-6 w-6" />
                    ) : (
                        <Check className={cn(
                            'h-6 w-6',
                            selectedTrue ? 'text-white' : 'text-green-600'
                        )} />
                    )}
                </div>
                <span className={cn(
                    'text-lg font-semibold',
                    selectedTrue || (showFeedback && isCorrectTrue) ? 'text-green-700' : 'text-gray-600',
                    showFeedback && selectedTrue && !isCorrectTrue && 'text-red-700'
                )}>
                    True
                </span>
            </button>

            {/* False Button */}
            <button
                onClick={() => onSelect('false')}
                disabled={disabled}
                className={cn(
                    'flex-1 max-w-[200px] flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
                    disabled && 'cursor-not-allowed opacity-75 hover:scale-100',

                    // Default state
                    !selectedFalse && !showFeedback && 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50',

                    // Selected without feedback
                    selectedFalse && !showFeedback && 'border-red-500 bg-red-100 ring-2 ring-red-500',

                    // Correct answer revealed
                    showFeedback && isCorrectFalse && 'border-green-500 bg-green-100',

                    // Wrong answer (selected but wrong)
                    showFeedback && selectedFalse && !isCorrectFalse && 'border-red-500 bg-red-100'
                )}
            >
                <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center',
                    !selectedFalse && !showFeedback && 'bg-red-100',
                    selectedFalse && !showFeedback && 'bg-red-500 text-white',
                    showFeedback && isCorrectFalse && 'bg-green-500 text-white',
                    showFeedback && selectedFalse && !isCorrectFalse && 'bg-red-500 text-white'
                )}>
                    {showFeedback && isCorrectFalse ? (
                        <CheckCircle className="h-6 w-6" />
                    ) : showFeedback && selectedFalse && !isCorrectFalse ? (
                        <XCircle className="h-6 w-6" />
                    ) : (
                        <X className={cn(
                            'h-6 w-6',
                            selectedFalse ? 'text-white' : 'text-red-600'
                        )} />
                    )}
                </div>
                <span className={cn(
                    'text-lg font-semibold',
                    selectedFalse && !showFeedback ? 'text-red-700' : 'text-gray-600',
                    showFeedback && isCorrectFalse && 'text-green-700',
                    showFeedback && selectedFalse && !isCorrectFalse && 'text-red-700'
                )}>
                    False
                </span>
            </button>
        </div>
    )
}
