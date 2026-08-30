import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileCode,
  FileQuestion,
  FileText,
  Flame,
  Layers,
  ListOrdered,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LessonComponentKey, OverallContentDepth } from '@/types/aiCourseEngine'

interface StudioStageContentDepthProps {
  overallDepth: OverallContentDepth
  onSelectOverallDepth: (depth: OverallContentDepth) => void
  selectedComponents: LessonComponentKey[]
  onToggleComponent: (key: LessonComponentKey) => void
  onSelectAllComponents: () => void
  onSelectStandardComponents: () => void
  theoryDepth: number
  onChangeTheoryDepth: (val: number) => void
  examplesDepth: number
  onChangeExamplesDepth: (val: number) => void
  practicalDepth: number
  onChangePracticalDepth: (val: number) => void
  caseStudiesDepth: number
  onChangeCaseStudiesDepth: (val: number) => void
  assessmentsDepth: number
  onChangeAssessmentsDepth: (val: number) => void
}

export function StudioStageContentDepth({
  overallDepth,
  onSelectOverallDepth,
  selectedComponents,
  onToggleComponent,
  onSelectAllComponents,
  onSelectStandardComponents,
  theoryDepth,
  onChangeTheoryDepth,
  examplesDepth,
  onChangeExamplesDepth,
  practicalDepth,
  onChangePracticalDepth,
  caseStudiesDepth,
  onChangeCaseStudiesDepth,
  assessmentsDepth,
  onChangeAssessmentsDepth,
}: StudioStageContentDepthProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const DEPTH_PRESETS: Array<{
    id: OverallContentDepth
    title: string
    title_ar: string
    desc: string
    desc_ar: string
    badge: string
  }> = [
    {
      id: 'concise',
      title: 'Concise & Rapid',
      title_ar: 'موجز وسريع',
      desc: 'High-level core facts and essential step procedures without lengthy case analyses.',
      desc_ar: 'معلومات أساسية وخطوات مركزة وسريعة بدون إسهاب.',
      badge: 'Fast',
    },
    {
      id: 'balanced',
      title: 'Balanced Standard',
      title_ar: 'متوازن قياسي',
      desc: 'Solid operational clarity with hospitality examples, SOP checklists, and knowledge checks.',
      desc_ar: 'توازن مثالي بين الشرح النظري والأمثلة العملية الفندقية.',
      badge: 'Popular',
    },
    {
      id: 'comprehensive',
      title: 'Comprehensive',
      title_ar: 'شامل ومفصل',
      desc: 'Rich interactive modules with dialogues, error recovery protocols, scenarios, and checklists.',
      desc_ar: 'محتوى غني بالسيناريوهات وسيناريوهات الخدمة الفندقية الراقية.',
      badge: '5-Star',
    },
    {
      id: 'in_depth',
      title: 'Mastery Deep-Dive',
      title_ar: 'تعمق احترافي كامل',
      desc: 'Exhaustive domain training, five-star nuances, edge cases, and multi-step checklists.',
      desc_ar: 'تدريب معمق وشامل لأعلى معايير الخدمة والضيافة الفاخرة.',
      badge: 'Deep',
    },
  ]

  const COMPONENT_OPTIONS: Array<{
    key: LessonComponentKey
    title: string
    title_ar: string
    desc: string
    desc_ar: string
    icon: React.ElementType
    badge?: string
  }> = [
    {
      key: 'intro',
      title: 'Lesson Introduction & Context',
      title_ar: 'مقدمة وسياق الدرس',
      desc: 'Engaging real-world operational hook and learning rationale.',
      desc_ar: 'مقدمة شيقة توضح أهمية الدرس في العمليات اليومية.',
      icon: BookOpen,
    },
    {
      key: 'objectives',
      title: 'Learning Objectives & Bloom Targets',
      title_ar: 'أهداف التعلم ونتائج الأداء',
      desc: 'Measurable terminal and enabling performance competencies.',
      desc_ar: 'أهداف واضحة ومقاسة متوافقة مع مصفوفة بلوم.',
      icon: Target,
    },
    {
      key: 'concepts',
      title: 'Core Conceptual Foundations',
      title_ar: 'المفاهيم الأساسية',
      desc: 'Key terminology, hotel standards, and foundational principles.',
      desc_ar: 'المصطلحات الفندقية والمفاهيم الجوهرية للخدمة.',
      icon: FileCode,
    },
    {
      key: 'explanation',
      title: 'In-Depth Subject Explanation',
      title_ar: 'الشرح المعمق للموضوع',
      desc: 'Step-by-step pedagogical breakdowns with visual highlights.',
      desc_ar: 'شرح مفصل وواضح مع التركيز على أفضل الممارسات.',
      icon: FileText,
    },
    {
      key: 'examples',
      title: 'Real-World Hospitality Examples',
      title_ar: 'أمثلة واقعية من الفندق',
      desc: 'Concrete 5-star guest service scenarios and best practices.',
      desc_ar: 'أمثلة عملية واقعية من مواقف خدمة الضيوف الفاخرة.',
      icon: Sparkles,
    },
    {
      key: 'step_procedure',
      title: 'Step-by-Step SOP Procedures',
      title_ar: 'إجراءات العمل القياسية (SOP)',
      desc: 'Chronological operational action steps for associates.',
      desc_ar: 'خطوات إجرائية متسلسلة ودقيقة لتنفيذ المهام.',
      icon: ListOrdered,
      badge: 'Essential',
    },
    {
      key: 'dialogue_script',
      title: 'Guest Dialogue & Service Scripts',
      title_ar: 'نصوص المحادثة مع الضيوف',
      desc: 'five-star verbatim phrases, greetings, and active listening scripts.',
      desc_ar: 'عبارات وأساليب المحادثة الراقية المعتمدة مع الضيوف.',
      icon: MessageSquare,
      badge: 'five-star',
    },
    {
      key: 'checklist',
      title: 'Operational Inspection Checklist',
      title_ar: 'قوائم التحقق الميدانية',
      desc: 'Interactive action checklists to verify quality and hygiene standards.',
      desc_ar: 'قوائم تحقق عملية للتأكد من جودة التنفيذ والمعايير.',
      icon: FileCheck,
    },
    {
      key: 'last_protocol',
      title: 'Service Recovery & Safety Protocols',
      title_ar: 'بروتوكولات معالجة الملاحظات والسلامة',
      desc: 'LAST protocol (Listen, Apologize, Solve, Thank) and safety rules.',
      desc_ar: 'خطوات استعادة رضا الضيف وإجراءات السلامة والأمان.',
      icon: ShieldAlert,
    },
    {
      key: 'summary',
      title: 'Summary & Key Takeaways',
      title_ar: 'الملخص وأهم النقاط',
      desc: 'High-impact bulleted recaps of must-remember rules.',
      desc_ar: 'ملخص موجز للنقاط الحاسمة التي يجب تذكرها دائماً.',
      icon: Layers,
    },
    {
      key: 'action_points',
      title: 'On-the-Job Action Points',
      title_ar: 'خطة التطبيق العملي الميداني',
      desc: 'Immediate actions for employees to apply on shift today.',
      desc_ar: 'مهام وتطبيقات عملية فورية ينفذها الموظف في ورديته.',
      icon: Zap,
    },
    {
      key: 'knowledge_check',
      title: 'Inline Micro-Knowledge Check',
      title_ar: 'اختبار الفهم السريع داخل الدرس',
      desc: 'Active retrieval questions to confirm comprehension.',
      desc_ar: 'سؤال تفاعلي سريع لتثبيت المعلومة والتأكد من الفهم.',
      icon: FileQuestion,
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Overall Depth Level Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>{t('builder.contentDepthLevel', 'Overall Content Depth')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.contentDepthDesc', 'Controls the richness, detail level, and elaboration of lesson text.')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 capitalize">
            {overallDepth}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEPTH_PRESETS.map((preset) => {
            const isSelected = overallDepth === preset.id

            return (
              <Card
                key={preset.id}
                onClick={() => onSelectOverallDepth(preset.id)}
                className={cn(
                  'cursor-pointer transition-all duration-200 border text-start group hover:shadow-sm',
                  isSelected
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                    : 'bg-card hover:border-purple-300'
                )}
              >
                <CardContent className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">
                      {isRTL ? preset.title_ar : preset.title}
                    </p>
                    <Badge className={cn('text-[9px] px-1.5 py-0 h-4', isSelected ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground')}>
                      {preset.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL ? preset.desc_ar : preset.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Interactive Lesson Component & Activity Mix */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>{t('builder.lessonComponents', 'Interactive Lesson Components & Activities')}</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t('builder.lessonComponentsDesc', 'Choose which sections will be generated inside each lesson.')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectStandardComponents}
              className="h-7 text-xs"
            >
              {t('builder.recommendedSet', 'Standard Set')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectAllComponents}
              className="h-7 text-xs font-semibold text-purple-600 border-purple-300"
            >
              {t('builder.selectAllComponents', 'Select All (12)')}
            </Button>
            <Badge variant="secondary" className="text-xs font-bold">
              {selectedComponents.length} / {COMPONENT_OPTIONS.length} Active
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {COMPONENT_OPTIONS.map((comp) => {
            const Icon = comp.icon
            const isChecked = selectedComponents.includes(comp.key)

            return (
              <div
                key={comp.key}
                onClick={() => onToggleComponent(comp.key)}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150 group',
                  isChecked
                    ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                    : 'border-border/70 hover:border-purple-200 bg-card'
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggleComponent(comp.key)}
                  className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon className={cn('w-3.5 h-3.5', isChecked ? 'text-purple-600' : 'text-muted-foreground')} />
                    <span className="text-xs font-bold text-foreground">
                      {isRTL ? comp.title_ar : comp.title}
                    </span>
                    {comp.badge && (
                      <span className="text-[8px] px-1 py-0.2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded font-bold">
                        {comp.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {isRTL ? comp.desc_ar : comp.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Progressive Disclosure: Advanced Depth Sliders */}
      <div className="border rounded-xl bg-muted/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{t('builder.advancedDepth', 'Advanced Granular Dimension Weights')}</span>
            <Badge variant="outline" className="text-[9px]">Optional</Badge>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Theory Depth */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t('builder.theoryDepth', 'Conceptual & Theory Depth')}</span>
                  <span className="font-mono text-purple-600 font-bold">{theoryDepth} / 5</span>
                </div>
                <Slider
                  value={[theoryDepth]}
                  onValueChange={([v]) => onChangeTheoryDepth(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>

              {/* Examples Depth */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t('builder.examplesDepth', 'Hospitality Scenario Examples')}</span>
                  <span className="font-mono text-purple-600 font-bold">{examplesDepth} / 5</span>
                </div>
                <Slider
                  value={[examplesDepth]}
                  onValueChange={([v]) => onChangeExamplesDepth(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>

              {/* Practical Depth */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t('builder.practicalDepth', 'Practical Step Procedures & Checklists')}</span>
                  <span className="font-mono text-purple-600 font-bold">{practicalDepth} / 5</span>
                </div>
                <Slider
                  value={[practicalDepth]}
                  onValueChange={([v]) => onChangePracticalDepth(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>

              {/* Case Studies Depth */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t('builder.caseStudiesDepth', 'Guest Interaction Dilemmas & Case Studies')}</span>
                  <span className="font-mono text-purple-600 font-bold">{caseStudiesDepth} / 5</span>
                </div>
                <Slider
                  value={[caseStudiesDepth]}
                  onValueChange={([v]) => onChangeCaseStudiesDepth(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
