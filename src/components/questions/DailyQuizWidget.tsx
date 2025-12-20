/**
 * DailyQuizWidget
 * 
 * Dashboard widget for daily quiz challenge with streak tracking.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Zap,
    Trophy,
    Flame,
    CheckCircle,
    ChevronRight,
    Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDailyChallenge, useRecordAttempt, useUserQuestionStats, useDailyChallengeStatus } from '@/hooks/useQuestions'
import { QuestionRenderer } from './QuestionRenderer'
import { useTranslation } from 'react-i18next'

interface DailyQuizWidgetProps {
    className?: string
}

export function DailyQuizWidget({ className }: DailyQuizWidgetProps) {
    const { t } = useTranslation(['training', 'common'])
    const { data: questions, isLoading } = useDailyChallenge()
    const { data: userStats } = useUserQuestionStats()
    const { data: status, isLoading: statusLoading } = useDailyChallengeStatus()
    const recordAttempt = useRecordAttempt()

    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, { answer: string | string[]; isCorrect: boolean }>>({})
    const [isStarted, setIsStarted] = useState(false)

    const currentQuestion = questions?.[currentIndex]
    const isComplete = (questions && currentIndex >= questions.length && Object.keys(answers).length > 0) || status?.completed
    const correctCount = Object.values(answers).filter(a => a.isCorrect).length
    const totalCount = Object.keys(answers).length

    if (isLoading || statusLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!questions?.length) {
        return (
            <Card className={cn('bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200', className)}>
                <CardContent className="pt-6 text-center">
                    <Trophy className="h-10 w-10 text-purple-400 mx-auto mb-3" />
                    <p className="text-sm text-purple-700">
                        {t('noQuestionsToday')}
                    </p>
                </CardContent>
            </Card>
        )
    }

    const handleAnswer = async (answer: string | string[]) => {
        if (!currentQuestion) return

        try {
            const result = await recordAttempt.mutateAsync({
                question_id: currentQuestion.id,
                selected_answer: typeof answer === 'string' ? answer : undefined,
                selected_options: Array.isArray(answer) ? answer : undefined,
                context_type: 'daily_challenge'
            })

            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: { answer, isCorrect: result.isCorrect }
            }))
        } catch (error) {
            console.error('Failed to record attempt:', error)
        }
    }

    const handleNext = () => {
        setCurrentIndex(prev => prev + 1)
    }

    // Start screen
    if (!isStarted && !status?.completed) {
        return (
            <Card className={cn('bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200', className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        {t('dailyChallenge')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">
                                {questions.length} {t('questionsToday')}
                            </p>
                            {userStats && userStats.recentStreak > 0 && (
                                <div className="flex items-center gap-1 text-orange-600">
                                    <Flame className="h-4 w-4" />
                                    <span className="text-sm font-medium">{userStats.recentStreak} {t('dayStreak')}</span>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            {userStats && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <Star className="h-4 w-4" />
                                    <span className="text-sm font-medium">{t('analytics.accuracy', { percent: userStats.accuracyRate.toFixed(0) })}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsStarted(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                        {t('startChallenge')}
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Completion screen
    if (isComplete) {
        // If we have answers (just finished), show score. 
        // If already completed in previous session (no local answers), show "Come back tomorrow".
        const justFinished = Object.keys(answers).length > 0
        const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
        const isPerfect = correctCount === totalCount && totalCount > 0

        return (
            <Card className={cn(
                'bg-gradient-to-br border-2',
                justFinished
                    ? (isPerfect
                        ? 'from-yellow-50 to-amber-50 border-yellow-300'
                        : percentage >= 70
                            ? 'from-green-50 to-emerald-50 border-green-300'
                            : 'from-blue-50 to-indigo-50 border-blue-300')
                    : 'from-gray-50 to-slate-50 border-gray-200',
                className
            )}>
                <CardContent className="pt-6 text-center">
                    <div className={cn(
                        'inline-flex items-center justify-center h-16 w-16 rounded-full mb-3',
                        justFinished
                            ? (isPerfect ? 'bg-yellow-100' : percentage >= 70 ? 'bg-green-100' : 'bg-blue-100')
                            : 'bg-gray-100'
                    )}>
                        {justFinished ? (
                            isPerfect ? (
                                <Trophy className="h-8 w-8 text-yellow-600" />
                            ) : (
                                <CheckCircle className={cn(
                                    'h-8 w-8',
                                    percentage >= 70 ? 'text-green-600' : 'text-blue-600'
                                )} />
                            )
                        ) : (
                            <CheckCircle className="h-8 w-8 text-gray-500" />
                        )}
                    </div>

                    <h3 className="text-lg font-bold mb-1">
                        {justFinished
                            ? (isPerfect ? t('perfectScore') : percentage >= 70 ? t('wellDone') : t('goodEffort'))
                            : t('dailyChallengeComplete')
                        }
                    </h3>

                    {justFinished && (
                        <div className="flex items-center justify-center gap-4 mb-3">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-gray-900">
                                    {correctCount}/{totalCount}
                                </p>
                                <p className="text-xs text-gray-500">{t('correct')}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-gray-900">
                                    {percentage}%
                                </p>
                                <p className="text-xs text-gray-500">{t('score')}</p>
                            </div>
                        </div>
                    )}

                    {userStats && userStats.recentStreak > 0 && (
                        <div className="flex items-center justify-center gap-1 text-orange-600 mb-3 mt-4">
                            <Flame className="h-5 w-5" />
                            <span className="font-medium">{userStats.recentStreak} {t('dayStreak')}</span>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 mt-2">
                        {justFinished
                            ? t('comeBackTomorrow')
                            : t('alreadyCompletedToday')}
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Question screen
    return (
        <Card className={cn('border-purple-200', className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        {t('dailyChallenge')}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {currentIndex + 1} / {questions.length}
                    </Badge>
                </div>
                <Progress
                    value={((currentIndex + 1) / questions.length) * 100}
                    className="h-1 mt-2 [&>div]:bg-purple-500"
                />
            </CardHeader>
            <CardContent className="pt-3">
                {currentQuestion && (
                    <QuestionRenderer
                        question={currentQuestion}
                        onAnswer={handleAnswer}
                        onNext={handleNext}
                        previousAnswer={answers[currentQuestion.id]?.answer}
                        isCorrect={answers[currentQuestion.id]?.isCorrect}
                        showFeedback
                        showHint
                        compact
                    />
                )}
            </CardContent>
        </Card>
    )
}
