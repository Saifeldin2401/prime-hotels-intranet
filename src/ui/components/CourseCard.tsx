import React from 'react'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge, type StatusVariant } from './StatusBadge'
import { ProgressBar } from './ProgressBar'

export interface CourseCardProps {
  id: string
  title: string
  imageUrl?: string
  status: string
  statusVariant?: StatusVariant
  lessonCount?: number
  currentLessonIndex?: number
  progressPercentage?: number
  durationMinutes?: number
  href: string
  actionLabel?: string
  className?: string
}

export const CourseCard: React.FC<CourseCardProps> = ({
  title,
  imageUrl = '/assets/altus/course-guest-service.jpg',
  status,
  statusVariant = 'neutral',
  lessonCount,
  currentLessonIndex,
  progressPercentage = 0,
  durationMinutes,
  href,
  actionLabel = 'Continue →',
  className = '',
}) => {
  return (
    <div
      className={`group flex flex-col bg-ds-surface border border-ds-border rounded-[8px] overflow-hidden shadow-none transition-colors duration-150 ${className}`}
    >
      {/* Hospitality Photography Cover */}
      <div className="relative h-44 w-full bg-ds-ink overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 start-3">
          <StatusBadge variant={statusVariant} label={status} size="sm" />
        </div>
      </div>

      {/* Course Content */}
      <div className="flex flex-col flex-1 p-5 space-y-4">
        <div className="space-y-1.5 flex-1">
          <h3 className="text-base font-semibold text-ds-ink line-clamp-2 group-hover:text-ds-accent transition-colors">
            {title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-ds-muted">
            {lessonCount !== undefined && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {currentLessonIndex !== undefined
                  ? `Lesson ${currentLessonIndex} of ${lessonCount}`
                  : `${lessonCount} lessons`}
              </span>
            )}
            {durationMinutes && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {durationMinutes}m
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <ProgressBar
            value={progressPercentage}
            showPercentage={true}
            size="sm"
            variant={progressPercentage === 100 ? 'success' : 'accent'}
          />
        </div>

        {/* Action Link */}
        <div className="pt-2 border-t border-ds-border/60 flex justify-end">
          <Link
            to={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ds-ink hover:text-ds-accent transition-colors min-h-[44px]"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  )
}
