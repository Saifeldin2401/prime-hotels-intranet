import React from 'react'
import { Bookmark, Clock, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'

export interface KnowledgeCardProps {
  id: string
  title: string
  summary?: string
  category: string
  contentType: string
  version?: string | number
  readTimeMinutes?: number
  isBookmarked?: boolean
  onToggleBookmark?: () => void
  href: string
  className?: string
}

export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({
  title,
  summary,
  category,
  contentType,
  version,
  readTimeMinutes = 3,
  isBookmarked = false,
  onToggleBookmark,
  href,
  className = '',
}) => {
  return (
    <div
      className={`group flex flex-col justify-between p-5 bg-ds-surface border border-ds-border rounded-[8px] space-y-4 hover:border-ds-brass/40 transition-colors duration-150 ${className}`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ds-brass">
              {category}
            </span>
            <span className="text-ds-border">•</span>
            <StatusBadge variant="neutral" label={contentType} size="sm" />
          </div>

          {onToggleBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onToggleBookmark()
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              className="p-1 rounded text-ds-muted hover:text-ds-brass transition-colors"
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isBookmarked
                    ? 'fill-ds-brass text-ds-brass'
                    : ''
                }`}
              />
            </button>
          )}
        </div>

        <Link to={href} className="block group-hover:text-ds-brass transition-colors">
          <h3 className="text-base font-semibold text-ds-ink line-clamp-2">
            {title}
          </h3>
        </Link>

        {summary && (
          <p className="text-xs text-ds-muted line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ds-border/60 text-xs text-ds-muted font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{readTimeMinutes}m read</span>
        </div>

        {version && (
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>v{version}</span>
          </div>
        )}
      </div>
    </div>
  )
}
