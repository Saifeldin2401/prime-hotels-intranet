/**
 * MobileHeader Component
 * 
 * Sticky header optimized for mobile devices with:
 * - Back navigation
 * - Title truncation
 * - Action buttons
 * - Safe area support
 */

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ChevronLeft, Menu, MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface MobileHeaderProps {
  /** Page title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Show back button */
  showBack?: boolean
  /** Custom back handler */
  onBack?: () => void
  /** Right side actions */
  actions?: React.ReactNode
  /** Menu button handler */
  onMenuClick?: () => void
  /** Loading state */
  isLoading?: boolean
  /** Custom class */
  className?: string
  /** Sticky header */
  sticky?: boolean
  /** Custom left element (replaces back button) */
  leftElement?: React.ReactNode
  /** Show bottom border */
  bordered?: boolean
}

/**
 * MobileHeader - Optimized header for mobile screens
 * 
 * Usage:
 * ```tsx
 * <MobileHeader
 *   title="User Profile"
 *   subtitle="Edit your information"
 *   showBack
 *   actions={<Button>Save</Button>}
 * />
 * ```
 */
export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  onMenuClick,
  isLoading = false,
  className,
  sticky = true,
  leftElement,
  bordered = true,
}: MobileHeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'nav'])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  if (isLoading) {
    return (
      <header
        className={cn(
          'bg-background/95 backdrop-blur-sm safe-area-top',
          sticky && 'sticky top-0 z-40',
          bordered && 'border-b',
          className
        )}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        'bg-background/95 backdrop-blur-sm safe-area-top',
        sticky && 'sticky top-0 z-40',
        bordered && 'border-b',
        className
      )}
    >
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Left side */}
        <div className="flex items-center shrink-0">
          {leftElement ? (
            leftElement
          ) : showBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 -ms-2 min-h-touch min-w-touch"
              onClick={handleBack}
              aria-label={t('accessibility.go_back', 'Go back')}
            >
              <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
            </Button>
          ) : onMenuClick ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 -ms-2 min-h-touch min-w-touch"
              onClick={onMenuClick}
              aria-label={t('accessibility.open_menu', 'Open menu')}
            >
              <Menu className="h-6 w-6" />
            </Button>
          ) : null}
        </div>

        {/* Center - Title */}
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-semibold text-lg truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center justify-end shrink-0 min-w-[40px]">
          {actions}
        </div>
      </div>
    </header>
  )
}

interface MobileHeaderActionProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  variant?: 'ghost' | 'outline' | 'default'
  disabled?: boolean
}

/**
 * MobileHeaderAction - Standard action button for MobileHeader
 */
export function MobileHeaderAction({
  icon,
  label,
  onClick,
  variant = 'ghost',
  disabled,
}: MobileHeaderActionProps) {
  return (
    <Button
      variant={variant}
      size="icon"
      className="h-11 w-11 min-h-touch min-w-touch"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
    </Button>
  )
}

/**
 * MobileHeaderMenu - Menu trigger for MobileHeader
 */
export function MobileHeaderMenu({
  children,
  align = 'end',
}: {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  const { t } = useTranslation(['common', 'nav'])
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 min-h-touch min-w-touch"
        aria-label={t('accessibility.more_options', 'More options')}
      >
        <MoreVertical className="h-5 w-5" />
      </Button>
      {/* Dropdown content would be managed by parent */}
    </div>
  )
}
