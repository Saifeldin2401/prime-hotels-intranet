import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HelpCircle, ArrowUpRight, Sparkles, type LucideIcon } from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useTranslation } from 'react-i18next'

interface SmartEmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionText?: string
  actionRoute?: string
  onAction?: () => void
  secondaryActionText?: string
  onSecondaryAction?: () => void
  guideTopic?: string
  className?: string
}

export const SmartEmptyState: React.FC<SmartEmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionText,
  actionRoute,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  guideTopic,
  className = ''
}) => {
  const navigate = useNavigate()
  const { openWhatCanIDo } = useWizard()
  const { t } = useTranslation('wizard')

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionRoute) {
      navigate(actionRoute)
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/40 backdrop-blur-sm ${className}`}>
      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionText && (
          <Button onClick={handleAction} className="gap-2 shadow-sm">
            {actionText}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        )}

        {secondaryActionText && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {secondaryActionText}
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={openWhatCanIDo}
          className="text-muted-foreground hover:text-primary gap-1.5 text-xs"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {guideTopic ? `${t('empty_state.learn_about', 'Learn about')} ${guideTopic}` : t('actions.my_guide', 'My Role Guide')}
        </Button>
      </div>
    </div>
  )
}
