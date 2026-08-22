import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  analyzeBuilderContent,
  evaluateBuilderVisibility,
  resolveConfigProvenance,
} from '@/lib/trainingBuilderRulesEngine'
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TrainingSection } from './trainingBuilderTypes'

interface StepRulesProps {
  sections?: TrainingSection[]
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
  sections = [],
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

  // Evaluate content presence and conditional visibility rules
  const contentAnalysis = analyzeBuilderContent(sections)
  const visibilityRules = evaluateBuilderVisibility(contentAnalysis, {
    certificateEnabled,
    allowRetake,
  })

  const passingScoreProvenance = resolveConfigProvenance('passingScore', passingScore, '80')

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

        {/* Dynamic Quiz & Assessment Rules Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className={cn("flex items-center justify-between", isRTL ? 'flex-row-reverse' : '')}>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-hotel-gold" />
                <span>{t('builder.quizRulesTitle', 'Assessment & Quiz Configuration')}</span>
              </CardTitle>
              {visibilityRules.showQuizRules ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                  {contentAnalysis.quizCount} {t('builder.quizzesDetected', 'Quizzes in Module')}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
                  {t('builder.noQuizzesFound', 'No Quizzes Included')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!visibilityRules.showQuizRules ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    {t('builder.quizSettingsInactive', 'Quiz Settings Inactive')}
                  </p>
                  <p>
                    {t(
                      'builder.quizSettingsInactiveDesc',
                      'This course does not currently contain any quizzes or knowledge checkpoints. Add a Quiz block in the Structure step to dynamically enable passing score, retry policies, and time limits.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Passing Score with Provenance */}
                <div className="space-y-2">
                  <div className={cn("flex items-center justify-between", isRTL ? 'flex-row-reverse' : '')}>
                    <Label className="text-xs font-semibold text-slate-700">
                      {t('builder.passingScore', 'Passing Score Threshold (%)')} <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {passingScoreProvenance.sourceLabel}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(e.target.value)}
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                    <div className={cn("flex flex-wrap gap-2 items-center", isRTL ? "flex-row-reverse" : "")}>
                      {scorePresets.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant={passingScore === preset ? 'default' : 'outline'}
                          onClick={() => setPassingScore(preset)}
                          className="h-8 text-xs font-semibold"
                        >
                          {preset}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Retake & Attempts */}
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.allowRetake', 'Allow Retakes on Failure')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.allowRetakeHint', 'Learners can retake failed quizzes after review')}</p>
                    </div>
                    <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>
                      {t('builder.maxAttempts', 'Maximum Retake Attempts')}
                    </Label>
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

                {/* Question Randomization & Feedback */}
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.randomizeQuestions', 'Randomize Question Order')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.randomizeQuestionsHint', 'Shuffle questions for each learner')}</p>
                    </div>
                    <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.showAnswers', 'Show Answer Explanations')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.showAnswersHint', 'Display remedial rationale after submission')}</p>
                    </div>
                    <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
                  </div>
                </div>

                {/* Time Limit & Auto Advance */}
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>
                      {t('builder.timeLimit', 'Quiz Time Limit (Minutes)')}
                    </Label>
                    <Input
                      type="number"
                      value={timeLimit ?? ''}
                      onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
                      placeholder={t('builder.timeLimitPlaceholder', 'e.g. 10 (Optional)')}
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.autoAdvance', 'Auto-Advance on Passing')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.autoAdvanceHint', 'Automatically unlock and route to next lesson')}</p>
                    </div>
                    <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Certification & Validity Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className={cn("flex items-center justify-between", isRTL ? 'flex-row-reverse' : '')}>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-hotel-gold" />
                <span>{t('builder.certRulesTitle', 'Certification & Validity Period')}</span>
              </CardTitle>
              <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
            </div>
          </CardHeader>
          {certificateEnabled && (
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>
                    {t('builder.validity', 'Certificate Validity Period (Days)')}
                  </Label>
                  <Input
                    type="number"
                    value={validityPeriod}
                    onChange={(e) => setValidityPeriod(e.target.value)}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('builder.certAutoIssue', 'Certificates are cryptographically verified and issued upon 100% verified completion.')}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Video & Media Requirements Card (Visible only when video/audio blocks exist) */}
        {visibilityRules.showMediaRules && (
          <Card className="shadow-sm border-slate-200 bg-slate-50/50">
            <CardHeader>
              <div className={cn("flex items-center justify-between", isRTL ? 'flex-row-reverse' : '')}>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span>{t('builder.mediaGateTitle', 'Media & Video Watch Gate')}</span>
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {contentAnalysis.videoCount + contentAnalysis.audioCount} Media Blocks
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  {t('builder.mediaGateActive', 'Media Completion Gate is Active')}
                </p>
                <p>
                  {t(
                    'builder.mediaGateActiveDesc',
                    'Learners must watch/listen to mandatory video and audio content to at least 90% before subsequent lesson blocks are unlocked in sequential mode.'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
