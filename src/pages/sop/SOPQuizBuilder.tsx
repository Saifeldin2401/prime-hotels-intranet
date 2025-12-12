import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'
import type { SOPQuizQuestion, QuizQuestionType } from '@/lib/types'
import { aiService } from '@/lib/gemini'
import { Icons } from '@/components/icons'

interface QuizQuestion {
    id?: string
    question_text: string
    question_type: QuizQuestionType
    options: string[]
    correct_answer: string
    points: number
    order_index: number
}

export default function SOPQuizBuilder() {
    const { sopId } = useParams<{ sopId: string }>()
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [questions, setQuestions] = useState<QuizQuestion[]>([])
    const [passingScore, setPassingScore] = useState(70)
    const [isGenerating, setIsGenerating] = useState(false)

    // Fetch existing quiz questions
    const { data: existingQuestions, isLoading } = useQuery({
        queryKey: ['sop-quiz-questions', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sop_quiz_questions')
                .select('*')
                .eq('sop_document_id', sopId)
                .order('order_index')

            if (error) throw error
            return data as SOPQuizQuestion[]
        },
        enabled: !!sopId
    })

    // Fetch SOP document to get passing score
    const { data: sopDocument } = useQuery({
        queryKey: ['sop-document', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sop_documents')
                .select('*')
                .eq('id', sopId)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!sopId
    })

    // Initialize questions from existing data
    useState(() => {
        if (existingQuestions && existingQuestions.length > 0) {
            setQuestions(existingQuestions.map(q => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || [],
                correct_answer: q.correct_answer,
                points: q.points,
                order_index: q.order_index
            })))
        }
        if (sopDocument?.passing_score) {
            setPassingScore(sopDocument.passing_score)
        }
    })

    const addQuestion = () => {
        setQuestions([...questions, {
            question_text: '',
            question_type: 'mcq',
            options: ['', '', '', ''],
            correct_answer: '',
            points: 1,
            order_index: questions.length
        }])
    }

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index))
    }

    const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
        const updated = [...questions]
        updated[index] = { ...updated[index], [field]: value }
        setQuestions(updated)
    }

    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        const updated = [...questions]
        const options = [...updated[questionIndex].options]
        options[optionIndex] = value
        updated[questionIndex] = { ...updated[questionIndex], options }
        setQuestions(updated)
    }

    const handleGenerateQuiz = async () => {
        if (!sopDocument?.content) {
            toast({
                title: 'No Content Found',
                description: 'This SOP has no content to generate a quiz from.',
                variant: 'destructive'
            })
            return
        }

        setIsGenerating(true)
        try {
            const aiQuestions = await aiService.generateQuiz(sopDocument.content)

            // Transform to local format
            const mappedQuestions = aiQuestions.map((q, i) => ({
                id: undefined,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || [],
                correct_answer: q.correct_answer?.toString() || '',
                points: q.points || 10,
                order_index: questions.length + i
            }))

            setQuestions([...questions, ...mappedQuestions])

            toast({
                title: 'Quiz Generated',
                description: `Successfully generated ${mappedQuestions.length} questions.`
            })
        } catch (error: any) {
            toast({
                title: 'Generation Failed',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const saveQuizMutation = useMutation({
        mutationFn: async () => {
            // Delete existing questions
            await supabase
                .from('sop_quiz_questions')
                .delete()
                .eq('sop_document_id', sopId)

            // Insert new questions
            const questionsToInsert = questions.map((q, index) => ({
                sop_document_id: sopId,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.question_type === 'mcq' ? q.options : null,
                correct_answer: q.correct_answer,
                points: q.points,
                order_index: index
            }))

            const { error: insertError } = await supabase
                .from('sop_quiz_questions')
                .insert(questionsToInsert)

            if (insertError) throw insertError

            // Update SOP document with quiz settings
            const { error: updateError } = await supabase
                .from('sop_documents')
                .update({
                    quiz_enabled: questions.length > 0,
                    requires_quiz: questions.length > 0,
                    passing_score: passingScore
                })
                .eq('id', sopId)

            if (updateError) throw updateError
        },
        onSuccess: () => {
            toast({
                title: 'Quiz saved',
                description: 'Quiz questions have been saved successfully.',
            })
            queryClient.invalidateQueries({ queryKey: ['sop-quiz-questions', sopId] })
            queryClient.invalidateQueries({ queryKey: ['sop-document', sopId] })
            navigate(`/sop/${sopId}`)
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save quiz',
                variant: 'destructive'
            })
        }
    })

    if (isLoading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quiz Builder"
                description="Create quiz questions for this SOP"
            />

            <div className="prime-card">
                <div className="prime-card-body space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="passing_score">Passing Score (%)</Label>
                            <Input
                                id="passing_score"
                                type="number"
                                min="0"
                                max="100"
                                value={passingScore}
                                onChange={(e) => setPassingScore(parseInt(e.target.value))}
                                className="w-32 mt-1"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleGenerateQuiz} disabled={isGenerating}>
                                {isGenerating ? (
                                    <Icons.Loader className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Icons.Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                                )}
                                Auto-Generate with AI
                            </Button>
                            <Button onClick={addQuestion}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Question
                            </Button>
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>No questions yet. Click "Add Question" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {questions.map((question, qIndex) => (
                                <div key={qIndex} className="border rounded-lg p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="h-5 w-5 text-gray-400" />
                                            <span className="font-semibold">Question {qIndex + 1}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeQuestion(qIndex)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>

                                    <div>
                                        <Label>Question Type</Label>
                                        <Select
                                            value={question.question_type}
                                            onValueChange={(value) => updateQuestion(qIndex, 'question_type', value as QuizQuestionType)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="mcq">Multiple Choice</SelectItem>
                                                <SelectItem value="true_false">True/False</SelectItem>
                                                <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Question Text</Label>
                                        <Textarea
                                            value={question.question_text}
                                            onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                                            placeholder="Enter your question here..."
                                            rows={2}
                                        />
                                    </div>

                                    {question.question_type === 'mcq' && (
                                        <div className="space-y-2">
                                            <Label>Options</Label>
                                            {question.options.map((option, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        placeholder={`Option ${oIndex + 1}`}
                                                    />
                                                    <input
                                                        type="radio"
                                                        name={`correct-${qIndex}`}
                                                        checked={question.correct_answer === option}
                                                        onChange={() => updateQuestion(qIndex, 'correct_answer', option)}
                                                        className="w-4 h-4"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {question.question_type === 'true_false' && (
                                        <div>
                                            <Label>Correct Answer</Label>
                                            <Select
                                                value={question.correct_answer}
                                                onValueChange={(value) => updateQuestion(qIndex, 'correct_answer', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">True</SelectItem>
                                                    <SelectItem value="false">False</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {question.question_type === 'fill_blank' && (
                                        <div>
                                            <Label>Correct Answer</Label>
                                            <Input
                                                value={question.correct_answer}
                                                onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                                                placeholder="Enter the correct answer"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Label>Points</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={question.points}
                                            onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                                            className="w-24"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => navigate(`/sop/${sopId}`)}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => saveQuizMutation.mutate()}
                    disabled={questions.length === 0 || saveQuizMutation.isPending}
                >
                    <Save className="h-4 w-4 mr-2" />
                    Save Quiz
                </Button>
            </div>
        </div>
    )
}
