import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { BookOpen, CheckCircle2, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StepRulesProps {
  category?: string
  setCategory?: (v: string) => void
  difficultyLevel?: string
  setDifficultyLevel?: (v: string) => void
  audience?: string
  setAudience?: (v: string) => void
  description?: string
  setDescription?: (v: string) => void
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
  category = 'operations',
  setCategory,
  difficultyLevel = 'beginner',
  setDifficultyLevel,
  audience = 'all',
  setAudience,
  description = '',
  setDescription,
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
        {/* Course Metadata & Department Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-base font-bold text-slate-900 dark:text-white flex items-center gap-2", isRTL ? 'flex-row-reverse' : '')}>
              <BookOpen className="w-4 h-4 text-hotel-gold" />
              <span>{t('builder.courseDetails', 'Course Classification & Department')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Category / Department */}
              <div className="space-y-1.5">
                <Label className={cn("text-xs font-bold text-slate-700", isRTL ? "text-right block" : "")}>
                  {t('category', 'Department / Category')} <span className="text-red-500">*</span>
                </Label>
                <Select value={category || 'operations'} onValueChange={(val) => setCategory?.(val)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium border-slate-200">
                    <SelectValue placeholder={t('builder.selectCategory', 'Select department')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front_office">Front Office & Reception</SelectItem>
                    <SelectItem value="housekeeping">Housekeeping & Laundry</SelectItem>
                    <SelectItem value="food_beverage">Food & Beverage (F&B)</SelectItem>
                    <SelectItem value="culinary">Culinary & Kitchen</SelectItem>
                    <SelectItem value="operations">{t('operations', 'Hotel Operations')}</SelectItem>
                    <SelectItem value="safety_security">Safety & Security</SelectItem>
                    <SelectItem value="maintenance">Engineering & Maintenance</SelectItem>
                    <SelectItem value="compliance">{t('builder.compliance', 'Compliance & Regulations')}</SelectItem>
                    <SelectItem value="onboarding">{t('builder.onboarding', 'New Hire Onboarding')}</SelectItem>
                    <SelectItem value="skills">{t('builder.skills', 'Hospitality Skills')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-1.5">
                <Label className={cn("text-xs font-bold text-slate-700", isRTL ? "text-right block" : "")}>
                  {t('builder.difficulty', 'Difficulty Level')}
                </Label>
                <Select value={difficultyLevel} onValueChange={(val) => setDifficultyLevel?.(val)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t('beginner', 'Beginner (Foundational)')}</SelectItem>
                    <SelectItem value="intermediate">{t('intermediate', 'Intermediate (Standard)')}</SelectItem>
                    <SelectItem value="advanced">{t('advanced', 'Advanced (Mastery)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <Label className={cn("text-xs font-bold text-slate-700", isRTL ? "text-right block" : "")}>
                  {t('builder.audience', 'Target Audience')}
                </Label>
                <Select value={audience} onValueChange={(val) => setAudience?.(val)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hotel Associates</SelectItem>
                    <SelectItem value="frontline">Frontline Associates Only</SelectItem>
                    <SelectItem value="supervisors">Supervisors & Team Leads</SelectItem>
                    <SelectItem value="management">Department Managers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Course Summary */}
            {setDescription && (
              <div className="space-y-1.5 pt-1">
                <Label className={cn("text-xs font-bold text-slate-700", isRTL ? "text-right block" : "")}>
                  {t('builder.courseSummary', 'Course Description & Overview')}
                </Label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('builder.descriptionHint', 'Describe learning objectives and intended operational outcomes...')}
                  className="text-xs bg-white dark:bg-slate-950 border-slate-200"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-base font-bold flex items-center gap-2", isRTL ? 'flex-row-reverse' : '')}>
              <SlidersHorizontal className="w-4 h-4 text-hotel-gold" />
              <span>{t('builder.rulesTitle', 'Grading & Certification Rules')}</span>
            </CardTitle>
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
