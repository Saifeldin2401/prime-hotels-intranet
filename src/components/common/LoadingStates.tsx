import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

interface LoadingSkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function LoadingSkeleton({ className, children }: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded', className)}>
      {children}
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message }: PageLoadingProps) {
  const { t } = useTranslation('common')
  const defaultMessage = message || t('common.loading')
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600">{defaultMessage}</p>
    </div>
  )
}

interface TableLoadingProps {
  rows?: number
  columns?: number
}

export function TableLoading({ rows = 5, columns = 4 }: TableLoadingProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border rounded">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton
              key={colIndex}
              className={cn(
                'h-4',
                colIndex === 0 ? 'w-24' : colIndex === columns - 1 ? 'w-16' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface CardLoadingProps {
  count?: number
}

export function CardLoading({ count = 3 }: CardLoadingProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-6 space-y-4">
          <LoadingSkeleton className="h-6 w-3/4" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-2/3" />
          <div className="flex justify-end gap-2 pt-4">
            <LoadingSkeleton className="h-8 w-20" />
            <LoadingSkeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StatsLoadingProps {
  count?: number
}

export function StatsLoading({ count = 4 }: StatsLoadingProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-6">
          <LoadingSkeleton className="h-4 w-1/2 mb-2" />
          <LoadingSkeleton className="h-8 w-3/4" />
          <LoadingSkeleton className="h-3 w-full mt-2" />
        </div>
      ))}
    </div>
  )
}

interface FormLoadingProps {
  fields?: number
}

export function FormLoading({ fields = 5 }: FormLoadingProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-6">
        <LoadingSkeleton className="h-10 w-24" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
