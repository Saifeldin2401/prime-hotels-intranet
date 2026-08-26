import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BookOpen,
  BrainCircuit,
  Clock,
  Compass,
  Cpu,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Target,
  Wand2,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { StudioStageId } from './StudioWorkflowStepper'
import type {
  CourseDifficulty,
  CourseGenerationMode,
  CourseType,
  ImageDensity,
  InstructionalStrategy,
  LessonDurationMinutes,
  OverallContentDepth,
  QuizPlacement,
  TargetAudience,
  VisualStyle,
} from '@/types/aiCourseEngine'
import { cn } from '@/lib/utils'
import { AVAILABLE_COURSE_AI_MODELS } from '@/lib/gemini'

export interface CourseSummaryStats {
  generationMode: CourseGenerationMode
  courseTopic: string
  targetAudience: TargetAudience
  courseType: CourseType
  difficulty: CourseDifficulty
  targetLanguage: 'English' | 'Arabic' | 'Bilingual'
  moduleCount: number
  lessonsPerModule: number
  lessonDuration: LessonDurationMinutes
  overallDepth: OverallContentDepth
  selectedComponentsCount: number
  selectedComponents?: string[]
  quizPlacement: QuizPlacement
  quizQuestionCount: number
  quizPassingScore: number
  selectedQuestionTypesCount: number
  selectedQuestionTypes?: string[]
  enableAIImages: boolean
  imageModel: string
  imageDensity: ImageDensity
  preferredVisualStyle: VisualStyle
  preferredModel: string
  qualityScoreForecast?: number
}

interface StudioCourseSummaryPanelProps {
  stats: CourseSummaryStats
  onJumpToStage: (stage: StudioStageId) => void
  onHarmonize?: () => void
  hasIssues?: boolean
}

