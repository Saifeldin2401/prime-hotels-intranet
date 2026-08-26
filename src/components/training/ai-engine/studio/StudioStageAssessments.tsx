import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  HelpCircle,
  Layers,
  Lightbulb,
  ListOrdered,
  RotateCw,
  Shuffle,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLOOM_PRESETS } from '@/lib/ai/courseEngine'
import { QUESTION_TYPE_CONFIG, type QuestionType } from '@/types/questions'
import type {
  BloomDistribution,
  BloomPreset,
  QuizPlacement,
} from '@/types/aiCourseEngine'

interface StudioStageAssessmentsProps {
  quizPlacement: QuizPlacement
  onSelectQuizPlacement: (placement: QuizPlacement) => void
  quizQuestionCount: number
  onChangeQuizQuestionCount: (count: number) => void
  quizPassingScore: number
  onChangeQuizPassingScore: (score: number) => void
  quizMaxAttempts: number | null
  onChangeQuizMaxAttempts: (attempts: number | null) => void
  selectedQuestionTypes: QuestionType[]
  onToggleQuestionType: (type: QuestionType) => void
  bloomPreset: BloomPreset
  onSelectBloomPreset: (preset: BloomPreset) => void
  bloomDistribution: BloomDistribution
  onChangeBloomDistribution: (dist: BloomDistribution) => void
  randomizeQuestions: boolean
  onChangeRandomizeQuestions: (val: boolean) => void
  randomizeAnswers: boolean
  onChangeRandomizeAnswers: (val: boolean) => void
  distractorQuality: 'standard' | 'high' | 'expert_plausible'
  onChangeDistractorQuality: (q: 'standard' | 'high' | 'expert_plausible') => void
  includeHints: boolean
  onChangeIncludeHints: (val: boolean) => void
  includeExplanations: boolean
  onChangeIncludeExplanations: (val: boolean) => void
}

