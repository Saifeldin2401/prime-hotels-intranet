import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
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
          <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          <h1 className="text-3xl font-bold text-gradient tracking-tight">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed max-w-2xl">
            {description}
          </p>
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

