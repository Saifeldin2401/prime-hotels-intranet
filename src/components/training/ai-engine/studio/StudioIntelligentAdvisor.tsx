import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Sparkles, Wand2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConsistencyReport } from '@/lib/ai/courseHarmonizer'

export interface IntelligentRecommendation {
  id: string
  category: 'depth' | 'structure' | 'assessment' | 'visuals' | 'pedagogy'
  severity: 'info' | 'warning' | 'high'
  titleKey: string
  defaultTitle: string
  descKey: string
  defaultDesc: string
  actionLabelKey?: string
  defaultActionLabel?: string
  onApply: () => void
}

interface StudioIntelligentAdvisorProps {
  recommendations: IntelligentRecommendation[]
  consistencyReport?: ConsistencyReport
  onApplyAllRecommendations?: () => void
  className?: string
}

export function StudioIntelligentAdvisor({
  recommendations,
  consistencyReport,
  onApplyAllRecommendations,
  className,
}: StudioIntelligentAdvisorProps) {
  const { t } = useTranslation('training')

  if (recommendations.length === 0 && (!consistencyReport || consistencyReport.issues.length === 0)) {
    return (
      <div className={cn('p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between', className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('builder.pedagogicalExcellence', 'Pedagogical & Structural Configuration Harmonized (100% Quality Alignment)')}</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300">
          5-Star Standard
        </Badge>
      </div>
    )
  }

  const primaryRec = recommendations[0]

  return (
    <div
      className={cn(
        'p-3 rounded-xl border border-purple-300/80 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-blue-50/60 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 transition-all shadow-sm',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Advice description */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {t('builder.aiAdvisorTitle', 'AI Pedagogical Advisor')}
              </span>
              <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300">
                {recommendations.length} {recommendations.length === 1 ? 'Optimization' : 'Optimizations'} Available
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {primaryRec ? t(primaryRec.descKey, primaryRec.defaultDesc) : (consistencyReport?.issues[0]?.message || 'Configuration tuning available.')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {primaryRec && (
            <Button
              size="sm"
              onClick={primaryRec.onApply}
              className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5 me-1.5" />
              {t(primaryRec.actionLabelKey || 'builder.applyRecommendation', primaryRec.defaultActionLabel || 'Apply Recommendation')}
            </Button>
          )}

          {onApplyAllRecommendations && recommendations.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onApplyAllRecommendations}
              className="h-8 text-xs font-semibold border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/50"
            >
              {t('builder.applyAllRecommendations', 'Apply All ({{count}})', { count: recommendations.length })}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
