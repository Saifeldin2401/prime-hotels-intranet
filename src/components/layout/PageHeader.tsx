import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string | ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in",
      className
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full"></div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {description && (
          <div className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed max-w-2xl">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}

