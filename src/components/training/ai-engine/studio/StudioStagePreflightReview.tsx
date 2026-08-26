import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileCheck,
  FileQuestion,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioStageId } from './StudioWorkflowStepper'
import type { FullCourseGenerationConfig } from '@/types/aiCourseEngine'
import { StudioIntelligentAdvisor, type IntelligentRecommendation } from './StudioIntelligentAdvisor'
import type { ConsistencyReport } from '@/lib/ai/courseHarmonizer'

interface StudioStagePreflightReviewProps {
  config: FullCourseGenerationConfig
  onJumpToStage: (stage: StudioStageId) => void
  onHarmonize: () => void
  onSavePresetClick: () => void
  onGenerateClick: () => void
  isGenerating?: boolean
  consistencyReport?: ConsistencyReport
  recommendations: IntelligentRecommendation[]
  onApplyAllRecommendations?: () => void
}

export function StudioStagePreflightReview({
  config,
  onJumpToStage,
  onHarmonize,
  onSavePresetClick,
  onGenerateClick,
  isGenerating = false,
  consistencyReport,
  recommendations,
  onApplyAllRecommendations,
}: StudioStagePreflightReviewProps) {
  const { t } = useTranslation('training')

  const totalLessons = (config.granularity?.moduleCount || 4) * (config.granularity?.lessonsPerModule || 3)
  const totalDurationMinutes = totalLessons * (config.granularity?.lessonDuration || 15)
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationString = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes}m`

  const hasIssues = consistencyReport && consistencyReport.issues.length > 0
  const qualityScore = hasIssues ? Math.max(75, 100 - consistencyReport.issues.length * 5) : 98

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Header & Quality Score Gauge */}
      <div className="p-5 rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-blue-50/80 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-foreground">
              {t('builder.preflightAudit', 'Pre-Flight Course Quality Audit')}
            </h2>
            <Badge className="bg-purple-600 text-white text-[10px]">
              Ready to Author
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('builder.preflightAuditDesc', 'Review pedagogical parameters, structure consistency, and assessment alignments before launching generation.')}
          </p>
        </div>

        {/* Quality Score Badge */}
        <div className="flex items-center gap-3 bg-card/80 backdrop-blur p-3 rounded-xl border self-start md:self-auto shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-purple-600/15 text-purple-600 flex items-center justify-center font-extrabold text-sm">
            {qualityScore}%
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              {t('builder.qualityForecast', 'Pedagogical Quality')}
            </p>
            <p className="text-xs font-bold text-foreground">
              {qualityScore >= 90 ? '⭐⭐⭐⭐⭐ 5-Star Benchmark' : '⭐⭐⭐⭐ Good Alignment'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Intelligent Pedagogical Advisor Banner */}
      <StudioIntelligentAdvisor
        recommendations={recommendations}
        consistencyReport={consistencyReport}
        onApplyAllRecommendations={onApplyAllRecommendations}
      />

      {/* 3. Comprehensive Summary Card Tree */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Card 1: Basics & Target */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                <span>1. Basics & Audience</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('basics')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground truncate">{config.topic || 'Custom Subject'}</p>
              <p className="text-muted-foreground">Mode: <span className="capitalize">{config.generationMode.replace('_', ' ')}</span></p>
              <p className="text-muted-foreground">Audience: <span className="capitalize">{config.targetAudience}</span> • Level: <span className="capitalize">{config.difficulty}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Structure & Granularity */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Structure & Pace</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('design')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {config.granularity?.moduleCount || 4} Modules • {totalLessons} Lessons Total
              </p>
              <p className="text-muted-foreground">Duration: ~{durationString} ({config.granularity?.lessonDuration || 15}m per lesson)</p>
              <p className="text-muted-foreground">Strategy: <span className="capitalize">{config.instructionalStrategy?.replace(/_/g, ' ')}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Content Depth & Mix */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Content & Components</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('content')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground capitalize">{config.overallDepth} Depth</p>
              <p className="text-muted-foreground">{config.lessonComponents?.length || 10} Interactive Components</p>
              <p className="text-muted-foreground">Procedures, Scripts, Checklists & Case Studies</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Assessments & Quizzes */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                <span>4. Assessments</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('assessments')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground capitalize">{config.quizConfig?.placement?.replace('_', ' ') || 'Per Module'}</p>
              <p className="text-muted-foreground">{config.quizConfig?.questionCount || 5} Questions per quiz ({config.quizConfig?.passingScore || 85}% Passing)</p>
              <p className="text-muted-foreground">{config.questionTypes?.length || 4} Question Types (MCQ, Scenario, Ordering)</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Visuals & Media */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                <span>5. Visuals & Media</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('visuals')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {config.imageConfig?.enableAIImages ? (config.imageConfig?.imageModel?.includes('flux') ? '✨ FLUX.1 Schnell Ultra-HD' : '⚡ SDXL-Lightning Free') : 'Visuals Disabled'}
              </p>
              <p className="text-muted-foreground">Density: <span className="capitalize">{config.imageConfig?.density || 'balanced'}</span></p>
              <p className="text-muted-foreground">Style: <span className="capitalize">{config.imageConfig?.preferredStyle?.replace('_', ' ') || 'Educational Illustration'}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: AI Engine */}
        <Card className="border hover:border-purple-300 transition-all">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>6. AI Engine & Tone</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToStage('ai_settings')}
                className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700"
              >
                Edit
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">Auto Intelligent Router</p>
              <p className="text-muted-foreground">Language: {config.aiControls?.targetLanguage || 'English'}</p>
              <p className="text-muted-foreground">Forbes 5-Star & KSA Labor Guidelines Enforced</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Pre-Flight Actions Bar */}
      <div className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSavePresetClick}
            className="text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5 me-1.5" />
            {t('builder.saveAsPreset', 'Save as Custom Preset')}
          </Button>

          {hasIssues && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onHarmonize}
              className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              ⚡ {t('builder.harmonizeAll', 'Harmonize Settings')}
            </Button>
          )}
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onGenerateClick}
          disabled={isGenerating}
          className="w-full sm:w-auto h-11 px-8 text-sm font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          <Rocket className="w-4 h-4 me-2" />
          {t('builder.launchGeneration', 'Generate Full Course Curriculum')}
        </Button>
      </div>
    </div>
  )
}
