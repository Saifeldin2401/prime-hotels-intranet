import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  imageModel?: string
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
  imageModel = 'recraft-vector',
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

  // Monotonic tracking to ensure counts never regress
  const maxLessonsRef = useRef(0)
  const maxQuizzesRef = useRef(0)
  const maxImagesRef = useRef(0)

  // Extract Model Name and Clean Narrative from pipeline stageDetail
  const { activeModelName, cleanStageDetail } = useMemo(() => {
    if (!stageDetail) return { activeModelName: undefined, cleanStageDetail: '' }
    const modelMatch = stageDetail.match(/\[Model:\s*([^\]]+)\]/i)
    const activeModel = modelMatch ? modelMatch[1].trim() : undefined
    const clean = stageDetail.replace(/\[Model:\s*[^\]]+\]\s*/gi, '').trim()
    return { activeModelName: activeModel, cleanStageDetail: clean }
  }, [stageDetail])

  // Real-time parsed metrics from pipeline stageDetail
  const { parsedLessons, parsedQuizzes, parsedImages } = useMemo(() => {
    let lCount = maxLessonsRef.current
    let qCount = maxQuizzesRef.current
    let imgCount = maxImagesRef.current

    if (stageDetail) {
      // 1. Lessons progress regex (matches (2/6), 2/6, Completed 2/6, etc.)
      const lessonMatch = stageDetail.match(/(?:Completed|Synthesizing|lessons?)\s*\(?(\d+)\/(\d+)\)?/i)
      if (lessonMatch) {
        lCount = Math.max(lCount, parseInt(lessonMatch[1], 10))
      } else if (currentStage > 3) {
        lCount = totalLessons
      }

      // 2. Quizzes progress regex
      const quizMatch = stageDetail.match(/(?:Completed|Synthesizing|quizzes?)\s*\(?(\d+)\/(\d+)\)?/i)
      if (quizMatch) {
        qCount = Math.max(qCount, parseInt(quizMatch[1], 10))
      } else if (currentStage > 4) {
        qCount = totalQuizzes
      }

      // 3. Images progress regex
      const imgMatch = stageDetail.match(/(?:Completed|Synthesizing|visuals?|images?)\s*\(?(\d+)\/(\d+)\)?/i)
      if (imgMatch) {
        imgCount = Math.max(imgCount, parseInt(imgMatch[1], 10))
      } else if (currentStage > 5) {
        imgCount = totalImages
      }
    } else {
      if (currentStage > 3) lCount = totalLessons
      if (currentStage > 4) qCount = totalQuizzes
      if (currentStage > 5) imgCount = totalImages
    }

    maxLessonsRef.current = Math.min(totalLessons, lCount)
    maxQuizzesRef.current = Math.min(totalQuizzes, qCount)
    maxImagesRef.current = Math.min(totalImages, imgCount)

    return {
      parsedLessons: maxLessonsRef.current,
      parsedQuizzes: maxQuizzesRef.current,
      parsedImages: maxImagesRef.current,
    }
  }, [stageDetail, currentStage, totalLessons, totalQuizzes, totalImages])

  // Calculate Real Accurate Progress Percentage
  const calculatedProgress = useMemo(() => {
    if (!isGenerating) return 100

    switch (currentStage) {
      case 1: // Discovery & Grounding
        return 12
      case 2: // Curriculum Blueprint
        return 28
      case 3: { // Lesson Synthesis
        if (totalLessons > 0 && parsedLessons > 0) {
          return Math.round(28 + (parsedLessons / totalLessons) * 32)
        }
        return 38
      }
      case 4: { // Assessment Pools
        if (totalQuizzes > 0 && parsedQuizzes > 0) {
          return Math.round(60 + (parsedQuizzes / totalQuizzes) * 15)
        }
        return 65
      }
      case 5: { // AI Visuals
        if (totalImages > 0 && parsedImages > 0) {
          return Math.round(75 + (parsedImages / totalImages) * 15)
        }
        return 80
      }
      case 6: // QA Critic & Compliance Audit
        return 94
      default:
        return 50
    }
  }, [isGenerating, currentStage, totalLessons, parsedLessons, totalQuizzes, parsedQuizzes, totalImages, parsedImages])

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

  // Resolve visual card title dynamically
  const resolveVisualCardTitle = () => {
    if (imageModel === 'recraft-vector') {
      return {
        title: 'Recraft Vector AI Image Generation',
        title_ar: 'توليد الرسوم البيانية الفيكتور عبر Recraft AI',
      }
    }
    if (imageModel === 'recraft-v3') {
      return {
        title: 'Recraft Educational Illustration Generation',
        title_ar: 'توليد الرسومات التعليمية عبر Recraft AI',
      }
    }
    if (imageModel.includes('flux')) {
      return {
        title: 'FLUX.1 Schnell Ultra-HD Image Generation',
        title_ar: 'توليد الصور فائقة الدقة عبر FLUX.1 AI',
      }
    }
    if (imageModel.includes('lightning')) {
      return {
        title: 'Cloudflare Workers AI (SDXL-Lightning)',
        title_ar: 'توليد الصور عبر Cloudflare AI',
      }
    }
    return {
      title: 'AI Visual Assets & Media Generation',
      title_ar: 'توليد الصور والوسائط التوضيحية',
    }
  }

  const visualCardInfo = resolveVisualCardTitle()

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
      status: currentStage > 4 ? 'completed' : currentStage === 4 ? 'in_progress' : 'pending',
      currentCount: parsedQuizzes,
      totalCount: totalQuizzes,
      unit: 'quizzes',
      icon: FileQuestion,
    },
    ...(enableImages
      ? [
          {
            id: 'visuals',
            title: visualCardInfo.title,
            title_ar: visualCardInfo.title_ar,
            status: (currentStage > 5 ? 'completed' : currentStage === 5 ? 'in_progress' : 'pending') as any,
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
      status: currentStage >= 6 ? (calculatedProgress >= 100 ? 'completed' : 'in_progress') : 'pending',
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
            {activeModelName && (
              <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 text-[10px] px-2 py-0.5 font-mono flex items-center gap-1 shadow-xs">
                <Cpu className="w-3 h-3 text-purple-600" />
                <span className="truncate max-w-[150px]">{activeModelName}</span>
              </Badge>
            )}
            <Badge className="bg-purple-600 text-white text-xs px-2.5 py-1 font-mono">
              {calculatedProgress}%
            </Badge>
          </div>
        </div>

        {/* Real Dynamic Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <Progress value={calculatedProgress} className="h-2.5 bg-purple-100 dark:bg-purple-950/50" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-lg">
              <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin shrink-0" />
              <span className="truncate">{cleanStageDetail || stageName || activePhase.title}</span>
            </div>
            <div className="flex items-center gap-1 font-mono shrink-0">
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
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  {errorState.failedItemTitle || 'Synthesis Anomaly Detected'}
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {errorState.errorMessage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200 dark:border-rose-900/50">
              {errorState.canRetry && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={errorState.onRetry}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
                >
                  <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                  Retry Agent Step
                </Button>
              )}
              {errorState.canFallback && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={errorState.onFallback}
                  className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 text-xs h-8"
                >
                  <Zap className="w-3.5 h-3.5 me-1.5 text-amber-500" />
                  Failover to Fast Gemini Tier
                </Button>
              )}
              {errorState.canSkip && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={errorState.onSkip}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Skip & Assemble Blueprint
                </Button>
              )}
              {errorState.onEditSettings && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={errorState.onEditSettings}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 ms-auto"
                >
                  Edit Configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Subsystem Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {phases.map((phase) => {
          const Icon = phase.icon
          const isDone = phase.status === 'completed'
          const isCurrent = phase.status === 'in_progress'

          return (
            <div
              key={phase.id}
              className={cn(
                'p-4 rounded-xl border transition-all duration-300 flex items-center justify-between text-start',
                isCurrent
                  ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500 shadow-sm'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10'
                  : 'border-border/60 bg-card/40 opacity-70'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold',
                    isCurrent
                      ? 'bg-purple-600 text-white animate-pulse'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {isRTL ? phase.title_ar : phase.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {isDone ? 'Completed' : isCurrent ? 'Active generation...' : 'Queued'}
                    </p>
                    {isCurrent && activeModelName && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        <Cpu className="w-2.5 h-2.5" />
                        {activeModelName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Count Badge */}
              {phase.totalCount !== undefined && (
                <Badge
                  variant={isDone ? 'default' : 'secondary'}
                  className={cn(
                    'text-[10px] font-mono shrink-0 ms-2',
                    isDone
                      ? 'bg-emerald-700 text-white'
                      : isCurrent
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {phase.currentCount || 0} / {phase.totalCount} {phase.unit}
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {/* 4. Footer Cancel Option */}
      {onCancel && (
        <div className="pt-2 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕ {t('builder.cancelReturn', 'Cancel & Return to Configuration')}
          </Button>
        </div>
      )}
    </div>
  )
}
