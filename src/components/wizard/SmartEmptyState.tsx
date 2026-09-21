import { type LucideIcon } from 'lucide-react'

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
