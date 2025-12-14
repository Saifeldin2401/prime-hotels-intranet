/**
 * QuestionBankSelector
 * 
 * Component for selecting questions from the Question Bank.
 * Used in TrainingBuilder and QuizBuilder to add existing questions.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Search,
    Filter,
    CheckCircle,
    Plus,
    HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KnowledgeQuestion, QuestionDifficulty, QuestionType } from '@/types/questions'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from '@/types/questions'

interface QuestionBankSelectorProps {
    /** IDs of already selected questions (to show as selected) */
    selectedIds?: string[]
    /** Called when user adds questions */
    onSelect: (questions: KnowledgeQuestion[]) => void
    /** Maximum number of questions that can be selected (0 = unlimited) */
    maxSelections?: number
    /** Filter by linked SOP */
    sopId?: string
    className?: string
}

export function QuestionBankSelector({
    selectedIds = [],
    onSelect,
    maxSelections = 0,
    sopId,
    className
}: QuestionBankSelectorProps) {
    const [search, setSearch] = useState('')
    const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | 'all'>('all')
    const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
    const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds))

    // Fetch published questions
    const { data: questions, isLoading } = useQuery({
        queryKey: ['question-bank', sopId],
        queryFn: async () => {
            let query = supabase
                .from('knowledge_questions')
                .select(`
                    id,
                    question_text,
                    question_type,
                    difficulty_level,
                    points,
                    tags,
                    linked_sop_id,
                    status
                `)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(100)

            if (sopId) {
                query = query.eq('linked_sop_id', sopId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as KnowledgeQuestion[]
        }
    })

    // Filter questions
    const filteredQuestions = useMemo(() => {
        if (!questions) return []

        return questions.filter(q => {
            // Text search
            if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) {
                return false
            }
            // Difficulty filter
            if (difficultyFilter !== 'all' && q.difficulty_level !== difficultyFilter) {
                return false
            }
            // Type filter
            if (typeFilter !== 'all' && q.question_type !== typeFilter) {
                return false
            }
            return true
        })
    }, [questions, search, difficultyFilter, typeFilter])

    const handleToggle = (question: KnowledgeQuestion) => {
        setLocalSelected(prev => {
            const newSet = new Set(prev)
            if (newSet.has(question.id)) {
                newSet.delete(question.id)
            } else {
                if (maxSelections > 0 && newSet.size >= maxSelections) {
                    // Don't add if at max
                    return prev
                }
                newSet.add(question.id)
            }
            return newSet
        })
    }

    const handleAddSelected = () => {
        const selected = questions?.filter(q => localSelected.has(q.id)) || []
        onSelect(selected)
    }

    const getDifficultyColor = (diff: QuestionDifficulty) => {
        const config = DIFFICULTY_CONFIG[diff]
        return config?.color || 'gray'
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                Loading questions...
            </div>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search questions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as any)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="fill_blank">Fill Blank</SelectItem>
                        <SelectItem value="scenario">Scenario</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Selection Info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                    {filteredQuestions.length} questions found
                </span>
                <span className="font-medium text-primary">
                    {localSelected.size} selected
                    {maxSelections > 0 && ` / ${maxSelections} max`}
                </span>
            </div>

            {/* Question List */}
            <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y">
                {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>No questions found matching your filters.</p>
                    </div>
                ) : (
                    filteredQuestions.map((q) => (
                        <div
                            key={q.id}
                            onClick={() => handleToggle(q)}
                            className={cn(
                                "p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors",
                                localSelected.has(q.id) && "bg-primary/5"
                            )}
                        >
                            <Checkbox
                                checked={localSelected.has(q.id)}
                                onCheckedChange={() => handleToggle(q)}
                                className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium line-clamp-2">
                                    {q.question_text}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                    <Badge variant="outline" className="text-xs">
                                        {QUESTION_TYPE_CONFIG[q.question_type]?.label || q.question_type}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs border-${getDifficultyColor(q.difficulty_level)}-300 text-${getDifficultyColor(q.difficulty_level)}-700`}
                                    >
                                        {DIFFICULTY_CONFIG[q.difficulty_level]?.label || q.difficulty_level}
                                    </Badge>
                                    <span className="text-xs text-gray-400">{q.points} pts</span>
                                </div>
                            </div>
                            {localSelected.has(q.id) && (
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleAddSelected}
                    disabled={localSelected.size === 0}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add {localSelected.size} Question{localSelected.size !== 1 ? 's' : ''}
                </Button>
            </div>
        </div>
    )
}
