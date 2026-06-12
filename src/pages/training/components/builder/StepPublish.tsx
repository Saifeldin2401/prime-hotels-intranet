import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StepPublishProps {
  sections: { length: number }
  totalItems: number
  displayDuration: number
  overrideDuration: number | null
  calculatedDuration: number
  certificateEnabled: boolean
  passingScore: string
  allowRetake: boolean
  maxAttempts: string
  validationChecklist: Array<{ key: string; label: string; ok: boolean }>
  publishReady: boolean
  builderBusy: boolean
  handleSave: () => void
  publishTraining: () => void
  isRTL: boolean
}

export function StepPublish({
  sections,
  totalItems,
  displayDuration,
  overrideDuration,
  calculatedDuration,
  certificateEnabled,
  passingScore,
  allowRetake,
  maxAttempts,
  validationChecklist,
  publishReady,
  builderBusy,
  handleSave,
  publishTraining,
  isRTL,
}: StepPublishProps) {
  const { t } = useTranslation('training')

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.publishTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.summary')}</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>{t('builder.summarySections', { count: sections.length })}</div>
                  <div>{t('builder.summaryItems', { count: totalItems })}</div>
                  <div>{t('builder.summaryDuration', { count: displayDuration || 0 })}</div>
                  {overrideDuration !== null && Math.round(overrideDuration) !== Math.round(calculatedDuration) && (
                    <div className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.rulesSummary')}</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>{certificateEnabled ? t('builder.certEnabled') : t('builder.certDisabled')}</div>
                  <div>{t('builder.passScoreSummary', { score: passingScore || 80 })}</div>
                  <div>{t('builder.retakeSummary', { count: allowRetake ? Number(maxAttempts) : 0 })}</div>
                </div>
              </div>
              <div className="rounded-lg border bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.publishChecklist')}</div>
                <div className="mt-3 space-y-2 text-sm">
                  {validationChecklist.map(item => (
                    <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn("flex items-center justify-end gap-3", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" onClick={handleSave} disabled={builderBusy}>
                {t('builder.saveDraft')}
              </Button>
              <Button
                onClick={publishTraining}
                disabled={!publishReady || builderBusy}
                className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
              >
                {t('builder.publish')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
