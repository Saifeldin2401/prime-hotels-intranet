import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import { useTrainingAssignmentsContext } from '../contexts/TrainingAssignmentsContext'

export function ProgressDetailDialog() {
  const {
    selectedProgressId,
    setSelectedProgressId,
    selectedProgress,
    selectedBlock,
    selectedProgressMetadata,
    selectedQuizResults,
    selectedQuizResultsMessage,
    users,
    modules,
    formatDate,
  } = useTrainingAssignmentsContext()

  const { t } = useTranslation('training')

  return (
    <Dialog open={!!selectedProgressId} onOpenChange={(open) => !open && setSelectedProgressId(null)}>
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
