import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Award, Clock, ArrowRight, HelpCircle, ArrowLeft, PenBox } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface QuizComponentProps {
    quizId: string
    assignmentId?: string | null
    onComplete?: (result: any) => void
    onExit?: () => void
    certificateEnabled?: boolean
}

export function QuizComponent({ quizId, assignmentId, onComplete, onExit, certificateEnabled = true }: QuizComponentProps) {
    const { toast } = useToast()
    const { user, profile } = useAuth()
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar'

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
                title: t('common.error'),
                description: t('training:quizzes.player.load_error'),
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
                totalQuestions,
                gradedAnswers // Add detailed answers for review
            }

            setResult(finalResult)

            // 🏆 AUTO-GENERATE CERTIFICATE when user PASSES the quiz
            if (passed && user && quiz && certificateEnabled) {
                try {
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Quiz Participant',
                        recipientEmail: user.email,
                        certificateType: 'sop_quiz',
                        title: quiz.title,
                        description: `Successfully completed ${quiz.title} with a score of ${Math.round(percentage)}%.`,
                        completionDate: new Date(),
                        score: Math.round(percentage),
                        passingScore: quiz.passing_score_percentage
                    }

                    const certificate = await createCertificate(certificateData)

                    if (certificate) {
                        toast({
                            title: t('training:quizzes.player.certificate_earned'),
                            description: t('training:quizzes.player.certificate_desc', { title: quiz.title }),
                            variant: 'default'
                        })
                    }
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                    // Don't fail the quiz completion if certificate fails
                }
            }

            toast({
                title: passed ? t('training:quizzes.player.passed_toast_title') : t('training:quizzes.player.failed_toast_title'),
                description: t('training:quizzes.player.score_toast_desc', { score: Math.round(percentage) }),
                variant: passed ? 'default' : 'destructive'
            })

            if (onComplete) {
                onComplete(finalResult)
            }

        } catch (error) {
            console.error(error)
            toast({
                title: t('common.error'),
                description: t('training:quizzes.player.submit_error'),
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
        return <div className="p-8 text-center">{t('training:quizzes.player.loading')}</div>
    }

    if (result) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto space-y-6 pt-10"
            >
                <Card className="text-center p-8 border-2 border-hotel-gold/20 shadow-xl bg-white/50 backdrop-blur-sm">
                    <CardContent className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={result.passed ? 'passed' : 'failed'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-center"
                            >
                                {result.passed ? (
                                    <div className="bg-hotel-gold/10 p-6 rounded-2xl border-2 border-hotel-gold/30">
                                        <Award className="h-20 w-20 text-hotel-gold-dark" />
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200">
                                        <XCircle className="h-20 w-20 text-red-500" />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-hotel-navy">
                                {result.passed ? t('training:quizzes.player.success_passed') : t('training:quizzes.player.failed_title')}
                            </h2>
                            <p className="text-muted-foreground text-base md:text-lg">
                                {t('training:quizzes.player.score_text', { score: result.score })}
                                <span className="text-sm ml-2 font-medium bg-hotel-navy/5 px-2 py-1 rounded">
                                    {t('training:quizzes.player.pass_mark', { score: quiz.passing_score_percentage })}
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-sm mx-auto">
                            <div className="bg-white/80 p-3 md:p-5 rounded-2xl border border-hotel-navy/10 shadow-sm">
                                <div className="text-2xl md:text-3xl font-bold text-hotel-navy">{result.correctCount}</div>
                                <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                                    {t('training:quizzes.player.correct_answers')}
                                </div>
                            </div>
                            <div className="bg-white/80 p-3 md:p-5 rounded-2xl border border-hotel-navy/10 shadow-sm">
                                <div className="text-2xl md:text-3xl font-bold text-hotel-navy">{result.totalQuestions}</div>
                                <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                                    {t('training:quizzes.player.total_questions')}
                                </div>
                            </div>
                        </div>

                        {/* REVIEW ANSWERS SECTION */}
                        <div className="text-left space-y-4 mt-8 pt-6 border-t border-hotel-gold/20">
                            <h3 className={cn(
                                "font-bold text-xl text-hotel-navy mb-4",
                                isRTL && "text-right"
                            )}>
                                {t('training:quizzes.player.review_answers')}
                            </h3>
                            {result.gradedAnswers?.map((answer: any, index: number) => {
                                const question = quiz.questions?.find(q => q.question_id === answer.question_id)?.question
                                if (!question) return null

                                const isMCQ = question.question_type === 'mcq'
                                const userAnswerText = isMCQ
                                    ? question.options?.find(o => o.id === answer.answer)?.option_text
                                    : answer.answer

                                const correctAnswerText = isMCQ
                                    ? question.options?.find(o => o.is_correct)?.option_text
                                    : question.correct_answer

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={cn(
                                            "p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all",
                                            answer.correct
                                                ? 'bg-emerald-50/50 border-emerald-100'
                                                : 'bg-red-50/50 border-red-100',
                                            isRTL && "text-right"
                                        )}
                                    >
                                        <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
                                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-inherit text-sm font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-2 md:space-y-3">
                                                <p className="font-bold text-hotel-navy text-base md:text-lg">{question.question_text}</p>

                                                <div className="text-xs md:text-sm space-y-1 md:space-y-2">
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        answer.correct ? 'text-emerald-700' : 'text-red-700',
                                                        isRTL && "flex-row-reverse"
                                                    )}>
                                                        <strong className="shrink-0">{t('training:quizzes.player.your_answer')}</strong>
                                                        <span className="font-medium">{userAnswerText || '(No Answer)'}</span>
                                                    </div>
                                                    {!answer.correct && (
                                                        <div className={cn(
                                                            "flex items-center gap-2 text-emerald-700",
                                                            isRTL && "flex-row-reverse"
                                                        )}>
                                                            <strong className="shrink-0">{t('training:quizzes.player.correct_answer')}</strong>
                                                            <span className="font-medium italic">{correctAnswerText}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {question.explanation && (
                                                    <div className="mt-2 md:mt-4 p-3 md:p-4 bg-white/60 rounded-xl border border-white text-xs text-slate-600 leading-relaxed italic relative">
                                                        <div className={cn(
                                                            "absolute top-0 opacity-10",
                                                            isRTL ? "left-4" : "right-4"
                                                        )}>
                                                            <HelpCircle className="h-6 w-6 md:h-8 md:w-8" />
                                                        </div>
                                                        <strong>{t('training:quizzes.player.explanation')}</strong> {question.explanation}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 pt-1">
                                                {answer.correct ? (
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                ) : (
                                                    <XCircle className="h-6 w-6 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <div className="pt-8 flex flex-wrap justify-center gap-4">
                            {onExit && (
                                <Button
                                    onClick={onExit}
                                    className="bg-hotel-navy hover:bg-hotel-navy-dark px-8 py-6 rounded-xl text-lg transition-all hover:scale-105"
                                >
                                    {t('training:quizzes.player.back')}
                                </Button>
                            )}
                            {!result.passed && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setResult(null)
                                        setSubmitted(false)
                                        setAnswers({})
                                        setCurrentQuestionIndex(0)
                                        loadQuiz(quiz.id)
                                    }}
                                    className="border-hotel-gold text-hotel-gold-dark hover:bg-hotel-gold/10 px-8 py-6 rounded-xl text-lg transition-all"
                                >
                                    {t('training:quizzes.player.try_again')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    const currentQuestion = quiz.questions?.[currentQuestionIndex]

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-10">
            {/* Elegant Question Info Bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 py-2"
            >
                <div className={cn("space-y-1", isRTL && "text-right")}>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-hotel-gold-dark uppercase mb-1">
                        {t('training:quizzes.player.question_counter', {
                            current: currentQuestionIndex + 1,
                            total: quiz.questions?.length
                        })}
                    </p>
                    <h1 className="text-xl md:text-2xl font-bold text-hotel-navy">{quiz.title}</h1>
                </div>

                <div className="flex items-center gap-6">
                    {timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-3 px-3 md:px-5 py-2 md:py-3 rounded-2xl bg-white border-2 shadow-sm transition-all animate-in fade-in slide-in-from-right-4",
                            timeLeft < 60 ? 'border-red-200 text-red-600' : 'border-hotel-gold/30 text-hotel-navy'
                        )}>
                            <Clock className={cn("h-4 w-4 md:h-5 md:w-5", timeLeft < 60 && "animate-pulse")} />
                            <span className="font-mono text-lg md:text-xl font-bold tracking-tight">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Premium Progress Bar */}
            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-hotel-gold-dark via-hotel-gold to-hotel-gold-light"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / (quiz.questions?.length || 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                />
            </div>

            <AnimatePresence mode="wait">
                {currentQuestion && (
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-md rounded-2xl md:rounded-3xl overflow-hidden ring-1 ring-hotel-navy/5">
                            <CardContent className="p-5 md:p-10 space-y-6 md:space-y-10">
                                <div className={cn("space-y-4 md:space-y-6", isRTL && "text-right")}>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-hotel-navy text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                                        <HelpCircle className="h-3 w-3" />
                                        {t('knowledgeCheck')}
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-bold text-hotel-navy leading-tight">
                                        {currentQuestion.question?.question_text}
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {currentQuestion.question?.question_type === 'mcq' && (
                                        <RadioGroup
                                            value={answers[currentQuestion.question_id] || ''}
                                            onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.question_id]: val })}
                                            className="grid gap-3"
                                        >
                                            {!currentQuestion.question.options?.length && (
                                                <p className="text-red-500 p-4 border-2 border-dashed rounded-xl">{t('training:quizzes.player.no_options')}</p>
                                            )}
                                            {currentQuestion.question.options?.map((opt, idx) => {
                                                const isSelected = answers[currentQuestion.question_id] === opt.id
                                                return (
                                                    <motion.div
                                                        key={opt.id || idx}
                                                        whileHover={{ scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={cn(
                                                            "group flex items-center gap-3 md:gap-4 border-2 p-4 md:p-6 rounded-xl md:rounded-2xl transition-all cursor-pointer",
                                                            isSelected
                                                                ? 'bg-hotel-navy/5 border-hotel-gold shadow-lg ring-1 ring-hotel-gold'
                                                                : 'bg-white border-slate-100 hover:border-hotel-gold/50 hover:shadow-md'
                                                        )}
                                                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: opt.id })}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 md:h-6 md:w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                            isSelected ? "border-hotel-gold bg-hotel-gold" : "border-slate-200 group-hover:border-hotel-gold/50"
                                                        )}>
                                                            {isSelected && <div className="h-2 w-2 rounded-full bg-hotel-navy" />}
                                                        </div>
                                                        <span className={cn(
                                                            "flex-1 text-base md:text-lg transition-colors",
                                                            isSelected ? "text-hotel-navy font-bold" : "text-slate-600 group-hover:text-hotel-navy",
                                                            isRTL && "text-right"
                                                        )}>
                                                            {opt.option_text || <span className="text-red-300 italic">{t('training:quizzes.player.empty_option')}</span>}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })}
                                        </RadioGroup>
                                    )}

                                    {currentQuestion.question?.question_type === 'true_false' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {['true', 'false'].map((option) => {
                                                const isSelected = answers[currentQuestion.question_id] === option
                                                return (
                                                    <motion.button
                                                        key={option}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: option })}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all gap-4",
                                                            isSelected
                                                                ? 'bg-hotel-navy border-hotel-gold text-white shadow-2xl'
                                                                : 'bg-white border-slate-100 text-slate-500 hover:border-hotel-gold/50'
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                            isSelected ? "bg-hotel-gold text-hotel-navy" : "bg-slate-50 text-slate-400 group-hover:bg-hotel-gold/10"
                                                        )}>
                                                            {option === 'true' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                                        </div>
                                                        <span className="text-xl font-bold uppercase tracking-widest">
                                                            {t(`training:quizzes.player.${option}_label`)}
                                                        </span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.question?.question_type === 'fill_blank' && (
                                        <div className="relative group">
                                            <Input
                                                value={answers[currentQuestion.question_id] || ''}
                                                onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                                                placeholder={t('training:quizzes.player.type_answer')}
                                                className={cn(
                                                    "text-lg md:text-2xl p-6 md:p-10 h-auto rounded-2xl md:rounded-3xl border-2 transition-all bg-white/50 backdrop-blur-sm",
                                                    "focus:ring-hotel-gold focus:border-hotel-gold placeholder:text-slate-300 border-slate-100 shadow-inner",
                                                    isRTL && "text-right"
                                                )}
                                            />
                                            <div className={cn(
                                                "absolute bottom-4 opacity-10 pointer-events-none",
                                                isRTL ? "left-6" : "right-6"
                                            )}>
                                                <PenBox className="h-10 w-10 text-hotel-navy" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Navigation Controls */}
            <div className={cn(
                "flex items-center justify-between pt-6 px-2",
                isRTL && "flex-row-reverse"
            )}>
                <Button
                    variant="ghost"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="text-hotel-navy hover:bg-hotel-navy/5 hover:text-hotel-navy px-4 md:px-6 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl transition-all disabled:opacity-30"
                >
                    <ArrowLeft className={cn("h-4 w-4 md:h-5 md:w-5 md:mr-3", isRTL && "rotate-180")} />
                    <span className="hidden xs:inline font-bold tracking-wide uppercase text-[10px] md:text-xs">{t('training:quizzes.player.previous')}</span>
                </Button>

                {currentQuestionIndex < (quiz.questions?.length || 0) - 1 ? (
                    <Button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="bg-hotel-navy hover:bg-hotel-navy-dark text-white px-6 md:px-8 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 group"
                    >
                        <span className="font-bold tracking-widest uppercase text-[10px] md:text-xs mr-2 md:mr-3">{t('training:quizzes.player.next')}</span>
                        <ArrowRight className={cn("h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1", isRTL && "rotate-180")} />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitted}
                        className="bg-gradient-to-r from-hotel-navy to-hotel-navy-dark hover:from-hotel-gold-dark hover:to-hotel-gold hover:text-hotel-navy text-white px-6 md:px-10 py-4 md:py-6 h-auto rounded-xl md:rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 font-bold uppercase tracking-widest text-[10px] md:text-xs"
                    >
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 md:mr-3" />
                        <span>{t('training:quizzes.player.submit')}</span>
                    </Button>
                )}
            </div>
        </div>
    )
}
