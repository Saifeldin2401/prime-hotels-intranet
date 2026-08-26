import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileCode,
  Flame,
  GraduationCap,
  Layers,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COURSE_TYPES, INSTRUCTIONAL_STRATEGIES } from '@/lib/ai/courseEngine'
import type {
  CourseType,
  DifficultyProgression,
  InstructionalStrategy,
  LessonDurationMinutes,
} from '@/types/aiCourseEngine'

interface StudioStageLearningDesignProps {
  courseType: CourseType
  onSelectCourseType: (type: CourseType) => void
  instructionalStrategy: InstructionalStrategy
  onSelectInstructionalStrategy: (strategy: InstructionalStrategy) => void
  moduleCount: any
  onChangeModuleCount: (count: any) => void
  customModuleCount: number
  onChangeCustomModuleCount: (count: number) => void
  lessonsPerModule: any
  onChangeLessonsPerModule: (count: any) => void
  lessonDuration: LessonDurationMinutes
  onChangeLessonDuration: (duration: LessonDurationMinutes) => void
  difficultyProgression: DifficultyProgression
  onChangeDifficultyProgression: (progression: DifficultyProgression) => void
  pedagogicalFramework: string
  onChangePedagogicalFramework: (framework: string) => void
}

export function StudioStageLearningDesign({
  courseType,
  onSelectCourseType,
  instructionalStrategy,
  onSelectInstructionalStrategy,
  moduleCount,
  onChangeModuleCount,
  customModuleCount,
  onChangeCustomModuleCount,
  lessonsPerModule,
  onChangeLessonsPerModule,
  lessonDuration,
  onChangeLessonDuration,
  difficultyProgression,
  onChangeDifficultyProgression,
  pedagogicalFramework,
  onChangePedagogicalFramework,
}: StudioStageLearningDesignProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const resolvedModules = typeof moduleCount === 'number' ? moduleCount : customModuleCount
  const resolvedLessons = typeof lessonsPerModule === 'number' ? lessonsPerModule : 3
  const totalLessons = resolvedModules * resolvedLessons
  const totalDurationMinutes = totalLessons * lessonDuration
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationString = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes}m`

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Course Type Archetype */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>{t('builder.courseType', 'Course Archetype & Domain')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.courseTypeDesc', 'Select the curriculum domain to automatically align tone and practical focus.')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 capitalize">
            {courseType}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {COURSE_TYPES.map((ct) => {
            const isSelected = courseType === ct.id

            return (
              <Card
                key={ct.id}
                onClick={() => onSelectCourseType(ct.id as any)}
                className={cn(
                  'cursor-pointer transition-all duration-200 border text-start group hover:shadow-sm',
                  isSelected
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                    : 'bg-card hover:border-purple-300'
                )}
              >
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{ct.icon || '🎓'}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <p className="text-xs font-bold text-foreground leading-snug">
                    {isRTL ? ct.title_ar : ct.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                    {isRTL ? ct.desc_ar : ct.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Instructional Strategy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-600" />
              <span>{t('builder.instructionalStrategy', 'Instructional Pedagogical Strategy')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.instructionalStrategyDesc', 'Defines how knowledge and practical skills are sequenced for retention.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {INSTRUCTIONAL_STRATEGIES.map((strat) => {
            const isSelected = instructionalStrategy === strat.id

            return (
              <Card
                key={strat.id}
                onClick={() => onSelectInstructionalStrategy(strat.id as any)}
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
                      {isRTL ? strat.title_ar : strat.title}
                    </p>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL ? strat.desc_ar : strat.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 3. Structure, Modules & Duration Granularity */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>{t('builder.structureGranularity', 'Curriculum Size & Lesson Duration')}</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t('builder.granularityDesc', 'Calibrate the module count, lesson depth, and pace for your team.')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge variant="outline" className="text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300">
              {resolvedModules} Modules • {totalLessons} Lessons
            </Badge>
            <Badge variant="outline" className="text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>{durationString}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Module Count */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('builder.moduleCount', 'Module Count')}</Label>
            <Select
              value={String(moduleCount)}
              onValueChange={(v) => onChangeModuleCount(v === 'custom' ? 'custom' : parseInt(v, 10))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Module (Micro-Course / Quick SOP)</SelectItem>
                <SelectItem value="2">2 Modules (Short Training)</SelectItem>
                <SelectItem value="3">3 Modules (Standard Workshop)</SelectItem>
                <SelectItem value="4">4 Modules (Standard Curriculum - Recommended)</SelectItem>
                <SelectItem value="5">5 Modules (Comprehensive Course)</SelectItem>
                <SelectItem value="6">6 Modules (In-Depth Professional Program)</SelectItem>
                <SelectItem value="8">8 Modules (Mastery Certification)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lessons Per Module */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('builder.lessonsPerModule', 'Lessons Per Module')}</Label>
            <Select
              value={String(lessonsPerModule)}
              onValueChange={(v) => onChangeLessonsPerModule(parseInt(v, 10))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Lessons (Brisk / High-level)</SelectItem>
                <SelectItem value="3">3 Lessons (Balanced - Recommended)</SelectItem>
                <SelectItem value="4">4 Lessons (Detailed Procedures)</SelectItem>
                <SelectItem value="5">5 Lessons (Deep-Dive Technical)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lesson Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('builder.lessonDuration', 'Target Lesson Duration')}</Label>
            <Select
              value={String(lessonDuration)}
              onValueChange={(v) => onChangeLessonDuration(parseInt(v, 10) as any)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 min (Bite-sized Microlearning)</SelectItem>
                <SelectItem value="10">10 min (Focused Practice)</SelectItem>
                <SelectItem value="15">15 min (Standard Lesson - Recommended)</SelectItem>
                <SelectItem value="20">20 min (Comprehensive SOP)</SelectItem>
                <SelectItem value="30">30 min (In-Depth Workshop Lesson)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Progressive Disclosure: Advanced Pedagogical Framework */}
      <div className="border rounded-xl bg-muted/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{t('builder.advancedDesign', 'Advanced Pedagogical Framework & Difficulty Progression')}</span>
            <Badge variant="outline" className="text-[9px]">Optional</Badge>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.difficultyProgression', 'Difficulty Progression Curve')}</Label>
                <Select
                  value={difficultyProgression}
                  onValueChange={(v: any) => onChangeDifficultyProgression(v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progressive">Progressive (Builds foundational to advanced)</SelectItem>
                    <SelectItem value="uniform">Uniform (Consistent challenge throughout)</SelectItem>
                    <SelectItem value="adaptive">Adaptive (Dynamic difficulty scaling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.pedagogicalFramework', 'Learning Objectives Framework')}</Label>
                <Select
                  value={pedagogicalFramework}
                  onValueChange={onChangePedagogicalFramework}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bloom_taxonomy">Bloom&apos;s Revised Taxonomy</SelectItem>
                    <SelectItem value="competency_based">KSA Hotel Competency Framework</SelectItem>
                    <SelectItem value="sop_compliance">SOP Strict Procedural Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
