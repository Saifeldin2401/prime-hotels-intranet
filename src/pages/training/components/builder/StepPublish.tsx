import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StepPublishProps {
  category?: string
  setCategory?: (v: string) => void
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
  category,
  setCategory,
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Department:</span>
                    <Badge variant="outline" className="text-xs capitalize font-semibold bg-white">
                      {category ? category.replace('_', ' ') : 'Hotel Operations'}
                    </Badge>
                  </div>
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
                    <div key={item.key} className={cn("flex items-center justify-between gap-2", isRTL ? "flex-row-reverse" : "")}>
                      <div className="flex items-center gap-2">
                        {item.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
                      </div>
                      {item.key === 'category' && !item.ok && setCategory && (
                        <Select onValueChange={(v) => setCategory(v)}>
                          <SelectTrigger className="h-6 text-[11px] px-2 w-32 bg-white">
                            <SelectValue placeholder="Set Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="front_office">Front Office</SelectItem>
                            <SelectItem value="housekeeping">Housekeeping</SelectItem>
                            <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="safety_security">Safety & Security</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
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
