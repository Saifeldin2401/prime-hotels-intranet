/**
 * GenerationHistoryDialog
 * Full Audit Trail and History of AI Generation Jobs
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourseGenerationHistory } from '@/hooks/useAICourseEngine'
import { cn } from '@/lib/utils'
import type { CourseBlueprint, CourseGenerationJob } from '@/types/aiCourseEngine'
import {
  Clock,
  Cpu,
  Download,
  History,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface GenerationHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Restore a finished blueprint back into the studio preview. */
  onRestoreBlueprint?: (job: CourseGenerationJob) => void
  /** Alias of onRestoreBlueprint used by the studio modal. */
  onSelectJob?: (job: CourseGenerationJob) => void
  /** Resume an interrupted job from its last persisted checkpoint. */
  onResumeJob?: (job: CourseGenerationJob) => void
}

/** A job is resumable when it stopped mid-flight and left a checkpoint behind. */
function isResumable(job: CourseGenerationJob): boolean {
  return (
    (job.status === 'interrupted' || job.status === 'failed' || job.status === 'running') &&
    Boolean(job.metadata?.checkpoint) &&
    job.metadata?.checkpoint?.phase !== 'done'
  )
}

export function GenerationHistoryDialog({
  open,
  onOpenChange,
  onRestoreBlueprint,
  onSelectJob,
  onResumeJob,
}: GenerationHistoryDialogProps) {
  const restoreHandler = onRestoreBlueprint ?? onSelectJob
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { data: history, isLoading } = useCourseGenerationHistory()

  const handleDownloadBlueprint = (job: CourseGenerationJob) => {
    if (!job.blueprint) return
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(job.blueprint, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `course-blueprint-${job.mode}-${job.id.slice(0, 8)}.json`
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('builder.generationHistoryTitle', 'AI Course Generation Audit & History')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('builder.generationHistoryDesc', 'Review previous generation sessions, models used, durations, and restore blueprints.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-purple-400 opacity-60" />
              <p>{t('builder.noHistoryYet', 'No AI generation history recorded yet.')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((job) => {
                const title =
                  job.blueprint?.title ||
                  job.config?.courseType ||
                  job.mode
                const date = new Date(job.created_at).toLocaleString(
                  isRTL ? 'ar-SA' : 'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )

                return (
                  <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {title}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                            {job.mode.replace('_', ' ')}
                          </Badge>
                          {job.blueprint?.qualityScore && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                              QA {job.blueprint.qualityScore}%
                            </Badge>
                          )}
                          {(job.status === 'interrupted' || job.status === 'failed') && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold uppercase border-amber-400 text-amber-700 dark:text-amber-300"
                            >
                              {job.status === 'interrupted'
                                ? t('builder.jobInterrupted', 'Interrupted')
                                : t('builder.jobFailed', 'Failed')}
                              {job.metadata?.checkpoint?.phase
                                ? ` · ${String(job.metadata.checkpoint.phase).replace(/_/g, ' ')}`
                                : ''}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {date}
                          </span>
                          {job.duration_ms && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              {(job.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-purple-500" />
                            {job.models_used?.[0]?.split('/')[1] || job.models_used?.[0] || 'Auto Multi-Model'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {job.blueprint && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => handleDownloadBlueprint(job)}
                            title={t('builder.downloadJson', 'Download JSON')}
                          >
                            <Download className="w-3.5 h-3.5 me-1" />
                            <span>JSON</span>
                          </Button>
                        )}

                        {onResumeJob && isResumable(job) && (
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                              onResumeJob(job)
                              onOpenChange(false)
                            }}
                            title={t(
                              'builder.resumeFromCheckpointHint',
                              'Continue this interrupted generation from its last checkpoint'
                            )}
                          >
                            <PlayCircle className="w-3.5 h-3.5 me-1" />
                            <span>{t('builder.resume', 'Resume')}</span>
                          </Button>
                        )}

                        {restoreHandler && job.blueprint && (
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => {
                              restoreHandler(job)
                              onOpenChange(false)
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 me-1" />
                            <span>{t('builder.restore', 'Restore')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
