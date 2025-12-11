import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'table'
  lines?: number
  width?: string
  height?: string
}

export function LoadingSkeleton({ 
  className, 
  variant = 'text', 
  lines = 1, 
  width,
  height 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse rounded-md bg-muted'

  const variantClasses = {
    card: 'h-48 w-full',
    text: 'h-4 w-full',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24',
    table: 'h-8 w-full'
  }

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  baseClasses,
                  'h-4',
                  i === lines - 1 ? 'w-3/4' : 'w-full',
                  className
                )}
                style={{ width: i === lines - 1 ? '75%' : width }}
              />
            ))}
          </div>
        )
      
      case 'card':
        return (
          <div className={cn(baseClasses, variantClasses.card, className)}>
            <div className="p-6 space-y-4">
              <div className={cn(baseClasses, 'h-6 w-1/3')} />
              <div className={cn(baseClasses, 'h-4 w-full')} />
              <div className={cn(baseClasses, 'h-4 w-5/6')} />
              <div className="flex justify-end">
                <div className={cn(baseClasses, 'h-8 w-20')} />
              </div>
            </div>
          </div>
        )
      
      case 'table':
        return (
          <div className="space-y-2">
            <div className={cn(baseClasses, 'h-8 w-full')} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className={cn(baseClasses, 'h-8 w-16')} />
                <div className={cn(baseClasses, 'h-8 w-32')} />
                <div className={cn(baseClasses, 'h-8 w-24')} />
                <div className={cn(baseClasses, 'h-8 w-20')} />
              </div>
            ))}
          </div>
        )
      
      default:
        return (
          <div 
            className={cn(
              baseClasses,
              variantClasses[variant],
              className
            )}
            style={{ width, height }}
          />
        )
    }
  }

  return renderSkeleton()
}

export function CardSkeleton({ className }: { className?: string }) {
  return <LoadingSkeleton variant="card" className={className} />
}

export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return <LoadingSkeleton variant="text" lines={lines} className={className} />
}

export function AvatarSkeleton({ className }: { className?: string }) {
  return <LoadingSkeleton variant="avatar" className={className} />
}

export function ButtonSkeleton({ className }: { className?: string }) {
  return <LoadingSkeleton variant="button" className={className} />
}

export function TableSkeleton({ className }: { className?: string }) {
  return <LoadingSkeleton variant="table" className={className} />
}
