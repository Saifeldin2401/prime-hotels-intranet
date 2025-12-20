/**
 * InlineQuizBuilder
 * 
 * Component for building quizzes inline within the Training Builder.
 * Allows creating questions directly or importing from Question Bank.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Plus,
    Trash2,
    GripVertical,
    CheckCircle,
    HelpCircle,
    Sparkles,
    BookOpen,
    Save,
    X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching'
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert'

export interface InlineQuestion {
    id: string
    question_text: string
    question_type: QuestionType
    difficulty_level: DifficultyLevel
    options?: { text: string; is_correct: boolean }[]
    correct_answer?: string
    explanation?: string
    points: number
    order: number
}

interface InlineQuizBuilderProps {
    trainingModuleId?: string
    sectionId?: string
    initialQuestions?: InlineQuestion[]
    onQuestionsChange?: (questions: InlineQuestion[]) => void
    sopContent?: string
    sopTitle?: string
    className?: string
}

export function InlineQuizBuilder({
    trainingModuleId,
    sectionId,
    initialQuestions = [],
    onQuestionsChange,
    sopContent,
    sopTitle,
    className
}: InlineQuizBuilderProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [questions, setQuestions] = useState<InlineQuestion[]>(initialQuestions)
    const [editingQuestion, setEditingQuestion] = useState<InlineQuestion | null>(null)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [addMode, setAddMode] = useState<'manual' | 'import' | 'ai'>('manual')

    // New question template
    const createNewQuestion = (): InlineQuestion => ({
        id: `q_${Date.now()}`,
        question_text: '',
        question_type: 'mcq',
        difficulty_level: 'medium',
        options: [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
        ],
        explanation: '',
        points: 10,
        order: questions.length
    })

    const updateQuestions = (newQuestions: InlineQuestion[]) => {
        setQuestions(newQuestions)
        onQuestionsChange?.(newQuestions)
    }

    const handleAddQuestion = () => {
        setEditingQuestion(createNewQuestion())
        setAddMode('manual')
        setShowAddDialog(true)
    }

    const handleSaveQuestion = () => {
        if (!editingQuestion) return

        const isNew = !questions.find(q => q.id === editingQuestion.id)

        if (isNew) {
            updateQuestions([...questions, editingQuestion])
        } else {
            updateQuestions(questions.map(q =>
                q.id === editingQuestion.id ? editingQuestion : q
            ))
        }

        setEditingQuestion(null)
        setShowAddDialog(false)
    }

    const handleDeleteQuestion = (id: string) => {
        updateQuestions(questions.filter(q => q.id !== id))
    }

    const handleImportQuestions = (importedIds: string[]) => {
        // Fetch and add imported questions
        // This would integrate with the Question Bank
        setShowImportDialog(false)
    }

    const handleAIGenerated = (count: number, ids?: string[]) => {
        // Handle AI-generated questions
        setShowAddDialog(false)
    }

    const handleOptionChange = (index: number, text: string) => {
        if (!editingQuestion?.options) return
        const newOptions = [...editingQuestion.options]
        newOptions[index] = { ...newOptions[index], text }
        setEditingQuestion({ ...editingQuestion, options: newOptions })
    }

    const handleCorrectChange = (index: number) => {
        if (!editingQuestion?.options) return
        const newOptions = editingQuestion.options.map((opt, i) => ({
            ...opt,
            is_correct: i === index
        }))
        setEditingQuestion({ ...editingQuestion, options: newOptions })
    }

    const addOption = () => {
        if (!editingQuestion?.options) return
        setEditingQuestion({
            ...editingQuestion,
            options: [...editingQuestion.options, { text: '', is_correct: false }]
        })
    }

    const removeOption = (index: number) => {
        if (!editingQuestion?.options || editingQuestion.options.length <= 2) return
        const newOptions = editingQuestion.options.filter((_, i) => i !== index)
        setEditingQuestion({ ...editingQuestion, options: newOptions })
    }

    return (
        <div className={cn("space-y-4", className, isRTL ? "text-right" : "text-left")}>
            {/* Question List */}
            <div className="space-y-2">
                {questions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <HelpCircle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-4">{t('inlineQuiz.noQuestions')}</p>
                        <Button onClick={handleAddQuestion}>
                            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('inlineQuiz.addQuestion')}
                        </Button>
                    </div>
                ) : (
                    questions.map((question, index) => (
                        <div
                            key={question.id}
                            className={`flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 group ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className="cursor-grab text-gray-400 hover:text-gray-600">
                                <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-500">
                                        Q{index + 1}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {t(`inlineQuiz.${question.question_type}`)}
                                    </Badge>
                                    <Badge className={cn("text-xs",
                                        question.difficulty_level === 'easy' ? 'bg-green-100 text-green-700' :
                                            question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                question.difficulty_level === 'hard' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                    )}>
                                        {t(`inlineQuiz.${question.difficulty_level}`)}
                                    </Badge>
                                    <span className={cn("text-xs text-gray-400", isRTL ? "mr-auto" : "ml-auto")}>
                                        {question.points} {t('inlineQuiz.pts')}
                                    </span>
                                </div>
                                <p className="text-sm">{question.question_text || t('inlineQuiz.untitledQuestion')}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingQuestion(question)
                                        setShowAddDialog(true)
                                    }}
                                >
                                    {t('edit')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Question Actions */}
            {questions.length > 0 && (
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Button onClick={handleAddQuestion}>
                        <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {t('inlineQuiz.addQuestion')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                        <BookOpen className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {t('inlineQuiz.importFromBank')}
                    </Button>
                    {sopContent && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAddMode('ai')
                                setShowAddDialog(true)
                            }}
                        >
                            <Sparkles className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('inlineQuiz.generateWithAi')}
                        </Button>
                    )}
                </div>
            )}

            {/* Add/Edit Question Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                        <DialogTitle>
                            {editingQuestion && questions.find(q => q.id === editingQuestion.id)
                                ? t('inlineQuiz.editQuestion')
                                : t('inlineQuiz.addQuestion')
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {t('inlineQuiz.createModifyDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {addMode === 'ai' && sopContent ? (
                        <AIQuestionGenerator
                            sopId={trainingModuleId || 'inline'}
                            sopTitle={sopTitle || 'Training Module'}
                            sopContent={sopContent}
                            onQuestionsCreated={handleAIGenerated}
                        />
                    ) : editingQuestion && (
                        <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {/* Question Text */}
                            <div>
                                <Label>{t('inlineQuiz.questionLabel')}</Label>
                                <Textarea
                                    value={editingQuestion.question_text}
                                    onChange={(e) => setEditingQuestion({
                                        ...editingQuestion,
                                        question_text: e.target.value
                                    })}
                                    placeholder={t('inlineQuiz.enterQuestionPlaceholder')}
                                    rows={3}
                                    className={isRTL ? 'text-right' : 'text-left'}
                                />
                            </div>

                            {/* Question Type & Difficulty */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('inlineQuiz.typeLabel')}</Label>
                                    <Select
                                        value={editingQuestion.question_type}
                                        onValueChange={(v) => setEditingQuestion({
                                            ...editingQuestion,
                                            question_type: v as QuestionType
                                        })}
                                    >
                                        <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                                            <SelectItem value="mcq" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.mcq')}</SelectItem>
                                            <SelectItem value="true_false" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.trueFalse')}</SelectItem>
                                            <SelectItem value="fill_blank" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.fillBlank')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('inlineQuiz.difficultyLabel')}</Label>
                                    <Select
                                        value={editingQuestion.difficulty_level}
                                        onValueChange={(v) => setEditingQuestion({
                                            ...editingQuestion,
                                            difficulty_level: v as DifficultyLevel
                                        })}
                                    >
                                        <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                                            <SelectItem value="easy" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.easy')}</SelectItem>
                                            <SelectItem value="medium" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.medium')}</SelectItem>
                                            <SelectItem value="hard" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.hard')}</SelectItem>
                                            <SelectItem value="expert" className={isRTL ? 'flex-row-reverse' : ''}>{t('inlineQuiz.expert')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* MCQ Options */}
                            {editingQuestion.question_type === 'mcq' && editingQuestion.options && (
                                <div>
                                    <Label>{t('inlineQuiz.answerOptions')}</Label>
                                    <div className="space-y-2 mt-2">
                                        {editingQuestion.options.map((option, i) => (
                                            <div key={i} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <RadioGroupItem
                                                    value={String(i)}
                                                    checked={option.is_correct}
                                                    onClick={() => handleCorrectChange(i)}
                                                    className="text-green-600"
                                                />
                                                <Input
                                                    value={option.text}
                                                    onChange={(e) => handleOptionChange(i, e.target.value)}
                                                    placeholder={t('inlineQuiz.optionPlaceholder', { number: i + 1 })}
                                                    className={cn("flex-1", isRTL ? "text-right" : "text-left")}
                                                />
                                                {editingQuestion.options!.length > 2 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeOption(i)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addOption}
                                            className={isRTL ? 'flex-row-reverse' : ''}
                                        >
                                            <Plus className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                                            {t('inlineQuiz.addOption', 'Add Option')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* True/False */}
                            {editingQuestion.question_type === 'true_false' && (
                                <div>
                                    <Label>{t('inlineQuiz.correctAnswer')}</Label>
                                    <RadioGroup
                                        value={editingQuestion.correct_answer || 'true'}
                                        onValueChange={(v) => setEditingQuestion({
                                            ...editingQuestion,
                                            correct_answer: v
                                        })}
                                        className={`flex gap-4 mt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <RadioGroupItem value="true" />
                                            <Label>{t('true')}</Label>
                                        </div>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <RadioGroupItem value="false" />
                                            <Label>{t('false')}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}

                            {/* Fill in Blank */}
                            {editingQuestion.question_type === 'fill_blank' && (
                                <div>
                                    <Label>{t('inlineQuiz.correctAnswer')}</Label>
                                    <Input
                                        value={editingQuestion.correct_answer || ''}
                                        onChange={(e) => setEditingQuestion({
                                            ...editingQuestion,
                                            correct_answer: e.target.value
                                        })}
                                        placeholder={t('inlineQuiz.correctAnswerPlaceholder')}
                                        className={isRTL ? 'text-right' : 'text-left'}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('inlineQuiz.fillBlankHint')}
                                    </p>
                                </div>
                            )}

                            {/* Explanation */}
                            <div>
                                <Label>{t('inlineQuiz.explanationLabel')}</Label>
                                <Textarea
                                    value={editingQuestion.explanation || ''}
                                    onChange={(e) => setEditingQuestion({
                                        ...editingQuestion,
                                        explanation: e.target.value
                                    })}
                                    placeholder={t('inlineQuiz.explanationPlaceholder')}
                                    rows={2}
                                    className={isRTL ? 'text-right' : 'text-left'}
                                />
                            </div>

                            {/* Points */}
                            <div>
                                <Label>{t('inlineQuiz.pointsLabel')}</Label>
                                <Input
                                    type="number"
                                    value={editingQuestion.points}
                                    onChange={(e) => setEditingQuestion({
                                        ...editingQuestion,
                                        points: parseInt(e.target.value) || 0
                                    })}
                                    min={0}
                                    max={100}
                                    className={cn("w-24", isRTL ? "text-right" : "text-left")}
                                />
                            </div>

                            {/* Actions */}
                            <div className={`flex justify-end gap-2 pt-4 border-t ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button onClick={handleSaveQuestion}>
                                    <Save className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {t('inlineQuiz.saveQuestion')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
