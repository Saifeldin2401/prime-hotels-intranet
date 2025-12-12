import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle2, XCircle, Award } from 'lucide-react'
import type { SOPQuizQuestion, SOPQuizAttempt } from '@/lib/types'
import { EnhancedCard } from '@/components/ui/enhanced-card'

export default function SOPQuizTaker() {
    const { sopId } = useParams<{ sopId: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)
    const [results, setResults] = useState<SOPQuizAttempt | null>(null)

    // Fetch quiz questions
    const { data: questions, isLoading } = useQuery({
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

    // Fetch SOP document for passing score
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

    const submitQuizMutation = useMutation({
        mutationFn: async () => {
            if (!questions || !user) throw new Error("Missing required data")

            // Calculate score
            const answersArray = questions.map(q => ({
                question_id: q.id,
                answer: answers[q.id] || '',
                correct: answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
            }))

            const score = answersArray.filter(a => a.correct).reduce((sum, a) => {
                const question = questions.find(q => q.id === a.question_id)
                return sum + (question?.points || 0)
            }, 0)

            const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
            const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0
            const passed = percentage >= (sopDocument?.passing_score || 70)

            const attempt = {
                sop_document_id: sopId!,
                user_id: user.id,
                score,
                total_points: totalPoints,
                percentage,
                passed,
                answers: answersArray,
                completed_at: new Date().toISOString()
            }

            const { data, error } = await supabase
                .from('sop_quiz_attempts')
                .insert([attempt])
                .select()
                .single()

            if (error) throw error
            return data as SOPQuizAttempt
        },
        onSuccess: (data) => {
            if (data) {
                setResults(data)
                setSubmitted(true)
                queryClient.invalidateQueries({ queryKey: ['sop-reading-logs'] })

                if (data.passed) {
                    toast({
                        title: 'Congratulations!',
                        description: `You passed with ${data.percentage.toFixed(1)}%`,
                    })
                } else {
                    toast({
                        title: 'Quiz not passed',
                        description: `You scored ${data.percentage.toFixed(1)}%. Passing score is ${sopDocument?.passing_score}%`,
                        variant: 'destructive'
                    })
                }
            }
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to submit quiz',
                variant: 'destructive'
            })
        }
    })

    if (isLoading) {
        return <div className="flex items-center justify-center h-64">Loading quiz...</div>
    }

    if (!questions || questions.length === 0) {
        return (
            <EnhancedCard>
                <div className="text-center py-12">
                    <p className="text-gray-600">No quiz questions available for this SOP.</p>
                    <Button onClick={() => navigate(`/sop/${sopId}`)} className="mt-4">
                        Back to SOP
                    </Button>
                </div>
            </EnhancedCard>
        )
    }

    if (submitted && results) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Quiz Results"
                    description="Your quiz has been submitted"
                />

                <EnhancedCard className="text-center">
                    <div className="py-12">
                        {results.passed ? (
                            <>
                                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-green-600 mb-2">Congratulations!</h2>
                                <p className="text-lg text-gray-700 mb-4">
                                    You passed the quiz with {results.percentage.toFixed(1)}%
                                </p>
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                    <Award className="h-5 w-5" />
                                    <span>Score: {results.score} / {results.total_points} points</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-red-600 mb-2">Quiz Not Passed</h2>
                                <p className="text-lg text-gray-700 mb-4">
                                    You scored {results.percentage.toFixed(1)}%
                                </p>
                                <p className="text-gray-600 mb-4">
                                    Passing score: {sopDocument?.passing_score}%
                                </p>
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                    <span>Score: {results.score} / {results.total_points} points</span>
                                </div>
                            </>
                        )}

                        <div className="flex items-center justify-center gap-3 mt-8">
                            <Button variant="outline" onClick={() => navigate(`/sop/${sopId}`)}>
                                Back to SOP
                            </Button>
                            {!results.passed && (
                                <Button onClick={() => window.location.reload()}>
                                    Retake Quiz
                                </Button>
                            )}
                        </div>
                    </div>
                </EnhancedCard>

                {/* Show answers */}
                <EnhancedCard>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-6">Review Answers</h3>
                        <div className="space-y-6">
                            {questions.map((question, index) => {
                                const userAnswer = results.answers.find(a => a.question_id === question.id)
                                const isCorrect = userAnswer?.correct || false

                                return (
                                    <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-start gap-3">
                                            {isCorrect ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 mt-1" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium mb-2 text-gray-900">
                                                    Question {index + 1}: {question.question_text}
                                                </p>
                                                <p className="text-sm text-gray-700">
                                                    <strong>Your answer:</strong> {userAnswer?.answer || 'No answer'}
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-sm text-gray-700 mt-1">
                                                        <strong>Correct answer:</strong> {question.correct_answer}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </EnhancedCard>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="SOP Quiz"
                description={`Passing score: ${sopDocument?.passing_score}%`}
            />

            <EnhancedCard>
                <div className="p-6 space-y-8">
                    {questions.map((question, index) => (
                        <div key={question.id} className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                            <Label className="text-base font-semibold text-hotel-navy">
                                Question {index + 1}: {question.question_text}
                                <span className="text-sm text-gray-500 ml-2 font-normal">({question.points} point{question.points > 1 ? 's' : ''})</span>
                            </Label>

                            {question.question_type === 'mcq' && question.options && (
                                <RadioGroup
                                    value={answers[question.id] || ''}
                                    onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                                >
                                    {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`q${question.id}-o${oIndex}`} />
                                            <Label htmlFor={`q${question.id}-o${oIndex}`} className="font-normal cursor-pointer">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {question.question_type === 'true_false' && (
                                <RadioGroup
                                    value={answers[question.id] || ''}
                                    onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="true" id={`q${question.id}-true`} />
                                        <Label htmlFor={`q${question.id}-true`} className="font-normal cursor-pointer">
                                            True
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="false" id={`q${question.id}-false`} />
                                        <Label htmlFor={`q${question.id}-false`} className="font-normal cursor-pointer">
                                            False
                                        </Label>
                                    </div>
                                </RadioGroup>
                            )}

                            {question.question_type === 'fill_blank' && (
                                <Input
                                    value={answers[question.id] || ''}
                                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                                    placeholder="Type your answer here..."
                                />
                            )}
                        </div>
                    ))}
                </div>
            </EnhancedCard>

            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => navigate(`/sop/${sopId}`)}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => submitQuizMutation.mutate()}
                    disabled={Object.keys(answers).length !== questions.length || submitQuizMutation.isPending}
                    className="bg-hotel-navy hover:bg-hotel-navy-light text-white"
                >
                    Submit Quiz
                </Button>
            </div>
        </div >
    )
}