export function StudioStageAssessments({
  quizPlacement,
  onSelectQuizPlacement,
  quizQuestionCount,
  onChangeQuizQuestionCount,
  quizPassingScore,
  onChangeQuizPassingScore,
  quizMaxAttempts,
  onChangeQuizMaxAttempts,
  selectedQuestionTypes,
  onToggleQuestionType,
  bloomPreset,
  onSelectBloomPreset,
  bloomDistribution,
  onChangeBloomDistribution,
  randomizeQuestions,
  onChangeRandomizeQuestions,
  randomizeAnswers,
  onChangeRandomizeAnswers,
  distractorQuality,
  onChangeDistractorQuality,
  includeHints,
  onChangeIncludeHints,
  includeExplanations,
  onChangeIncludeExplanations,
}: StudioStageAssessmentsProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const PLACEMENT_OPTIONS: Array<{
    id: QuizPlacement
    title: string
    title_ar: string
    desc: string
    desc_ar: string
    icon: React.ElementType
    badge?: string
  }> = [
    {
      id: 'per_module',
      title: 'Per-Module Checkpoint Quizzes',
      title_ar: 'اختبارات تقييم بعد كل وحدة',
      desc: 'Active retrieval knowledge checks at the end of each module.',
      desc_ar: 'اختبارات قصيرة بعد نهاية كل وحدة تدريبية لتثبيت الفهم.',
      icon: Layers,
      badge: 'Recommended',
    },
    {
      id: 'final_exam',
      title: 'End-of-Course Certification Exam',
      title_ar: 'اختبار نهائي شامل للشهادة',
      desc: 'Comprehensive final exam consolidating all skills with a passing certificate.',
      desc_ar: 'اختبار نهائي موحد لتقييم اجتياز الدورة والحصول على الشهادة.',
      icon: Award,
      badge: 'Certified',
    },
    {
      id: 'both',
      title: 'Both Module Quizzes & Final Exam',
      title_ar: 'اختبارات وحدات + اختبار نهائي شامل',
      desc: 'Maximum pedagogical rigor with progressive checks and comprehensive certification.',
      desc_ar: 'الخيار الأكثر شمولية: تقييم مستمر بعد الوحدات مع اختبار نهائي معتمد.',
      icon: Sparkles,
      badge: 'Forbes Rigor',
    },
    {
      id: 'none',
      title: 'Inline Micro-Checks Only',
      title_ar: 'أسئلة سريعة داخل الدروس فقط',
      desc: 'Purely informal self-assessment questions without graded checkpoints.',
      desc_ar: 'فحص ذاتي خفيف داخل المحتوى بدون اختبارات رسمية.',
      icon: FileQuestion,
    },
  ]

  const QUESTION_TYPES_TO_SHOW: Array<{
    type: QuestionType
    title: string
    title_ar: string
    desc: string
    badge?: string
  }> = [
    {
      type: 'mcq',
      title: 'Multiple Choice (Single)',
      title_ar: 'اختيار من متعدد (إجابة واحدة)',
      desc: 'Standard 4-option questions testing factual comprehension.',
    },
    {
      type: 'scenario',
      title: 'Hotel Scenario Dilemmas',
      title_ar: 'سيناريوهات ومواقف فندقية',
      desc: 'Realistic guest interaction situations requiring judgment.',
      badge: 'Forbes Standard',
    },
    {
      type: 'ordering',
      title: 'SOP Chronological Ordering',
      title_ar: 'ترتيب خطوات الإجراءات (SOP)',
      desc: 'Sequence operational steps in correct chronological order.',
      badge: 'Procedural',
    },
    {
      type: 'matching',
      title: 'Concept & Role Matching',
      title_ar: 'مطابقة المفاهيم والأدوار',
      desc: 'Pair guest requests, departments, or items with solutions.',
    },
    {
      type: 'mcq_multi',
      title: 'Multiple Selection (Multi-Select)',
      title_ar: 'اختيارات متعددة (أكثر من إجابة)',
      desc: 'Select all policies or criteria that apply to a hotel rule.',
    },
    {
      type: 'true_false',
      title: 'True / False Protocol Verification',
      title_ar: 'صح / خطأ للتحقق من السياسات',
      desc: 'Quick validation of compliance standards.',
    },
    {
      type: 'fill_blank',
      title: 'Fill-in-the-Blank Keyword',
      title_ar: 'إكمال الفراغ بالكلمة المفتاحية',
      desc: 'Reinforces exact terminology and luxury phrasing.',
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Assessment Strategy & Placement */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-purple-600" />
              <span>{t('builder.assessmentPlacement', 'Assessment & Quiz Architecture')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.assessmentPlacementDesc', 'Determine how learner comprehension and certification will be verified.')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 capitalize">
            {quizPlacement.replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PLACEMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = quizPlacement === opt.id

            return (
              <Card
                key={opt.id}
                onClick={() => onSelectQuizPlacement(opt.id)}
                className={cn(
                  'cursor-pointer transition-all duration-200 border text-start group hover:shadow-sm',
                  isSelected
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                    : 'bg-card hover:border-purple-300'
                )}
              >
                <CardContent className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                        isSelected ? 'bg-purple-600 text-white' : 'bg-muted text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {opt.badge && (
                      <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 h-4">
                        {opt.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-bold text-foreground leading-snug">
                    {isRTL ? opt.title_ar : opt.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL ? opt.desc_ar : opt.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Questions, Passing Score & Allowed Attempts */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Question Count */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('builder.questionCount', 'Questions Per Quiz')}</Label>
            <Select
              value={String(quizQuestionCount)}
              onValueChange={(v) => onChangeQuizQuestionCount(parseInt(v, 10))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions (Rapid Checkpoint)</SelectItem>
                <SelectItem value="5">5 Questions (Standard Benchmark - Recommended)</SelectItem>
                <SelectItem value="8">8 Questions (Comprehensive Review)</SelectItem>
                <SelectItem value="10">10 Questions (Rigorous Check)</SelectItem>
                <SelectItem value="15">15 Questions (Certification Pool)</SelectItem>
                <SelectItem value="20">20 Questions (Comprehensive Final Exam)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Passing Score */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span>{t('builder.passingScore', 'Passing Threshold')}</span>
              <span className="font-mono text-purple-600 font-bold">{quizPassingScore}%</span>
            </div>
            <Slider
              value={[quizPassingScore]}
              onValueChange={([val]) => onChangeQuizPassingScore(val)}
              min={60}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>60% (Basic)</span>
              <span className="text-purple-600 font-bold">85% (Forbes Luxury Standard)</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          {/* Allowed Attempts */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('builder.maxAttempts', 'Allowed Retake Attempts')}</Label>
            <Select
              value={quizMaxAttempts === null ? 'unlimited' : String(quizMaxAttempts)}
              onValueChange={(v) => onChangeQuizMaxAttempts(v === 'unlimited' ? null : parseInt(v, 10))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Attempt (Strict Assessment)</SelectItem>
                <SelectItem value="2">2 Attempts</SelectItem>
                <SelectItem value="3">3 Attempts (Standard Mastery - Recommended)</SelectItem>
                <SelectItem value="5">5 Attempts</SelectItem>
                <SelectItem value="unlimited">Unlimited Retakes (Self-Paced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Question Types Selector */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <Label className="text-xs font-bold text-foreground">
              {t('builder.questionTypes', 'Interactive Question Types')}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t('builder.questionTypesDesc', 'Select question formats to vary cognitive engagement and realistic problem solving.')}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-bold">
            {selectedQuestionTypes.length} Types Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUESTION_TYPES_TO_SHOW.map((q) => {
            const isChecked = selectedQuestionTypes.includes(q.type)

            return (
              <div
                key={q.type}
                onClick={() => onToggleQuestionType(q.type)}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150',
                  isChecked
                    ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                    : 'border-border/70 hover:border-purple-200 bg-card'
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggleQuestionType(q.type)}
                  className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground">
                      {isRTL ? q.title_ar : q.title}
                    </span>
                    {q.badge && (
                      <span className="text-[8px] px-1 py-0.2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded font-bold">
                        {q.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {q.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Progressive Disclosure: Advanced Bloom Distribution & Distractor Quality */}
      <div className="border rounded-xl bg-muted/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{t('builder.advancedAssessments', 'Advanced Bloom Cognitive Distribution & Pedagogical Safeguards')}</span>
            <Badge variant="outline" className="text-[9px]">Optional</Badge>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t space-y-4 text-xs">
            {/* Bloom Preset Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{t('builder.bloomPreset', 'Bloom Cognitive Focus Preset')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['foundational', 'intermediate', 'advanced', 'expert'] as BloomPreset[]).map((bp) => (
                  <Button
                    key={bp}
                    type="button"
                    variant={bloomPreset === bp ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      onSelectBloomPreset(bp)
                      onChangeBloomDistribution(BLOOM_PRESETS[bp])
                    }}
                    className={cn('text-xs capitalize font-bold', bloomPreset === bp && 'bg-purple-600 text-white')}
                  >
                    {bp} Focus
                  </Button>
                ))}
              </div>
            </div>

            {/* Bloom Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-card">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Remember / Recall</span>
                  <span className="font-mono">{bloomDistribution.remember}%</span>
                </div>
                <Slider
                  value={[bloomDistribution.remember]}
                  onValueChange={([v]) => onChangeBloomDistribution({ ...bloomDistribution, remember: v })}
                  max={100}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Understand / Explain</span>
                  <span className="font-mono">{bloomDistribution.understand}%</span>
                </div>
                <Slider
                  value={[bloomDistribution.understand]}
                  onValueChange={([v]) => onChangeBloomDistribution({ ...bloomDistribution, understand: v })}
                  max={100}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Apply / Execute</span>
                  <span className="font-mono text-purple-600 font-bold">{bloomDistribution.apply}%</span>
                </div>
                <Slider
                  value={[bloomDistribution.apply]}
                  onValueChange={([v]) => onChangeBloomDistribution({ ...bloomDistribution, apply: v })}
                  max={100}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Include Hints & Remediation</p>
                  <p className="text-[10px] text-muted-foreground">Provides progressive guidance for incorrect responses.</p>
                </div>
                <Switch checked={includeHints} onCheckedChange={onChangeIncludeHints} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Include Explanations</p>
                  <p className="text-[10px] text-muted-foreground">Explains *why* the correct answer is standard policy.</p>
                </div>
                <Switch checked={includeExplanations} onCheckedChange={onChangeIncludeExplanations} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
