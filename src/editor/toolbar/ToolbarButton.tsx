import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
  variant?: 'editor' | 'floating'
}

export function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
  className,
  variant = 'editor',
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40',
        active && 'border-hotel-gold/60 bg-hotel-gold/15 text-hotel-navy',
        variant === 'floating' && 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white',
        variant === 'floating' && active && 'border-hotel-gold bg-hotel-gold/20 text-hotel-gold',
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default ToolbarButton
