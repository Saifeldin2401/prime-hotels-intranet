import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ArticleFeedbackProps {
  isSuccess: boolean
  showFeedbackInput: boolean
  feedbackHelpful: boolean
  feedbackText: string
  isPending: boolean
  onFeedbackTextChange: (val: string) => void
  onCancel: () => void
  onSubmit: () => void
  onMarkHelpful: () => void
  onMarkNotHelpful: () => void
}

export function ArticleFeedback({
  isSuccess,
  showFeedbackInput,
  feedbackHelpful,
  feedbackText,
  isPending,
  onFeedbackTextChange,
  onCancel,
  onSubmit,
  onMarkHelpful,
  onMarkNotHelpful,
}: ArticleFeedbackProps) {
  const { t } = useTranslation('knowledge')

  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
      <CardContent className="p-6">
        {isSuccess ? (
          <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {t('viewer.feedback_thanks')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('viewer.feedback_thanks_desc')}
              </p>
            </div>
          </div>
        ) : showFeedbackInput ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {feedbackHelpful
                  ? t('viewer.what_did_you_like', 'Feedback')
                  : t('viewer.how_can_we_improve', 'Help us improve')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600"
                onClick={onCancel}
              >
                {t('viewer.cancel')}
              </Button>
            </div>
            <Textarea
              value={feedbackText}
              onChange={(e) => onFeedbackTextChange(e.target.value)}
              placeholder={t('viewer.feedback_placeholder', 'Your thoughts...')}
              className="min-h-[80px] text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            <Button
              size="sm"
              className="w-full bg-ds-ink hover:bg-ds-ink-secondary text-white h-9"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('viewer.submit_feedback')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('viewer.feedback_title')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border-slate-200 dark:border-slate-700"
                disabled={isPending}
                onClick={onMarkHelpful}
                aria-label={t('accessibility.helpful', 'Mark as helpful')}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-all border-slate-200 dark:border-slate-700"
                disabled={isPending}
                onClick={onMarkNotHelpful}
                aria-label={t('accessibility.not_helpful', 'Mark as not helpful')}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
