import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LearningProgress } from '@/hooks/useLearningProgress'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ProgressDetailDialogProps {
  selectedProgressId: string | null
  onClose: () => void
  progressData: LearningProgress[] | undefined
  users: Array<{ id: string; full_name: string; email?: string }> | undefined
  modules: TrainingModule[] | undefined
  formatDate: (dateStr: string) => string
}

export function ProgressDetailDialog({
  selectedProgressId,
  onClose,
  progressData,
  users,
  modules,
  formatDate,
}: ProgressDetailDialogProps) {
  const { t } = useTranslation('training')

  const selectedProgress = useMemo(() => (
    progressData?.find((item) => item.id === selectedProgressId) || null
  ), [progressData, selectedProgressId])

  const { data: selectedModuleBlocks } = useQuery({
    queryKey: ['training-progress-details-blocks', selectedProgress?.content_id],
    queryFn: async () => {
      if (!selectedProgress?.content_id) return []
      const { data, error } = await supabase
        .from('training_content_blocks')
        .select('id, title, type, "order", content_data')
        .eq('training_module_id', selectedProgress.content_id)
        .eq('is_deleted', false)
        .order('order', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.content_id
  })

  const selectedProgressMetadata = useMemo(() => {
    const metadata = selectedProgress?.metadata
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
    return metadata as Record<string, unknown>
  }, [selectedProgress])

  const selectedBlockId = useMemo(() => {
    const activeBlockId = selectedProgressMetadata.active_block_id
    if (typeof activeBlockId === 'string' && activeBlockId.length > 0) return activeBlockId
    return selectedProgress?.last_block_id || null
  }, [selectedProgress?.last_block_id, selectedProgressMetadata])

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null
    return selectedModuleBlocks?.find((block) => block.id === selectedBlockId) || null
  }, [selectedBlockId, selectedModuleBlocks])

  const selectedModuleQuizIds = useMemo(() => (
    Array.from(new Set(
      (selectedModuleBlocks || [])
        .filter((block) => block.type === 'quiz')
        .map((block) => {
          const contentData = block.content_data as Record<string, unknown> | null | undefined
          return typeof contentData?.quiz_id === 'string' && contentData.quiz_id.length > 0
            ? contentData.quiz_id
            : null
        })
        .filter((quizId): quizId is string => typeof quizId === 'string' && quizId.length > 0)
    ))
  ), [selectedModuleBlocks])

  const { data: selectedQuizProgressRows = [] } = useQuery({
    queryKey: ['training-progress-details-quiz-progress', selectedProgress?.user_id, selectedModuleQuizIds],
    queryFn: async () => {
      if (!selectedProgress?.user_id || selectedModuleQuizIds.length === 0) return []
      const { data, error } = await supabase
        .from('learning_progress')
        .select('content_id, score_percentage, passed, completed_at, updated_at, metadata')
        .eq('user_id', selectedProgress.user_id)
        .eq('content_type', 'quiz')
        .in('content_id', selectedModuleQuizIds)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.user_id && selectedModuleQuizIds.length > 0
  })

  const parseOptionalNumber = useCallback((value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }, [])

  const getQuizResultReviewItems = useCallback((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const candidate = value as Record<string, unknown>
    if (Array.isArray(candidate.reviewItems)) return candidate.reviewItems
    if (Array.isArray(candidate.review_items)) return candidate.review_items
    return []
  }, [])

  const selectedQuizResults = useMemo(() => {
    const rawResults = selectedProgressMetadata.quiz_results_by_id
    const mergedResults = new Map<string, any>()

    if (rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)) {
      Object.values(rawResults as Record<string, any>)
        .filter((item) => item && typeof item === 'object')
        .forEach((item) => {
          const quizId = item.quizId || item.quiz_id
          if (typeof quizId === 'string' && quizId.length > 0) {
            mergedResults.set(quizId, {
              ...item,
              quizId,
              score: parseOptionalNumber(item.score),
              correctCount: parseOptionalNumber(item.correctCount ?? item.correct_count),
              totalQuestions: parseOptionalNumber(item.totalQuestions ?? item.total_questions),
              reviewItems: getQuizResultReviewItems(item)
            })
          }
        })
    }

    selectedQuizProgressRows.forEach((row) => {
      const metadata = (
        row.metadata &&
        typeof row.metadata === 'object' &&
        !Array.isArray(row.metadata)
      ) ? row.metadata as Record<string, any> : null
      const latestQuizResult = (
        metadata?.latest_quiz_result &&
        typeof metadata.latest_quiz_result === 'object' &&
        !Array.isArray(metadata.latest_quiz_result)
      ) ? metadata.latest_quiz_result : null

      if (!latestQuizResult) return

      const quizId = latestQuizResult.quizId || latestQuizResult.quiz_id || row.content_id
      if (typeof quizId !== 'string' || quizId.length === 0) return

      const existingResult = mergedResults.get(quizId)
      const latestReviewItems = getQuizResultReviewItems(latestQuizResult)
      const existingReviewItems = getQuizResultReviewItems(existingResult)
      const resolvedScore = (
        parseOptionalNumber(existingResult?.score)
        ?? parseOptionalNumber(latestQuizResult.score)
        ?? parseOptionalNumber(row.score_percentage)
      )
      const resolvedCorrectCount = (
        parseOptionalNumber(existingResult?.correctCount ?? existingResult?.correct_count)
        ?? parseOptionalNumber(latestQuizResult.correctCount ?? latestQuizResult.correct_count)
        ?? (latestReviewItems.length > 0
          ? latestReviewItems.filter((item: any) => item?.correct === true).length
          : null)
      )
      const resolvedTotalQuestions = (
        parseOptionalNumber(existingResult?.totalQuestions ?? existingResult?.total_questions)
        ?? parseOptionalNumber(latestQuizResult.totalQuestions ?? latestQuizResult.total_questions)
        ?? (latestReviewItems.length > 0 ? latestReviewItems.length : null)
      )

      mergedResults.set(quizId, {
        ...latestQuizResult,
        ...existingResult,
        quizId,
        score: resolvedScore,
        passed: typeof existingResult?.passed === 'boolean'
          ? existingResult.passed
          : typeof latestQuizResult.passed === 'boolean'
            ? latestQuizResult.passed
            : row.passed,
        completedAt: existingResult?.completedAt
          || existingResult?.completed_at
          || latestQuizResult.completedAt
          || latestQuizResult.completed_at
          || row.completed_at
          || row.updated_at,
        correctCount: resolvedCorrectCount,
        totalQuestions: resolvedTotalQuestions,
        reviewItems: existingReviewItems.length > 0 ? existingReviewItems : latestReviewItems
      })
    })

    return Array.from(mergedResults.values()).sort((a, b) => {
      const aTime = new Date(a.completedAt || a.completed_at || 0).getTime()
      const bTime = new Date(b.completedAt || b.completed_at || 0).getTime()
      return bTime - aTime
    })
  }, [getQuizResultReviewItems, parseOptionalNumber, selectedProgressMetadata, selectedQuizProgressRows])

  const selectedQuizResultsMessage = useMemo(() => {
    if (selectedQuizResults.length > 0) {
      return t('quizResultsDesc', 'Latest question-level review saved from the learner session.')
    }
    if (selectedModuleQuizIds.length > 0 && selectedProgress?.status === 'completed') {
      return t(
        'legacyQuizResultsUnavailable',
        'This completion was recovered from legacy progress data. Detailed quiz answers were not recoverable for this attempt.'
      )
    }
    return t('noQuizResultsSaved', 'No detailed quiz review has been saved for this progress record yet.')
  }, [selectedModuleQuizIds.length, selectedProgress?.status, selectedQuizResults.length, t])

  return (
    <Dialog open={!!selectedProgressId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('details', 'Details')}</DialogTitle>
          <DialogDescription>
            {selectedProgress?.profiles?.full_name || users?.find((user) => user.id === selectedProgress?.user_id)?.full_name || t('unknownUser')}
            {' | '}
            {selectedProgress?.training_modules?.title || modules?.find((module) => module.id === selectedProgress?.content_id)?.title || t('unknownModule')}
          </DialogDescription>
        </DialogHeader>

        {selectedProgress && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('status')}</p>
                  <p className="mt-2 font-semibold capitalize">{t(selectedProgress.status)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('progress')}</p>
                  <p className="mt-2 font-semibold">
                    {selectedProgress.status === 'completed'
                      ? selectedProgress.progress_percentage
                      : Math.min(selectedProgress.progress_percentage, 99)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('score')}</p>
                  <p className="mt-2 font-semibold">
                    {selectedProgress.score_percentage !== undefined && selectedProgress.score_percentage !== null
                      ? `${Number(selectedProgress.score_percentage).toFixed(0)}%`
                      : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('lastAccess')}</p>
                  <p className="mt-2 font-semibold">{formatDate(selectedProgress.last_accessed_at || selectedProgress.created_at)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('progress', 'Progress')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('timeSpent', 'Time spent')}</p>
                    <p className="mt-1 font-medium">
                      {selectedProgress.time_spent_seconds
                        ? `${Math.floor(selectedProgress.time_spent_seconds / 60)}m ${selectedProgress.time_spent_seconds % 60}s`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentStep', 'Current step')}</p>
                    <p className="mt-1 font-medium">
                      {selectedBlock?.title || (selectedBlock ? `${t('blockTitle', { number: (selectedBlock.order || 0) + 1 })}` : '-')}
                    </p>
                    {selectedBlock && (
                      <p className="text-xs text-muted-foreground capitalize">{selectedBlock.type.replace('_', ' ')}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('blocksCompleted', 'Blocks completed')}</p>
                    <p className="mt-1 font-medium">
                      {Array.isArray(selectedProgressMetadata.completed_blocks) ? selectedProgressMetadata.completed_blocks.length : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('mediaCompleted', 'Media completed')}</p>
                    <p className="mt-1 font-medium">
                      {Array.isArray(selectedProgressMetadata.completed_media_blocks) ? selectedProgressMetadata.completed_media_blocks.length : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('quizParts', 'Quiz parts')}</p>
                    <p className="mt-1 font-medium">{selectedQuizResults.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('quizResults', 'Quiz results')}</CardTitle>
                <DialogDescription>
                  {selectedQuizResultsMessage}
                </DialogDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedQuizResults.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {selectedQuizResultsMessage}
                  </div>
                ) : (
                  selectedQuizResults.map((quizResult) => (
                    <div key={quizResult.quizId || quizResult.quiz_id} className="space-y-4 rounded-xl border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{quizResult.quizTitle || quizResult.quiz_title || t('knowledgeCheck')}</h4>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(quizResult.completedAt || quizResult.completed_at || selectedProgress.completed_at || selectedProgress.updated_at || selectedProgress.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={quizResult.passed ? 'default' : 'destructive'}>
                            {quizResult.passed ? t('passed', 'Passed') : t('failed', 'Failed')}
                          </Badge>
                          <Badge variant="outline">
                            {typeof quizResult.score === 'number' ? `${quizResult.score}%` : '-'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('correct', 'Correct')}</p>
                          <p className="mt-1 font-medium">{quizResult.correctCount ?? quizResult.correct_count ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('totalQuestions', 'Total questions')}</p>
                          <p className="mt-1 font-medium">{quizResult.totalQuestions ?? quizResult.total_questions ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('score')}</p>
                          <p className="mt-1 font-medium">{typeof quizResult.score === 'number' ? `${quizResult.score}%` : '-'}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(quizResult.reviewItems || quizResult.review_items || []).map((reviewItem: any, index: number) => (
                          <div key={`${quizResult.quizId || quizResult.quiz_id}-${reviewItem.questionId || reviewItem.question_id || index}`} className="rounded-lg border bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900">{reviewItem.questionText || reviewItem.question_text || t('question', 'Question')}</p>
                                <p className="mt-2 text-sm text-slate-600">
                                  <span className="font-medium text-slate-800">{t('yourAnswer', 'Your answer')}:</span> {reviewItem.selectedAnswer || reviewItem.selected_answer || '-'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  <span className="font-medium text-slate-800">{t('correctAnswer', 'Correct answer')}:</span> {reviewItem.correctAnswer || reviewItem.correct_answer || '-'}
                                </p>
                                {(reviewItem.explanation || reviewItem.feedback) && (
                                  <p className="mt-2 text-sm text-muted-foreground">{reviewItem.explanation || reviewItem.feedback}</p>
                                )}
                              </div>
                              <Badge variant={reviewItem.correct ? 'default' : 'destructive'}>
                                {reviewItem.correct ? t('correct', 'Correct') : t('incorrect', 'Incorrect')}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
