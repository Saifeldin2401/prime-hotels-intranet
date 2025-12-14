import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Loader2, Save, ArrowLeft, Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { useQuestion, useCreateQuestion, useUpdateQuestion } from '@/hooks/useQuestions'
import { useToast } from '@/components/ui/use-toast'
import type { QuestionDifficulty, QuestionType } from '@/types/questions'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from '@/types/questions'

const questionSchema = z.object({
    question_text: z.string().min(5, 'Question text must be at least 5 characters'),
    question_type: z.enum(['mcq', 'mcq_multi', 'true_false', 'fill_blank', 'scenario']),
    difficulty_level: z.enum(['easy', 'medium', 'hard', 'expert']),
    status: z.enum(['draft', 'published', 'pending_review']),
    points: z.coerce.number().min(1),
    estimated_time_seconds: z.coerce.number().min(5),
    explanation: z.string().optional(),
    hint: z.string().optional(),
    correct_answer: z.string().optional(), // For fill_blank and true_false
    options: z.array(z.object({
        option_text: z.string().min(1, 'Option text is required'),
        is_correct: z.boolean(),
        feedback: z.string().optional(),
        display_order: z.number()
    })).optional()
})

type QuestionFormValues = z.infer<typeof questionSchema>

export function QuestionEditor() {
    const { t } = useTranslation(['knowledge', 'common'])
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const isEditMode = !!id

    const { data: question, isLoading: isLoadingQuestion } = useQuestion(id || '')
    const createQuestion = useCreateQuestion()
    const updateQuestion = useUpdateQuestion()

    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(questionSchema) as any,
        defaultValues: {
            question_text: '',
            question_type: 'mcq',
            difficulty_level: 'medium',
            status: 'published',
            points: 1,
            estimated_time_seconds: 30,
            explanation: '',
            hint: '',
            options: [
                { option_text: '', is_correct: false, display_order: 1 },
                { option_text: '', is_correct: false, display_order: 2 }
            ]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'options'
    })

    const watchedType = form.watch('question_type')

    useEffect(() => {
        if (question) {
            form.reset({
                question_text: question.question_text,
                question_type: question.question_type,
                difficulty_level: question.difficulty_level,
                status: question.status as any,
                points: question.points,
                estimated_time_seconds: question.estimated_time_seconds,
                explanation: question.explanation || '',
                hint: question.hint || '',
                correct_answer: question.correct_answer,
                options: question.options?.map(o => ({
                    option_text: o.option_text,
                    is_correct: o.is_correct,
                    feedback: o.feedback || '',
                    display_order: o.display_order
                }))
            })
        }
    }, [question, form])

    // Update points/time defaults based on difficulty
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'difficulty_level') {
                const difficulty = value.difficulty_level as QuestionDifficulty
                if (difficulty) {
                    const config = DIFFICULTY_CONFIG[difficulty]
                    form.setValue('points', config.points)
                }
            }
        })
        return () => subscription.unsubscribe()
    }, [form])

    const onSubmit = (data: QuestionFormValues) => {
        // Validation specific to type
        if (data.question_type === 'mcq' || data.question_type === 'mcq_multi') {
            if (!data.options || data.options.length < 2) {
                form.setError('root', { message: 'At least 2 options are required for Multiple Choice questions' })
                return
            }
            const hasCorrect = data.options.some(o => o.is_correct)
            if (!hasCorrect) {
                form.setError('root', { message: 'At least one correct option is required' })
                return
            }
        }

        if (data.question_type === 'mcq' && data.options) {
            const correctCount = data.options.filter(o => o.is_correct).length
            if (correctCount > 1) {
                form.setError('root', { message: 'Single Choice MCQ can only have one correct answer' })
                return
            }
        }

        if (data.question_type === 'fill_blank' || data.question_type === 'true_false') {
            if (!data.correct_answer) {
                form.setError('correct_answer', { message: 'Correct answer is required' })
                return
            }
        }

        const payload = {
            ...data,
            // Clean up unrelated fields based on type
            options: (data.question_type === 'mcq' || data.question_type === 'mcq_multi') ? data.options : [],
            correct_answer: (data.question_type === 'fill_blank' || data.question_type === 'true_false') ? data.correct_answer : undefined
        } as any // Cast to any to resolve type mismatch with QuestionFormData

        if (isEditMode) {
            updateQuestion.mutate({
                id: id!,
                formData: payload
            }, {
                onSuccess: () => {
                    toast({
                        title: 'Question Updated',
                        description: 'The question has been saved successfully.',
                    })
                    navigate('/questions')
                },
                onError: (error) => {
                    toast({
                        title: 'Error',
                        description: 'Failed to update question. Please try again.',
                        variant: 'destructive'
                    })
                }
            })
        } else {
            createQuestion.mutate({
                formData: payload
            }, {
                onSuccess: () => {
                    toast({
                        title: 'Question Created',
                        description: 'The question has been saved successfully.',
                    })
                    navigate('/questions')
                },
                onError: (error) => {
                    toast({
                        title: 'Error',
                        description: 'Failed to create question. Please try again.',
                        variant: 'destructive'
                    })
                }
            })
        }
    }

    if (isEditMode && isLoadingQuestion) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/questions')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Question' : 'Create Question'}</h1>
                    <p className="text-gray-500">Define the question content, options, and settings</p>
                </div>
            </div>

            <Form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <FormField
                                control={form.control}
                                name="question_text"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question Text</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Enter your question here..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="question_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(QUESTION_TYPE_CONFIG).map(([key, config]) => (
                                                        <SelectItem key={key} value={key}>
                                                            <div className="flex items-center gap-2">
                                                                {config.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="difficulty_level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Difficulty</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select difficulty" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                                                        <SelectItem key={key} value={key}>
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={`bg-${config.color}-100 text-${config.color}-700 hover:bg-${config.color}-200`}>
                                                                    {config.label}
                                                                </Badge>
                                                                <span className="text-xs text-gray-500">({config.points} pts)</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="pending_review">Pending Review</SelectItem>
                                                    <SelectItem value="published">Published</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Draft questions are not visible in quizzes</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="points"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Points</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormDescription>Points awarded for correct answer</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="estimated_time_seconds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estimated Time (Seconds)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Answer Configuration Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Answer Configuration</CardTitle>
                            <CardDescription>
                                {QUESTION_TYPE_CONFIG[watchedType]?.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(watchedType === 'mcq' || watchedType === 'mcq_multi') && (
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-gray-50/50">
                                            <div className="mt-3 cursor-grab text-gray-400">
                                                <GripVertical className="h-4 w-4" />
                                            </div>

                                            <div className="flex-1 space-y-4">
                                                <div className="flex gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`options.${index}.option_text`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl>
                                                                    <Input placeholder={`Option ${index + 1}`} {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`options.${index}.is_correct`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center space-x-2 space-y-0 pt-2">
                                                                <FormControl>
                                                                    <Switch
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-sm font-normal text-muted-foreground">
                                                                    Correct
                                                                </FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 h-10 w-10"
                                                        onClick={() => remove(index)}
                                                        disabled={fields.length <= 2}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name={`options.${index}.feedback`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input placeholder="Feedback if chosen (optional)" className="text-sm" {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({ option_text: '', is_correct: false, display_order: fields.length + 1 })}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Option
                                    </Button>

                                    {form.formState.errors.root && (
                                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {form.formState.errors.root.message}
                                        </div>
                                    )}
                                </div>
                            )}

                            {watchedType === 'true_false' && (
                                <FormField
                                    control={form.control}
                                    name="correct_answer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Correct Answer</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select correct answer" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="true">True</SelectItem>
                                                    <SelectItem value="false">False</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {watchedType === 'fill_blank' && (
                                <FormField
                                    control={form.control}
                                    name="correct_answer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Correct Answer</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter the exact correct text match" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Case-insensitive matching will be applied.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Feedback & Support</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="explanation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Explanation (shown after answering)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Explain why the answer is correct..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="hint"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hint (optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Provide a helpful hint..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" type="button" onClick={() => navigate('/questions')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Question
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    )
}

export default QuestionEditor
