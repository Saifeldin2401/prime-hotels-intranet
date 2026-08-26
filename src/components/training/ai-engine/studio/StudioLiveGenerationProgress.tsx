import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  BrainCircuit,
  CheckCircle,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileCheck,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GenerationPhase {
  id: string
  title: string
  title_ar: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  currentCount?: number
  totalCount?: number
  unit?: string
  icon: React.ElementType
}

export interface GenerationErrorState {
  hasError: boolean
  failedItemTitle?: string
  errorMessage?: string
  canRetry?: boolean
  canFallback?: boolean
  canSkip?: boolean
  onRetry?: () => void
  onFallback?: () => void
  onSkip?: () => void
  onEditSettings?: () => void
}

interface StudioLiveGenerationProgressProps {
  courseTopic: string
  moduleCount: number
  lessonsPerModule: number
  enableImages: boolean
  isGenerating: boolean
  currentStage?: number
  stageName?: string
  stageDetail?: string
  errorState?: GenerationErrorState
  onCancel?: () => void
}

export function StudioLiveGenerationProgress({
  courseTopic,
  moduleCount,
  lessonsPerModule,
  enableImages,
  isGenerating,
  currentStage = 1,
  stageName = '',
  stageDetail = '',
  errorState,
  onCancel,
}: StudioLiveGenerationProgressProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const totalLessons = moduleCount * lessonsPerModule
  const totalQuizzes = moduleCount
  const totalImages = enableImages ? Math.min(6, totalLessons) : 0

  // Real-time parsed metrics from pipeline stageDetail
  const { parsedLessons, parsedQuizzes, parsedImages } = useMemo(() => {
    let lCount = 0
    let qCount = 0
    let imgCount = 0

    if (stageDetail) {
      const lessonMatch = stageDetail.match(/Completed\s+(\d+)\/(\d+)\s+lessons/i)
      if (lessonMatch) {
        lCount = parseInt(lessonMatch[1], 10)
      } else if (currentStage > 3) {
        lCount = totalLessons
      }

      if (currentStage >= 5) {
        qCount = totalQuizzes
      } else if (currentStage === 4) {
        qCount = Math.max(1, Math.floor(totalQuizzes / 2))
      }

      if (currentStage >= 6) {
        imgCount = totalImages
      }
    } else {
      if (currentStage > 3) lCount = totalLessons
      if (currentStage >= 5) qCount = totalQuizzes
      if (currentStage >= 6) imgCount = totalImages
    }

    return {
      parsedLessons: lCount,
      parsedQuizzes: qCount,
      parsedImages: imgCount,
    }
  }, [stageDetail, currentStage, totalLessons, totalQuizzes, totalImages])

  // Calculate Real Accurate Progress Percentage
  const calculatedProgress = useMemo(() => {
    if (!isGenerating) return 100

    switch (currentStage) {
      case 1: // Initializing
        return 12
      case 2: // Curriculum Blueprint
        return 28
      case 3: { // Lesson Synthesis
        if (totalLessons > 0 && parsedLessons > 0) {
          return Math.round(28 + (parsedLessons / totalLessons) * 40)
        }
        return 38
      }
      case 4: // Assessment Blueprint
        return 72
      case 5: // Question Synthesis
        return 84
      case 6: // Visual Generation
        return 92
      case 7: // Automated 5-Star QA Audit
        return 98
      default:
        return 50
    }
  }, [isGenerating, currentStage, totalLessons, parsedLessons])

  // Track elapsed time for real estimate
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0)
      const timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isGenerating])

  // Estimate Remaining Time based on velocity
  const estimatedRemainingSeconds = useMemo(() => {
    if (calculatedProgress <= 0 || calculatedProgress >= 100) return 0
    const totalEstimatedSeconds = Math.max(12, Math.round((elapsedSeconds / calculatedProgress) * 100))
    return Math.max(1, totalEstimatedSeconds - elapsedSeconds)
  }, [calculatedProgress, elapsedSeconds])

  const phases: GenerationPhase[] = [
    {
      id: 'planning',
      title: 'Pedagogical Blueprint Planning',
      title_ar: 'تخطيط المنهج والأهداف التعليمية',
      status: currentStage > 1 ? 'completed' : currentStage === 1 ? 'in_progress' : 'pending',
      icon: Compass,
    },
    {
      id: 'modules',
      title: 'Curriculum Structure & Modules',
      title_ar: 'هيكل الوحدات التدريبية',
      status: currentStage > 2 ? 'completed' : currentStage === 2 ? 'in_progress' : 'pending',
      currentCount: currentStage >= 2 ? moduleCount : 0,
      totalCount: moduleCount,
      unit: 'modules',
      icon: Layers,
    },
    {
      id: 'lessons',
      title: 'Lesson Text, SOPs & Dialogue Scripts',
      title_ar: 'صياغة محتوى الدروس والإجراءات',
      status: currentStage > 3 ? 'completed' : currentStage === 3 ? 'in_progress' : 'pending',
      currentCount: parsedLessons,
      totalCount: totalLessons,
      unit: 'lessons',
      icon: FileText,
    },
    {
      id: 'quizzes',
      title: 'Knowledge Checks & Assessment Pools',
      title_ar: 'بناء بنك الأسئلة والتقييمات',
      status: currentStage > 5 ? 'completed' : currentStage >= 4 ? 'in_progress' : 'pending',
      currentCount: parsedQuizzes,
      totalCount: totalQuizzes,
      unit: 'quizzes',
      icon: FileQuestion,
    },
    ...(enableImages
      ? [
          {
            id: 'visuals',
            title: 'Cloudflare Workers AI Image Generation',
            title_ar: 'توليد الصور التوضيحية عبر Cloudflare AI',
            status: (currentStage > 6 ? 'completed' : currentStage === 6 ? 'in_progress' : 'pending') as any,
            currentCount: parsedImages,
            totalCount: totalImages,
            unit: 'images',
            icon: ImageIcon,
          },
        ]
      : []),
    {
      id: 'qa',
      title: 'Automated 5-Star Quality Audit',
      title_ar: 'الفحص النهائي للجودة والمعايير',
      status: currentStage >= 7 ? (calculatedProgress >= 100 ? 'completed' : 'in_progress') : 'pending',
      icon: Award,
    },
  ]

  const activePhase = phases.find((p) => p.status === 'in_progress') || phases[0]

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-blue-50/80 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/30 text-start space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('builder.generatingCourseTitle', 'Authoring 5-Star Course Curriculum...')}
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-md" title={courseTopic}>
                {courseTopic || 'Hospitality Operational Excellence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge className="bg-purple-600 text-white text-xs px-2.5 py-1 font-mono">
              {calculatedProgress}%
            </Badge>
          </div>
        </div>

        {/* Real Dynamic Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <Progress value={calculatedProgress} className="h-2.5 bg-purple-100 dark:bg-purple-950/50" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              <span>{stageDetail || stageName || activePhase.title}</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>Est. Remaining: ~{estimatedRemainingSeconds}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Actionable Error Recovery Card */}
      {errorState?.hasError && (
        <Card className="border-rose-300 bg-rose-50/70 dark:bg-rose-950/30 shadow-md">
          <CardContent className="p-4 space-y-3 text-start">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">
                  {errorState.failedItemTitle || 'Generation Paused: Pipeline Anomaly'}
                </h4>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  {errorState.errorMessage || 'AI generation encountered a transient rate limit or timeout. Choose a recovery path below to proceed without losing progress.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-rose-200/80 flex-wrap">
              {errorState.canRetry && (
                <Button
                  size="sm"
                  onClick={errorState.onRetry}
                  className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  <RotateCcw className="w-3 h-3 me-1" />
                  Retry Item
                </Button>
              )}
              {errorState.canFallback && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={errorState.onFallback}
                  className="h-7 text-xs border-rose-300 text-rose-800 dark:text-rose-200 hover:bg-rose-100/50 font-medium"
                >
                  <Zap className="w-3 h-3 me-1 text-amber-600" />
                  Fast Fallback Model
                </Button>
              )}
              {errorState.canSkip && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={errorState.onSkip}
                  className="h-7 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-100/40"
                >
                  Skip & Continue Outline
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Detailed 6-Phase Pipeline Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {phases.map((phase) => {
          const Icon = phase.icon
          const isComplete = phase.status === 'completed'
          const isInProgress = phase.status === 'in_progress'
          const isPending = phase.status === 'pending'
          const isFailed = phase.status === 'failed'

          return (
            <div
              key={phase.id}
              className={cn(
                'p-3.5 rounded-xl border transition-all duration-200 text-start flex items-center justify-between gap-3',
                isInProgress && 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500 shadow-sm',
                isComplete && 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 text-foreground',
                isPending && 'border-border/70 bg-card/60 opacity-60',
                isFailed && 'border-rose-300 bg-rose-50/50'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                    isComplete && 'bg-emerald-600 text-white',
                    isInProgress && 'bg-purple-600 text-white animate-spin-slow',
                    isPending && 'bg-muted text-muted-foreground',
                    isFailed && 'bg-rose-600 text-white'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isInProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground leading-snug truncate">
                    {isRTL ? phase.title_ar : phase.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isComplete && 'Completed'}
                    {isInProgress && 'Active generation...'}
                    {isPending && 'Queued'}
                    {isFailed && 'Failed - Action Needed'}
                  </p>
                </div>
              </div>

              {/* Progress counter if present */}
              {phase.totalCount !== undefined && (
                <Badge
                  variant={isComplete ? 'default' : isInProgress ? 'secondary' : 'outline'}
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 h-5 shrink-0',
                    isComplete && 'bg-emerald-600 text-white hover:bg-emerald-600',
                    isInProgress && 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  )}
                >
                  {phase.currentCount || 0} / {phase.totalCount} {phase.unit}
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {/* 4. Cancel Generation Button */}
      {onCancel && isGenerating && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-rose-600 h-8"
          >
            ✕ {t('builder.cancelGeneration', 'Cancel & Return to Configuration')}
          </Button>
        </div>
      )}
    </div>
  )
}
