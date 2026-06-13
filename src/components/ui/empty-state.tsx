import { cn } from '@/lib/utils'
import {
    AlertCircle,
    Calendar,
    FileText,
    Inbox,
    RefreshCw,
    Search,
    Users
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedButton } from './enhanced-button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'p-8',
    md: 'p-12',
    lg: 'p-16'
  }

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeClasses[size],
      className
    )}>
      <div className={cn(
        'text-muted-foreground mb-4',
        iconSizes[size]
      )}>
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        <EnhancedButton
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </EnhancedButton>
      )}
    </div>
  )
}

// Preset empty states for common scenarios.
// Strings flow through i18n (common:emptyState.*) so they render in EN/AR; callers
// may still override title/description for context-specific copy.
interface PresetProps {
  title?: string
  description?: string
}

export function NoData({ action, title, description }: { action?: EmptyStateProps['action'] } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<Inbox className="h-12 w-12" />}
      title={title ?? t('emptyState.noData.title')}
      description={description ?? t('emptyState.noData.description')}
      action={action}
    />
  )
}

export function NoSearchResults({ onClear, title, description }: { onClear?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title={title ?? t('emptyState.noResults.title')}
      description={description ?? t('emptyState.noResults.description')}
      action={onClear ? {
        label: t('emptyState.noResults.clear'),
        onClick: onClear,
        variant: 'outline'
      } : undefined}
    />
  )
}

export function NoDocuments({ onUpload, title, description }: { onUpload?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title={title ?? t('emptyState.noDocuments.title')}
      description={description ?? t('emptyState.noDocuments.description')}
      action={onUpload ? {
        label: t('emptyState.noDocuments.action'),
        onClick: onUpload
      } : undefined}
    />
  )
}

export function NoEvents({ onCreate, title, description }: { onCreate?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<Calendar className="h-12 w-12" />}
      title={title ?? t('emptyState.noEvents.title')}
      description={description ?? t('emptyState.noEvents.description')}
      action={onCreate ? {
        label: t('emptyState.noEvents.action'),
        onClick: onCreate
      } : undefined}
    />
  )
}

export function NoUsers({ onInvite, title, description }: { onInvite?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<Users className="h-12 w-12" />}
      title={title ?? t('emptyState.noUsers.title')}
      description={description ?? t('emptyState.noUsers.description')}
      action={onInvite ? {
        label: t('emptyState.noUsers.action'),
        onClick: onInvite
      } : undefined}
    />
  )
}

export function ErrorState({ onRetry, title, description }: { onRetry?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title ?? t('emptyState.error.title')}
      description={description ?? t('emptyState.error.description')}
      action={onRetry ? {
        label: t('emptyState.error.action'),
        onClick: onRetry,
        variant: 'outline'
      } : undefined}
    />
  )
}

export function NetworkError({ onRetry, title, description }: { onRetry?: () => void } & PresetProps) {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon={<RefreshCw className="h-12 w-12 text-destructive" />}
      title={title ?? t('emptyState.networkError.title')}
      description={description ?? t('emptyState.networkError.description')}
      action={onRetry ? {
        label: t('emptyState.networkError.action'),
        onClick: onRetry,
        variant: 'outline'
      } : undefined}
    />
  )
}
