/**
 * AIQuestionGenerator
 * 
 * Component for generating questions from SOP content using AI.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Sparkles,
    Wand2,
    Loader2,
    CheckCircle,
    Edit3,
    Save,
    Trash2,
    AlertTriangle,
    FileText,
    Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGenerateQuestions, useCreateQuestion } from '@/hooks/useQuestions'
import type {
    GeneratedQuestion,
    QuestionType,
    QuestionDifficulty,
    QuestionFormData
} from '@/types/questions'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from '@/types/questions'

interface AIQuestionGeneratorProps {
    sopId: string
    sopTitle?: string
    sopContent: string
    onQuestionsCreated?: (count: number, ids?: string[]) => void
    className?: string
}

export function AIQuestionGenerator({
    sopId,
    sopTitle,
    sopContent,
    onQuestionsCreated,
    className
}: AIQuestionGeneratorProps) {
    const generateQuestions = useGenerateQuestions()
    const createQuestion = useCreateQuestion()

    // Generation settings
    const [count, setCount] = useState(5)
    const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'true_false'])
    const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium')
    const [includeHints, setIncludeHints] = useState(true)
    const [includeExplanations, setIncludeExplanations] = useState(true)

    // Generated questions state
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)

    // Manual input state
    const [manualContent, setManualContent] = useState('')

    const handleGenerate = async () => {
        // Use manual content if in manual mode, otherwise use prop content
        const contentToUse = (sopId === 'manual_input' || sopId === 'general')
            ? manualContent
            : sopContent

        if (!contentToUse || contentToUse.trim().length < 50) {
            // Basic validation
            // Ideally use a toast here
            console.error("Content too short")
            return
        }

        const result = await generateQuestions.mutateAsync({
            sop_content: contentToUse,
            sop_id: (sopId === 'manual_input' || sopId === 'general') ? undefined : sopId,
            sop_title: sopTitle,
            count,
            types: selectedTypes,
            difficulty,
            include_hints: includeHints,
            include_explanations: includeExplanations
        })

        setGeneratedQuestions(result)
        setSelectedQuestions(new Set(result.map((_, i) => i)))
    }

    const handleToggleType = (type: QuestionType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        )
    }

    const handleToggleQuestion = (index: number) => {
        setSelectedQuestions(prev => {
            const newSet = new Set(prev)
            if (newSet.has(index)) {
                newSet.delete(index)
            } else {
                newSet.add(index)
            }
            return newSet
        })
    }

    const handleUpdateQuestion = (index: number, updates: Partial<GeneratedQuestion>) => {
        setGeneratedQuestions(prev =>
            prev.map((q, i) => i === index ? { ...q, ...updates } : q)
        )
        setEditingIndex(null)
    }

    const handleDeleteQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index))
        setSelectedQuestions(prev => {
            const newSet = new Set<number>()
            prev.forEach(i => {
                if (i < index) newSet.add(i)
                else if (i > index) newSet.add(i - 1)
            })
            return newSet
        })
    }

    const handleSaveSelected = async () => {
        setSaving(true)
        let savedCount = 0
        const createdIds: string[] = []

        for (const index of selectedQuestions) {
            const q = generatedQuestions[index]
            if (!q) continue

            const formData: QuestionFormData = {
                question_text: q.question_text,
                question_text_ar: q.question_text_ar,
                question_type: q.question_type,
                difficulty_level: q.difficulty_level,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                linked_sop_id: (sopId && sopId !== 'manual_input' && sopId !== 'general') ? sopId : undefined,
                linked_sop_section: q.linked_section,
                tags: q.tags || [],
                estimated_time_seconds: 30,
                points: DIFFICULTY_CONFIG[q.difficulty_level].points,
                options: q.options?.map(o => ({
                    option_text: o.text,
                    option_text_ar: o.text_ar,
                    is_correct: o.is_correct,
                    feedback: o.feedback
                })) || []
            }

            try {
                const created = await createQuestion.mutateAsync({ formData, aiGenerated: true })
                createdIds.push(created.id)
                savedCount++
            } catch (error) {
                console.error('Failed to save question:', error)
            }
        }

        setSaving(false)
        onQuestionsCreated?.(savedCount, createdIds)
        setGeneratedQuestions([])
        setSelectedQuestions(new Set())
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Generation Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-600" />
                        AI Question Generator
                    </CardTitle>
                    <CardDescription>
                        Generate quiz questions from "{sopTitle || 'this SOP'}" using AI
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Manual Content Input */}
                    {(sopId === 'manual_input' || sopId === 'general') && (
                        <div className="space-y-2">
                            <Label>Source Content</Label>
                            <Textarea
                                placeholder="Paste the text you want to generate questions from..."
                                value={manualContent}
                                onChange={e => setManualContent(e.target.value)}
                                className="min-h-[150px]"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                    Paste SOP text, policies, or training material here.
                                </p>
                                <p className={`text-xs font-medium ${manualContent.trim().length >= 20 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {manualContent.trim().length}/20 characters minimum
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Number of questions */}
                    <div className="space-y-2">
                        <Label>Number of Questions</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                value={count}
                                onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                min={1}
                                max={10}
                                className="w-20"
                            />
                            <span className="text-sm text-gray-500">1-10 questions</span>
                        </div>
                    </div>

                    {/* Question types */}
                    <div className="space-y-2">
                        <Label>Question Types</Label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                                <button
                                    key={type}
                                    onClick={() => handleToggleType(type as QuestionType)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                                        selectedTypes.includes(type as QuestionType)
                                            ? `bg-${config.color}-100 border-${config.color}-300 text-${config.color}-700`
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    )}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <div className="flex gap-2">
                            {Object.entries(DIFFICULTY_CONFIG).map(([diff, config]) => (
                                <button
                                    key={diff}
                                    onClick={() => setDifficulty(diff as QuestionDifficulty)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                                        difficulty === diff
                                            ? `bg-${config.color}-100 border-${config.color}-300 text-${config.color}-700`
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    )}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={includeHints}
                                onCheckedChange={setIncludeHints}
                            />
                            <Label>Include hints</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={includeExplanations}
                                onCheckedChange={setIncludeExplanations}
                            />
                            <Label>Include explanations</Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleGenerate}
                        disabled={
                            generateQuestions.isPending ||
                            selectedTypes.length === 0 ||
                            ((sopId === 'manual_input' || sopId === 'general') && manualContent.trim().length < 20)
                        }
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                        {generateQuestions.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Questions
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Loading Skeleton */}
            {generateQuestions.isPending && (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Generated Questions */}
            {generatedQuestions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                            Generated Questions ({generatedQuestions.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)))}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedQuestions(new Set())}
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            AI-generated questions require review. Selected questions will be saved as <strong>drafts</strong> for human approval.
                        </AlertDescription>
                    </Alert>

                    {generatedQuestions.map((question, index) => (
                        <Card
                            key={index}
                            className={cn(
                                'transition-all',
                                selectedQuestions.has(index)
                                    ? 'border-blue-300 bg-blue-50/50'
                                    : 'opacity-60'
                            )}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedQuestions.has(index)}
                                            onCheckedChange={() => handleToggleQuestion(index)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {QUESTION_TYPE_CONFIG[question.question_type]?.label || question.question_type}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {DIFFICULTY_CONFIG[question.difficulty_level]?.label || question.difficulty_level}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteQuestion(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {editingIndex === index ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Question Text</Label>
                                            <Textarea
                                                value={question.question_text}
                                                onChange={(e) => setGeneratedQuestions(prev =>
                                                    prev.map((q, i) => i === index ? { ...q, question_text: e.target.value } : q)
                                                )}
                                                rows={2}
                                            />
                                        </div>
                                        {question.explanation && (
                                            <div>
                                                <Label>Explanation</Label>
                                                <Textarea
                                                    value={question.explanation}
                                                    onChange={(e) => setGeneratedQuestions(prev =>
                                                        prev.map((q, i) => i === index ? { ...q, explanation: e.target.value } : q)
                                                    )}
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                        <Button size="sm" onClick={() => setEditingIndex(null)}>
                                            Done Editing
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-medium mb-3">{question.question_text}</p>

                                        {question.options && (
                                            <div className="space-y-1 ml-4">
                                                {question.options.map((opt, optIdx) => (
                                                    <div
                                                        key={optIdx}
                                                        className={cn(
                                                            'flex items-center gap-2 text-sm py-1',
                                                            opt.is_correct && 'text-green-700 font-medium'
                                                        )}
                                                    >
                                                        <span className="text-gray-400">
                                                            {String.fromCharCode(65 + optIdx)}.
                                                        </span>
                                                        <span>{opt.text}</span>
                                                        {opt.is_correct && (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {question.correct_answer && !question.options && (
                                            <p className="text-sm text-green-700 mt-2">
                                                <strong>Answer:</strong> {question.correct_answer}
                                            </p>
                                        )}

                                        {question.explanation && (
                                            <p className="text-sm text-gray-600 mt-3 italic">
                                                {question.explanation}
                                            </p>
                                        )}

                                        {question.hint && (
                                            <p className="text-sm text-amber-700 mt-2">
                                                💡 Hint: {question.hint}
                                            </p>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Save button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveSelected}
                            disabled={selectedQuestions.size === 0 || saving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''} as Drafts
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
