import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  description?: string | ReactNode
  actions?: ReactNode
  className?: string
  backTo?: string
}

export function PageHeader({ title, description, actions, className, backTo }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {backTo ? (
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 rounded-full">
                <Link to={backTo}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="h-6 sm:h-8 w-1 bg-primary rounded-full shrink-0"></div>
            )}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
          </div>
        </div>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <div className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl ps-3 sm:ps-4">
          {description}
        </div>
      )}
    </div>
  )
}

