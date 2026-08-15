import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Loader2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface EmployeeTrainingHistoryProps {
  userId?: string
}

interface QuizReviewItem {
  questionId?: string
  questionText?: string
  selectedAnswer?: string
  correctAnswer?: string
  correct?: boolean
  explanation?: string
}

interface QuizResultRecord {
  quizId?: string
  quizTitle?: string
  score?: number
  passed?: boolean
  correctCount?: number
  totalQuestions?: number
  completedAt?: string
  reviewItems?: QuizReviewItem[]
}

interface TrainingProgressItem {
  id: string
  training_id: string
  status: string
  progress_percentage: number
  score_percentage: number | null
  passed: boolean | null
  completed_at: string | null
  updated_at: string | null
  module_title?: string
  module_category?: string
  quiz_results: QuizResultRecord[]
}

export default function EmployeeTrainingHistory({ userId }: EmployeeTrainingHistoryProps) {
  const { t } = useTranslation(['training', 'common', 'profile'])
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)

  const { data: trainingHistory = [], isLoading, error } = useQuery({
    queryKey: ['employee-training-history', userId],
    queryFn: async (): Promise<TrainingProgressItem[]> => {
      if (!userId) return []

      // 1. Fetch training progress for modules
      const { data: progressRows, error: progressError } = await supabase
        .from('training_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lp_content_type', 'module')
        .order('updated_at', { ascending: false })

      if (progressError) throw progressError
      if (!progressRows || progressRows.length === 0) return []

      // 2. Fetch module titles
      const moduleIds = Array.from(new Set(progressRows.map((r) => r.training_id).filter(Boolean)))
      const { data: moduleRows } = await supabase
        .from('training_modules')
        .select('id, title, category')
        .in('id', moduleIds)

      const moduleMap = new Map((moduleRows || []).map((m) => [m.id, m]))

      // 3. Fetch unified quiz sessions for this user with question attempts
      const { data: sessions } = await supabase
        .from('unified_quiz_sessions')
        .select(`
          id,
          user_id,
          quiz_entity_id,
          context_entity_id,
          score_percentage,
          correct_answers,
          total_questions,
          passed,
          completed_at,
          unified_question_attempts (
            id,
            question_id,
            selected_answer,
            selected_options,
            is_correct,
            time_spent_seconds,
            question:learning_questions (
              id,
              question_text,
              explanation
            )
          )
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      const sessionsByModuleOrQuiz = new Map<string, any[]>()
      ;(sessions || []).forEach((sess) => {
        const key = sess.context_entity_id || sess.quiz_entity_id
        if (key) {
          const list = sessionsByModuleOrQuiz.get(key) || []
          list.push(sess)
          sessionsByModuleOrQuiz.set(key, list)
        }
      })

      return progressRows.map((row) => {
        const moduleInfo = moduleMap.get(row.training_id)
        const metadata = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata))
          ? (row.metadata as Record<string, any>)
          : {}

        const rawQuizResults = metadata.quiz_results_by_id || {}
        const quizResultsList: QuizResultRecord[] = []

        // Extract from metadata embedded during training session
        if (rawQuizResults && typeof rawQuizResults === 'object') {
          Object.values(rawQuizResults as Record<string, any>).forEach((qr) => {
            if (qr && typeof qr === 'object') {
              quizResultsList.push({
                quizId: qr.quizId || qr.quiz_id,
                quizTitle: qr.quizTitle || qr.quiz_title || t('training:knowledgeCheck', 'Knowledge Check'),
                score: typeof qr.score === 'number' ? qr.score : undefined,
                passed: qr.passed,
                correctCount: qr.correctCount ?? qr.correct_count,
                totalQuestions: qr.totalQuestions ?? qr.total_questions,
                completedAt: qr.completedAt || qr.completed_at || row.completed_at,
                reviewItems: Array.isArray(qr.reviewItems)
                  ? qr.reviewItems
                  : Array.isArray(qr.review_items)
                  ? qr.review_items
                  : [],
              })
            }
          })
        }

        // Merge from unified_quiz_sessions if available
        const moduleSessions = sessionsByModuleOrQuiz.get(row.training_id) || []
        moduleSessions.forEach((sess) => {
          const existing = quizResultsList.find((q) => q.quizId === sess.quiz_id)
          const sessionReviews: QuizReviewItem[] = (sess.unified_question_attempts || []).map((att: any) => ({
            questionId: att.question_id,
            questionText: att.question?.question_text || t('training:question', 'Question'),
            selectedAnswer: att.selected_answer || (Array.isArray(att.selected_options) ? att.selected_options.join(', ') : '—'),
            correctAnswer: '—',
            correct: att.is_correct === true,
            explanation: att.question?.explanation,
          }))

          if (existing) {
            if (!existing.reviewItems || existing.reviewItems.length === 0) {
              existing.reviewItems = sessionReviews
            }
            if (existing.score === undefined && typeof sess.score_percentage === 'number') {
              existing.score = sess.score_percentage
            }
          } else if (sessionReviews.length > 0) {
            quizResultsList.push({
              quizId: sess.quiz_id,
              quizTitle: t('training:knowledgeCheck', 'Knowledge Check'),
              score: sess.score_percentage,
              passed: sess.passed,
              correctCount: sess.correct_answers,
              totalQuestions: sess.total_questions,
              completedAt: sess.completed_at || sess.started_at,
              reviewItems: sessionReviews,
            })
          }
        })

        return {
          id: row.id,
          training_id: row.training_id,
          status: row.status,
          progress_percentage: row.status === 'completed' ? 100 : (row.progress_percentage || 0),
          score_percentage: row.score_percentage,
          passed: row.passed,
          completed_at: row.completed_at,
          updated_at: row.updated_at,
          module_title: moduleInfo?.title || t('training:untitledModule', 'Training Module'),
          module_category: moduleInfo?.category,
          quiz_results: quizResultsList,
        }
      })
    },
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
        </CardContent>
      </Card>
    )
  }

  if (error || trainingHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('training:trainingHistory', 'Training History & Quiz Recordings')}</CardTitle>
          <CardDescription>
            {t('training:trainingHistoryDesc', 'Completed modules, scores, and question-level responses')}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">{t('training:noTrainingHistory', 'No training records found for this user.')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-hotel-navy flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-hotel-gold" />
                {t('training:trainingHistory', 'Training History & Quiz Recordings')}
              </CardTitle>
              <CardDescription>
                {t('training:trainingHistoryDesc', 'Detailed module completions, scores, and recorded question answers')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-hotel-gold/30 text-hotel-gold">
              {trainingHistory.length} {trainingHistory.length === 1 ? t('training:module', 'Module') : t('training:modules', 'Modules')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {trainingHistory.map((item) => {
            const isCompleted = item.status === 'completed'
            const isExpanded = expandedQuizId === item.id

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-hotel-gold/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-hotel-navy text-base">{item.module_title}</h4>
                      {item.module_category && (
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {item.module_category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.completed_at && (
                        <span>
                          {t('training:completedOn', 'Completed')}: {format(new Date(item.completed_at), 'MMMM d, yyyy')}
                        </span>
                      )}
                      {item.score_percentage !== null && (
                        <span className="font-medium text-slate-700">
                          {t('training:score', 'Score')}: {item.score_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={isCompleted ? 'default' : 'secondary'} className="gap-1">
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          {t('training:completed', 'Completed')}
                        </>
                      ) : (
                        t('training:inProgress', 'In Progress')
                      )}
                    </Badge>
                    {item.passed !== null && (
                      <Badge variant={item.passed ? 'outline' : 'destructive'} className={item.passed ? 'border-green-500 text-green-700' : ''}>
                        {item.passed ? t('training:passed', 'Passed') : t('training:failed', 'Failed')}
                      </Badge>
                    )}
                    {item.quiz_results.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuizId(isExpanded ? null : item.id)}
                        className="text-xs text-hotel-gold hover:text-hotel-gold-dark gap-1"
                      >
                        <FileQuestion className="h-3.5 w-3.5" />
                        {isExpanded ? t('training:hideAnswers', 'Hide Answers') : t('training:viewAnswers', 'View Q&A')}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ms-1" /> : <ChevronDown className="h-3.5 w-3.5 ms-1" />}
                      </Button>
                    )}
                  </div>
                </div>

                {!isCompleted && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t('training:progress', 'Progress')}</span>
                      <span>{item.progress_percentage}%</span>
                    </div>
                    <Progress value={item.progress_percentage} className="h-1.5" />
                  </div>
                )}

                {/* Expandable Quiz Recordings */}
                {isExpanded && item.quiz_results.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
                    <h5 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      {t('training:questionRecordings', 'Recorded Quiz Responses')}
                    </h5>

                    {item.quiz_results.map((quiz, qIdx) => (
                      <div key={quiz.quizId || qIdx} className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-slate-800 flex items-center gap-2">
                            <Award className="h-4 w-4 text-hotel-gold" />
                            {quiz.quizTitle}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {quiz.score !== undefined && (
                              <Badge variant="outline" className="font-mono">
                                {quiz.score}%
                              </Badge>
                            )}
                            {quiz.correctCount !== undefined && quiz.totalQuestions !== undefined && (
                              <span className="text-muted-foreground">
                                ({quiz.correctCount}/{quiz.totalQuestions} {t('training:correct', 'correct')})
                              </span>
                            )}
                          </div>
                        </div>

                        {quiz.reviewItems && quiz.reviewItems.length > 0 ? (
                          <div className="space-y-2 pt-2">
                            {quiz.reviewItems.map((rev, revIdx) => (
                              <div
                                key={rev.questionId || revIdx}
                                className="rounded-md bg-white border border-slate-200/80 p-3 text-xs space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium text-slate-900 flex-1">
                                    {revIdx + 1}. {rev.questionText}
                                  </span>
                                  {rev.correct !== undefined && (
                                    <Badge
                                      variant={rev.correct ? 'default' : 'destructive'}
                                      className="text-[10px] shrink-0"
                                    >
                                      {rev.correct ? (
                                        <CheckCircle2 className="h-3 w-3 me-1 inline" />
                                      ) : (
                                        <XCircle className="h-3 w-3 me-1 inline" />
                                      )}
                                      {rev.correct ? t('training:correct', 'Correct') : t('training:incorrect', 'Incorrect')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-slate-600">
                                  <span className="font-medium text-slate-700">{t('training:learnerAnswer', 'Answer given')}: </span>
                                  <span className={rev.correct ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                    {rev.selectedAnswer || '—'}
                                  </span>
                                </div>
                                {rev.explanation && (
                                  <p className="text-muted-foreground italic text-[11px] pt-1">
                                    💡 {rev.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            {t('training:noQuestionDetails', 'Detailed question responses were not recorded for this attempt.')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
