/**
 * PinButton Component
 * 
 * A reusable pin/unpin button with star icon.
 * Shows filled star when pinned, outline when not.
 * Supports RTL layouts and includes tooltip.
 */

import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import type { PinItemType } from '@/hooks/usePins'
import { MAX_PINS, useIsPinned, usePinsCount, useTogglePin } from '@/hooks/usePins'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface PinButtonProps {
  itemType: PinItemType
  itemId: string
  title?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'ghost' | 'outline' | 'secondary'
  className?: string
  showTooltip?: boolean
  onPinChange?: (isPinned: boolean) => void
}

export function PinButton({
  itemType,
  itemId,
  title,
  size = 'sm',
  variant = 'ghost',
  className,
  showTooltip = true,
  onPinChange
}: PinButtonProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  
  const { data: isPinned, isLoading: isChecking } = useIsPinned(itemType, itemId)
  const { data: pinsCount } = usePinsCount()
  const togglePin = useTogglePin()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (togglePin.isPending || isChecking) return

    // Check if we're at max pins and trying to add
    if (!isPinned && pinsCount !== undefined && pinsCount >= MAX_PINS) {
      toast.error(
        t('pins.errors.max_reached', 'Maximum {{max}} pinned items reached', { max: MAX_PINS }),
        {
          description: t('pins.errors.unpin_first', 'Unpin something first to add a new item.')
        }
      )
      return
    }

    try {
      await togglePin.mutateAsync({
        itemType,
        itemId,
        title,
        isCurrentlyPinned: !!isPinned
      })
      onPinChange?.(!isPinned)
    } catch {
      // Error is handled by the mutation
    }
  }

  const buttonContent = (
    <Button
      variant={variant}
      size={size === 'default' ? 'icon' : size === 'sm' ? 'icon-sm' : 'icon'}
      className={cn(
        'transition-all duration-200',
        isPinned && 'text-amber-500 hover:text-amber-600',
        !isPinned && 'text-slate-400 hover:text-amber-500',
        togglePin.isPending && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={togglePin.isPending || isChecking}
      aria-label={isPinned 
        ? t('pins.actions.unpin', 'Unpin from dashboard') 
        : t('pins.actions.pin', 'Pin to dashboard')
      }
    >
      <Star 
        className={cn(
          'transition-all duration-200',
          size === 'sm' && 'h-4 w-4',
          size === 'default' && 'h-5 w-5',
          size === 'lg' && 'h-6 w-6',
          isPinned && 'fill-current'
        )} 
      />
    </Button>
  )

  if (!showTooltip) {
    return buttonContent
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          sideOffset={4}
          className={cn(
            'bg-slate-800 text-white text-xs px-2 py-1 rounded-md',
            isRTL && 'font-sans'
          )}
        >
          {isPinned 
            ? t('pins.tooltip.unpin', 'Unpin from dashboard') 
            : t('pins.tooltip.pin', 'Pin to dashboard')
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact pin button for use in lists/cards
 * Shows just the icon without tooltip for space-constrained areas
 */
export function PinButtonCompact({
  itemType,
  itemId,
  title,
  className,
  onPinChange
}: Omit<PinButtonProps, 'size' | 'variant' | 'showTooltip'>) {
  return (
    <PinButton
      itemType={itemType}
      itemId={itemId}
      title={title}
      size="sm"
      variant="ghost"
      showTooltip={false}
      className={cn('h-8 w-8', className)}
      onPinChange={onPinChange}
    />
  )
}

/**
 * Pin button with text label
 * Good for use in action menus or dropdowns
 */
export function PinButtonWithLabel({
  itemType,
  itemId,
  title,
  className,
  onPinChange
}: Omit<PinButtonProps, 'size' | 'variant' | 'showTooltip'>) {
  const { t } = useTranslation('dashboard')
  const { data: isPinned, isLoading: isChecking } = useIsPinned(itemType, itemId)
  const { data: pinsCount } = usePinsCount()
  const togglePin = useTogglePin()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (togglePin.isPending || isChecking) return

    // Check if we're at max pins and trying to add
    if (!isPinned && pinsCount !== undefined && pinsCount >= MAX_PINS) {
      toast.error(
        t('pins.errors.max_reached', 'Maximum {{max}} pinned items reached', { max: MAX_PINS }),
        {
          description: t('pins.errors.unpin_first', 'Unpin something first to add a new item.')
        }
      )
      return
    }

    try {
      await togglePin.mutateAsync({
        itemType,
        itemId,
        title,
        isCurrentlyPinned: !!isPinned
      })
      onPinChange?.(!isPinned)
    } catch {
      // Error is handled by the mutation
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'gap-2 text-sm font-medium transition-colors',
        isPinned ? 'text-amber-600 hover:text-amber-700' : 'text-slate-600 hover:text-amber-600',
        className
      )}
      onClick={handleClick}
      disabled={togglePin.isPending || isChecking}
    >
      <Star 
        className={cn(
          'h-4 w-4 transition-all',
          isPinned && 'fill-current'
        )} 
      />
      {isPinned 
        ? t('pins.actions.unpin', 'Unpin') 
        : t('pins.actions.pin', 'Pin to dashboard')
      }
    </Button>
  )
}
