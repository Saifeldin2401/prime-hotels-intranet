/**
 * MCQQuestion
 * 
 * Multiple choice question component with radio/checkbox options.
 */

import { cn } from '@/lib/utils'
import { CheckCircle, Circle, Square, CheckSquare } from 'lucide-react'
import type { QuestionOption } from '@/types/questions'

interface MCQQuestionProps {
    options: QuestionOption[]
    selectedAnswer: string | string[] | null
    onSelect: (answer: string | string[]) => void
    disabled?: boolean
    showCorrect?: boolean
    multiSelect?: boolean
}

export function MCQQuestion({
    options,
    selectedAnswer,
    onSelect,
    disabled = false,
    showCorrect = false,
    multiSelect = false
}: MCQQuestionProps) {
    const handleSelect = (optionId: string) => {
        if (disabled) return

        if (multiSelect) {
            const currentSelected = (selectedAnswer as string[]) || []
            if (currentSelected.includes(optionId)) {
                onSelect(currentSelected.filter(id => id !== optionId))
            } else {
                onSelect([...currentSelected, optionId])
            }
        } else {
            onSelect(optionId)
        }
    }

    const isSelected = (optionId: string) => {
        if (multiSelect) {
            return (selectedAnswer as string[] || []).includes(optionId)
        }
        return selectedAnswer === optionId
    }

    return (
        <div className="space-y-2">
            {options.map((option, index) => {
                const selected = isSelected(option.id)
                const showAsCorrect = showCorrect && option.is_correct
                const showAsIncorrect = showCorrect && selected && !option.is_correct

                return (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={disabled}
                        className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                            disabled && 'cursor-not-allowed opacity-75',
                            !disabled && !selected && 'border-gray-200 bg-white',
                            selected && !showCorrect && 'border-blue-500 bg-blue-50 ring-1 ring-blue-500',
                            showAsCorrect && 'border-green-500 bg-green-50',
                            showAsIncorrect && 'border-red-500 bg-red-50'
                        )}
                    >
                        {/* Selection indicator */}
                        <div className="flex-shrink-0 mt-0.5">
                            {multiSelect ? (
                                selected ? (
                                    <CheckSquare className={cn(
                                        'h-5 w-5',
                                        showAsCorrect ? 'text-green-600' : showAsIncorrect ? 'text-red-600' : 'text-blue-600'
                                    )} />
                                ) : (
                                    <Square className={cn(
                                        'h-5 w-5',
                                        showAsCorrect ? 'text-green-600' : 'text-gray-400'
                                    )} />
                                )
                            ) : (
                                selected ? (
                                    <CheckCircle className={cn(
                                        'h-5 w-5',
                                        showAsCorrect ? 'text-green-600' : showAsIncorrect ? 'text-red-600' : 'text-blue-600'
                                    )} />
                                ) : (
                                    <Circle className={cn(
                                        'h-5 w-5',
                                        showAsCorrect ? 'text-green-600' : 'text-gray-400'
                                    )} />
                                )
                            )}
                        </div>

                        {/* Option text */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'text-sm font-medium text-gray-500',
                                    selected && 'text-blue-600',
                                    showAsCorrect && 'text-green-600',
                                    showAsIncorrect && 'text-red-600'
                                )}>
                                    {String.fromCharCode(65 + index)}.
                                </span>
                                <span className={cn(
                                    'text-gray-900',
                                    showAsCorrect && 'text-green-800 font-medium',
                                    showAsIncorrect && 'text-red-800'
                                )}>
                                    {option.option_text}
                                </span>
                            </div>

                            {/* Show feedback if this option was selected and is wrong */}
                            {showCorrect && selected && !option.is_correct && option.feedback && (
                                <p className="mt-1 text-sm text-red-600">{option.feedback}</p>
                            )}

                            {/* Show feedback for correct option */}
                            {showCorrect && option.is_correct && option.feedback && (
                                <p className="mt-1 text-sm text-green-600">{option.feedback}</p>
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
