import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface StepRulesProps {
  certificateEnabled: boolean
  setCertificateEnabled: (v: boolean) => void
  passingScore: string
  setPassingScore: (v: string) => void
  validityPeriod: string
  setValidityPeriod: (v: string) => void
  allowRetake: boolean
  setAllowRetake: (v: boolean) => void
  maxAttempts: string
  setMaxAttempts: (v: string) => void
  autoAdvance: boolean
  setAutoAdvance: (v: boolean) => void
  showFeedback: boolean
  setShowFeedback: (v: boolean) => void
  randomizeQuestions: boolean
  setRandomizeQuestions: (v: boolean) => void
  showAnswers: boolean
  setShowAnswers: (v: boolean) => void
  timeLimit: number | null
  setTimeLimit: (v: number | null) => void
  isRTL: boolean
}

export function StepRules({
  certificateEnabled,
  setCertificateEnabled,
  passingScore,
  setPassingScore,
  validityPeriod,
  setValidityPeriod,
  allowRetake,
  setAllowRetake,
  maxAttempts,
  setMaxAttempts,
  autoAdvance,
  setAutoAdvance,
  showFeedback,
  setShowFeedback,
  randomizeQuestions,
  setRandomizeQuestions,
  showAnswers,
  setShowAnswers,
  timeLimit,
  setTimeLimit,
  isRTL,
}: StepRulesProps) {
  const { t } = useTranslation('training')
  const scorePresets = ['70', '80', '85', '90']

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.rulesTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <Label className="text-sm font-semibold text-slate-700">{t('builder.certificate')}</Label>
                <p className="text-xs text-muted-foreground">{t('builder.certificateHint')}</p>
              </div>
              <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
            </div>

            {certificateEnabled && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.passingScore')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                  />
                  <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                    {scorePresets.map(preset => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant={passingScore === preset ? 'default' : 'outline'}
                        onClick={() => setPassingScore(preset)}
                        className="h-7 text-xs"
                      >
                        {preset}%
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.validity')}</Label>
                  <Input
                    type="number"
                    value={validityPeriod}
                    onChange={(e) => setValidityPeriod(e.target.value)}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                  />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">{t('builder.allowRetake')}</Label>
                  <p className="text-xs text-muted-foreground">{t('builder.allowRetakeHint')}</p>
                </div>
                <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.maxAttempts')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  disabled={!allowRetake}
                  className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">{t('builder.autoAdvance')}</Label>
                  <p className="text-xs text-muted-foreground">{t('builder.autoAdvanceHint')}</p>
                </div>
                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">{t('builder.showFeedback')}</Label>
                  <p className="text-xs text-muted-foreground">{t('builder.showFeedbackHint')}</p>
                </div>
                <Switch checked={showFeedback} onCheckedChange={setShowFeedback} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">{t('builder.randomizeQuestions')}</Label>
                  <p className="text-xs text-muted-foreground">{t('builder.randomizeQuestionsHint')}</p>
                </div>
                <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">{t('builder.showAnswers')}</Label>
                  <p className="text-xs text-muted-foreground">{t('builder.showAnswersHint')}</p>
                </div>
                <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.timeLimit')}</Label>
              <Input
                type="number"
                value={timeLimit ?? ''}
                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
                placeholder={t('builder.timeLimitPlaceholder')}
                className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
