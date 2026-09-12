import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, X, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useTranslation } from 'react-i18next'

interface ContextualHelpCalloutProps {
  tipId: string
  title: string
  description: string
  badgeText?: string
  tips?: string[]
  actionRoute?: string
  actionText?: string
  className?: string
}

export const ContextualHelpCallout: React.FC<ContextualHelpCalloutProps> = ({
  tipId,
  title,
  description,
  badgeText,
  tips = [],
  actionRoute,
  actionText,
  className = ''
}) => {
  const navigate = useNavigate()
  const { isTipDismissed, dismissTip } = useWizard()
  const { t } = useTranslation('wizard')
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  if (isTipDismissed(tipId)) {
    return null
  }

  const handleDismiss = async () => {
    await dismissTip(tipId)
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {badgeText && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-background/50 border-primary/30 text-primary">
                  {badgeText}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>

            {isExpanded && tips.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground/90 list-disc list-inside ps-1">
                {tips.map((tip, idx) => (
                  <li key={idx} className="leading-relaxed">{tip}</li>
                ))}
              </ul>
            )}

            {isExpanded && actionRoute && actionText && (
              <div className="pt-2">
                <Button 
                  size="sm" 
                  variant="link" 
                  onClick={() => navigate(actionRoute)}
                  className="p-0 h-auto text-xs text-primary gap-1 font-medium hover:underline"
                >
                  {actionText}
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {tips.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            title={t('callout.dont_show_again', "Don't show this again")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