export function StudioCourseSummaryPanel({
  stats,
  onJumpToStage,
  onHarmonize,
  hasIssues = false,
}: StudioCourseSummaryPanelProps) {
  const { t } = useTranslation('training')

  const totalLessons = stats.moduleCount * stats.lessonsPerModule
  const totalDurationMinutes = totalLessons * stats.lessonDuration
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationString = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes}m`

  // Resolve AI Model details
  const modelInfo = AVAILABLE_COURSE_AI_MODELS.find((m) => m.id === stats.preferredModel)
  const modelDisplayName = modelInfo?.name || (stats.preferredModel === 'auto' ? 'Auto Intelligent Router' : stats.preferredModel)
  const isModelFree = modelInfo?.badge?.includes('Free') || stats.preferredModel === 'auto' || stats.preferredModel.includes('gemini') || stats.preferredModel.includes('qwen')

  // Resolve Visual Engine details
  const resolveImageModelLabel = (modelId: string) => {
    if (modelId === 'recraft-vector') return { name: '🎨 Recraft Vector v3 (SVG)', badge: 'Free Vectors', free: true }
    if (modelId === 'recraft-v3') return { name: '🖼️ Recraft Illustration', badge: 'Free Tier', free: true }
    if (modelId.includes('flux')) return { name: '✨ FLUX.1 Schnell (12B DiT)', badge: 'Ultra HD', free: false }
    if (modelId.includes('lightning')) return { name: '⚡ SDXL-Lightning', badge: 'Free Tier', free: true }
    if (modelId.includes('base-1.0')) return { name: '🛡️ SDXL Base 1.0', badge: 'Free Tier', free: true }
    if (modelId.includes('dreamshaper')) return { name: '🎨 DreamShaper 8 LCM', badge: 'Free Tier', free: true }
    return { name: modelId.replace(/^@cf\/[^/]+\//, ''), badge: 'Free Tier', free: true }
  }

  const imageInfo = resolveImageModelLabel(stats.imageModel)

  const questionTypesDisplay = stats.selectedQuestionTypes && stats.selectedQuestionTypes.length > 0
    ? stats.selectedQuestionTypes.map(q => q.toUpperCase()).join(', ')
    : 'MCQ, Scenario, Ordering'

  return (
    <div className="w-full h-full flex flex-col bg-card/60 border-s backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t('builder.courseSummary', 'Curriculum Blueprint')}
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
            {stats.generationMode.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-xs font-bold text-foreground truncate mt-1.5" title={stats.courseTopic || 'Untitled Course'}>
          {stats.courseTopic || t('builder.untitledCourse', 'New AI Course Curriculum')}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div
            onClick={() => onJumpToStage('design')}
            className="p-2.5 rounded-lg border bg-card hover:border-purple-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>{t('builder.structure', 'Structure')}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
            <p className="text-sm font-extrabold text-foreground mt-0.5">
              {stats.moduleCount} <span className="text-[10px] font-normal text-muted-foreground">Mods</span> • {totalLessons} <span className="text-[10px] font-normal text-muted-foreground">Lessons</span>
            </p>
          </div>

          <div
            onClick={() => onJumpToStage('design')}
            className="p-2.5 rounded-lg border bg-card hover:border-purple-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>{t('builder.duration', 'Est. Duration')}</span>
              <Clock className="w-3 h-3 text-amber-500" />
            </div>
            <p className="text-sm font-extrabold text-foreground mt-0.5">
              {durationString} <span className="text-[10px] font-normal text-muted-foreground">({stats.lessonDuration}m/ea)</span>
            </p>
          </div>
        </div>

        {/* Section 1: Target & Pedagogical Profile */}
        <div
          onClick={() => onJumpToStage('basics')}
          className="p-3 rounded-xl border bg-card hover:border-purple-300 cursor-pointer transition-all group space-y-1.5 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              {t('builder.targetProfile', 'Target & Language')}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold group-hover:underline">
              {t('common.edit', 'Edit')} →
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary" className="text-[10px]">
              {stats.targetLanguage}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {stats.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {stats.targetAudience}
            </Badge>
          </div>
        </div>

        {/* Section 2: Learning Design & Depth */}
        <div
          onClick={() => onJumpToStage('content')}
          className="p-3 rounded-xl border bg-card hover:border-purple-300 cursor-pointer transition-all group space-y-1.5 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              {t('builder.contentMix', 'Content Depth & Mix')}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold group-hover:underline">
              {t('common.edit', 'Edit')} →
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground capitalize">{stats.overallDepth}</span> • {stats.selectedComponentsCount} Active Components
          </p>
        </div>

        {/* Section 3: Assessments & Knowledge Checks */}
        <div
          onClick={() => onJumpToStage('assessments')}
          className="p-3 rounded-xl border bg-card hover:border-purple-300 cursor-pointer transition-all group space-y-1.5 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5 text-emerald-600" />
              {t('builder.assessmentStrategy', 'Assessments & Quizzes')}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold group-hover:underline">
              {t('common.edit', 'Edit')} →
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.quizPlacement.replace('_', ' ')}</span> • {stats.quizQuestionCount} Qs ({stats.quizPassingScore}% Pass)
          </p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
            <span>{stats.selectedQuestionTypesCount} Types: {questionTypesDisplay}</span>
          </div>
        </div>

        {/* Section 4: Visuals & AI Image Engine */}
        <div
          onClick={() => onJumpToStage('visuals')}
          className="p-3 rounded-xl border bg-card hover:border-purple-300 cursor-pointer transition-all group space-y-1.5 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
              {t('builder.visualAssets', 'Visuals & Media')}
            </span>
            <span className="text-[10px] text-orange-600 font-semibold group-hover:underline">
              {t('common.edit', 'Edit')} →
            </span>
          </div>
          {stats.enableAIImages ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold truncate pe-2">{imageInfo.name}</span>
                <Badge className={cn('text-[9px] shrink-0', imageInfo.free ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white')}>
                  {imageInfo.badge}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Density: <span className="capitalize font-medium">{stats.imageDensity}</span> • Style: <span className="capitalize font-medium">{stats.preferredVisualStyle.replace('_', ' ')}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">{t('builder.visualsDisabled', 'Visual generation turned off')}</p>
          )}
        </div>

        {/* Section 5: AI Engine & Multi-Agent Orchestrator */}
        <div
          onClick={() => onJumpToStage('ai_settings')}
          className="p-3 rounded-xl border bg-card hover:border-purple-300 cursor-pointer transition-all group space-y-1.5 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>AI Engine & Agents</span>
            </span>
            <span className="text-[10px] text-purple-600 font-semibold group-hover:underline">
              {t('common.edit', 'Edit')} →
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-semibold truncate pe-2">{modelDisplayName}</span>
              <Badge className={cn('text-[9px] shrink-0', isModelFree ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white')}>
                {isModelFree ? '⚡ Free Router' : '👑 Premier Tier'}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              <span>KSA Safeguards • Forbes QA Critic • Auto-Revision</span>
            </p>
          </div>
        </div>

        {/* Harmonize Action Card */}
        {hasIssues && onHarmonize && (
          <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('builder.pedagogicalAlignment', 'Optimization Available')}</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {t('builder.harmonizePrompt', 'Harmonize module count, duration, and quizzes for optimal retention.')}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onHarmonize}
              className="w-full text-xs font-bold border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100"
            >
              ⚡ {t('builder.autoHarmonizeAll', 'Harmonize Settings')}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
