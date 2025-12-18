import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedButton } from './enhanced-button'
import {
  FileText,
  Inbox,
  Search,
  Calendar,
  Users,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

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
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
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

// Preset empty states for common scenarios
export function NoData({ action }: { action?: EmptyStateProps['action'] }) {
  return (
    <EmptyState
      icon={<Inbox className="h-12 w-12" />}
      title="No data available"
      description="There's no data to display at the moment."
      action={action}
    />
  )
}

export function NoSearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="No results found"
      description="Try adjusting your search terms or filters."
      action={onClear ? {
        label: 'Clear search',
        onClick: onClear,
        variant: 'outline'
      } : undefined}
    />
  )
}

export function NoDocuments({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="No documents yet"
      description="Upload your first document to get started."
      action={onUpload ? {
        label: 'Upload document',
        onClick: onUpload
      } : undefined}
    />
  )
}

export function NoEvents({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="h-12 w-12" />}
      title="No upcoming events"
      description="There are no events scheduled for this period."
      action={onCreate ? {
        label: 'Create event',
        onClick: onCreate
      } : undefined}
    />
  )
}

export function NoUsers({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12" />}
      title="No team members"
      description="Invite team members to collaborate."
      action={onInvite ? {
        label: 'Invite team member',
        onClick: onInvite
      } : undefined}
    />
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title="Something went wrong"
      description="An error occurred while loading the data."
      action={onRetry ? {
        label: 'Try again',
        onClick: onRetry,
        variant: 'outline'
      } : undefined}
    />
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<RefreshCw className="h-12 w-12 text-destructive" />}
      title="Connection error"
      description="Unable to connect to the server. Please check your internet connection."
      action={onRetry ? {
        label: 'Retry',
        onClick: onRetry,
        variant: 'outline'
      } : undefined}
    />
  )
}
