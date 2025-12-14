import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Award, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { learningService } from '@/services/learningService'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import type { LearningQuiz } from '@/types/learning'
import { useAuth } from '@/contexts/AuthContext'

interface QuizComponentProps {
    quizId: string
    assignmentId?: string | null
    onComplete?: (result: any) => void
    onExit?: () => void
}

export function QuizComponent({ quizId, assignmentId, onComplete, onExit }: QuizComponentProps) {
    const { toast } = useToast()
    const { user, profile } = useAuth()

    const [quiz, setQuiz] = useState<LearningQuiz | null>(null)
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState<any>(null)

    // Quiz state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        if (quizId) {
            loadQuiz(quizId)
        }
    }, [quizId])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (timeLeft !== null && timeLeft > 0 && !submitted) {
            timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
            }, 1000)
        } else if (timeLeft === 0 && !submitted) {
            handleSubmit() // Auto submit
        }
        return () => clearInterval(timer)
    }, [timeLeft, submitted])

    const loadQuiz = async (id: string) => {
        try {
            setLoading(true)
            const data = await learningService.getQuiz(id)
            setQuiz(data)

            if (data.time_limit_minutes) {
                setTimeLeft(data.time_limit_minutes * 60)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load quiz',
                variant: 'destructive',
            })
            if (onExit) onExit()
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!quiz || !user || submitted) return

        try {
            setSubmitted(true) // Prevent double submit

            // Calculate Score
            let correctCount = 0
            const gradedAnswers = quiz.questions?.map(q => {
                const userAnswer = answers[q.question_id] || ''
                let isCorrect = false

                if (q.question?.question_type === 'mcq' || q.question?.question_type === 'mcq_multi') {
                    // Answer is now the Option ID
                    const selectedOption = q.question.options?.find(o => o.id === userAnswer)
                    isCorrect = !!selectedOption?.is_correct
                } else {
                    // For text/boolean, check correct_answer field
                    isCorrect = userAnswer.toLowerCase().trim() === q.question?.correct_answer?.toLowerCase().trim()
                }

                if (isCorrect) correctCount++
                return {
                    question_id: q.question_id,
                    answer: userAnswer,
                    correct: isCorrect
                }
            })

            const totalQuestions = quiz.questions?.length || 0
            const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
            const passed = percentage >= quiz.passing_score_percentage

            // Submit to backend
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: quiz.id,
                content_type: 'quiz',
                user_id: user.id,
                status: 'completed',
                progress_percentage: 100,
                score_percentage: Math.round(percentage),
                passed,
                completed_at: new Date().toISOString()
            })

            const finalResult = {
                score: Math.round(percentage),
                passed,
                correctCount,
                totalQuestions
            }

            setResult(finalResult)

            // 🏆 AUTO-GENERATE CERTIFICATE for 100% score!
            if (percentage === 100 && user && quiz) {
                try {
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Quiz Participant',
                        recipientEmail: user.email,
                        certificateType: 'sop_quiz',
                        title: quiz.title,
                        description: `Successfully completed ${quiz.title} with a perfect score.`,
                        completionDate: new Date(),
                        score: 100,
                        passingScore: quiz.passing_score_percentage
                    }

                    const certificate = await createCertificate(certificateData)

                    if (certificate) {
                        toast({
                            title: '🏆 Certificate Earned!',
                            description: `Congratulations! You've earned a certificate for "${quiz.title}"`,
                            variant: 'default'
                        })
                    }
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                    // Don't fail the quiz completion if certificate fails
                }
            }

            toast({
                title: passed ? 'Quiz Passed!' : 'Quiz Failed',
                description: `You scored ${Math.round(percentage)}%`,
                variant: passed ? 'default' : 'destructive'
            })

            if (onComplete) {
                onComplete(finalResult)
            }

        } catch (error) {
            console.error(error)
            toast({
                title: 'Error',
                description: 'Failed to submit quiz results',
                variant: 'destructive'
            })
            setSubmitted(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (loading || !quiz) {
        return <div className="p-8 text-center">Loading quiz...</div>
    }

    if (result) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pt-10">
                <Card className="text-center p-8">
                    <CardContent className="space-y-6">
                        {result.passed ? (
                            <div className="flex justify-center">
                                <div className="bg-green-100 p-4 rounded-full">
                                    <Award className="h-16 w-16 text-green-600" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="bg-red-100 p-4 rounded-full">
                                    <XCircle className="h-16 w-16 text-red-600" />
                                </div>
                            </div>
                        )}

                        <div>
                            <h2 className="text-3xl font-bold mb-2">
                                {result.passed ? 'Congratulations!' : 'Keep Trying'}
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                You scored {result.score}%
                                <span className="text-sm ml-2">
                                    (Pass mark: {quiz.passing_score_percentage}%)
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold">{result.correctCount}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Correct</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold">{result.totalQuestions}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
                            </div>
                        </div>

                        <div className="pt-6">
                            {onExit && (
                                <Button
                                    className="mr-2"
                                    onClick={onExit}
                                >
                                    Back
                                </Button>
                            )}
                            {!result.passed && (
                                <Button variant="outline" onClick={() => {
                                    setResult(null)
                                    setSubmitted(false)
                                    setAnswers({})
                                    setCurrentQuestionIndex(0)
                                    loadQuiz(quiz.id)
                                }}>
                                    Try Again
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = quiz.questions?.[currentQuestionIndex]

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm sticky top-20 z-10">
                <div>
                    <h1 className="font-bold text-lg">{quiz.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Question {currentQuestionIndex + 1} of {quiz.questions?.length}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {timeLeft !== null && (
                        <div className={`font-mono text-lg font-bold flex items-center gap-2 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : ''}`}>
                            <Clock className="h-4 w-4" />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                </div>
            </div>

            <Progress value={((currentQuestionIndex + 1) / (quiz.questions?.length || 1)) * 100} className="h-2" />

            {currentQuestion && (
                <Card>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-xl font-medium leading-relaxed">
                                {currentQuestion.question?.question_text}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.question?.question_type === 'mcq' && (
                                <RadioGroup
                                    value={answers[currentQuestion.question_id] || ''}
                                    onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                >
                                    {!currentQuestion.question.options?.length && (
                                        <p className="text-red-500">No options available for this question.</p>
                                    )}
                                    {currentQuestion.question.options?.map((opt, idx) => {
                                        const optionId = `q-${currentQuestion.question_id}-opt-${idx}`
                                        return (
                                            <div
                                                key={opt.id || idx}
                                                className={`flex items-center space-x-3 border p-4 rounded-lg transition-colors cursor-pointer ${answers[currentQuestion.question_id] === opt.id ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900' : 'hover:bg-slate-50'}`}
                                                onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                            >
                                                <RadioGroupItem value={opt.id} id={optionId} />
                                                <Label htmlFor={optionId} className="flex-1 cursor-pointer font-normal text-base text-slate-900 select-none">
                                                    {opt.option_text || <span className="text-red-400 italic">Empty Option Text</span>}
                                                </Label>
                                            </div>
                                        )
                                    })}
                                </RadioGroup>
                            )}

                            {currentQuestion.question?.question_type === 'true_false' && (
                                <RadioGroup
                                    value={answers[currentQuestion.question_id] || ''}
                                    onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                >
                                    <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-slate-50 transition-colors">
                                        <RadioGroupItem value="true" id="opt-true" />
                                        <Label htmlFor="opt-true" className="flex-1 cursor-pointer font-normal text-base">True</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-slate-50 transition-colors">
                                        <RadioGroupItem value="false" id="opt-false" />
                                        <Label htmlFor="opt-false" className="flex-1 cursor-pointer font-normal text-base">False</Label>
                                    </div>
                                </RadioGroup>
                            )}

                            {currentQuestion.question?.question_type === 'fill_blank' && (
                                <Input
                                    value={answers[currentQuestion.question_id] || ''}
                                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                    placeholder="Type your answer..."
                                    className="text-lg p-6"
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )
            }

            <div className="flex justify-between pt-4">
                <Button
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    Previous
                </Button>

                {currentQuestionIndex < (quiz.questions?.length || 0) - 1 ? (
                    <Button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitted}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Submit Quiz
                    </Button>
                )}
            </div>
        </div>
    )
}
