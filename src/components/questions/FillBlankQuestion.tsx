/**
 * FillBlankQuestion
 * 
 * Text input question with validation.
 */

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle } from 'lucide-react'

interface FillBlankQuestionProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    correctAnswer?: string
    isCorrect?: boolean
    placeholder?: string
    maxLength?: number
}

export function FillBlankQuestion({
    value,
    onChange,
    disabled = false,
    correctAnswer,
    isCorrect,
    placeholder = 'Type your answer...',
    maxLength = 100
}: FillBlankQuestionProps) {
    const showFeedback = correctAnswer !== undefined

    return (
        <div className="space-y-3">
            <div className="relative">
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={cn(
                        'text-lg py-6 pr-12 transition-all',
                        showFeedback && isCorrect && 'border-green-500 bg-green-50 text-green-800',
                        showFeedback && !isCorrect && 'border-red-500 bg-red-50 text-red-800'
                    )}
                />

                {showFeedback && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCorrect ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                            <XCircle className="h-6 w-6 text-red-600" />
                        )}
                    </div>
                )}
            </div>

            {/* Character count */}
            {!disabled && (
                <p className="text-xs text-gray-400 text-right">
                    {value.length} / {maxLength}
                </p>
            )}

            {/* Show correct answer if wrong */}
            {showFeedback && !isCorrect && correctAnswer && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                        <span className="font-medium">Correct answer:</span> {correctAnswer}
                    </p>
                </div>
            )}
        </div>
    )
}
