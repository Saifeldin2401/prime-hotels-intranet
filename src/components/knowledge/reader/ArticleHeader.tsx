import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Calendar,
  Crown,
  Eye,
  FileText,
  GitBranch,
  Pencil,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ArticleHeaderProps {
  article: {
    id?: string
    title: string
    description?: string | null
    updated_at?: string
    content_type?: string
    version?: number
    current_version?: number
    published_version_number?: number
    is_master_template?: boolean
    master_source_id?: string | null
    scope_type?: string
    author?: {
      full_name?: string
      avatar_url?: string
    } | null
    department?: {
      id?: string
      name?: string
    } | null
    last_editor?: {
      full_name?: string
    } | null
    view_count?: number
  }
  statusColor?: string
  statusLabel: string
  hasBeenUpdatedSinceLastView?: boolean
  translatedData?: {
    title: string
    description?: string
  } | null
  showBilingual?: boolean
  isRtlTarget?: boolean
  shouldUseRtl?: boolean
  readingTime?: number
  className?: string
}

export function ArticleHeader({
  article,
  statusColor = 'gray',
  statusLabel,
  hasBeenUpdatedSinceLastView = false,
  translatedData,
  showBilingual = false,
  isRtlTarget = false,
  shouldUseRtl = false,
  readingTime = 1,
  className,
}: ArticleHeaderProps) {
  const { t } = useTranslation('knowledge')

  return (
    <header className={cn("border-b border-ds-border/60 bg-ds-surface/50 backdrop-blur-sm print:border-none print:bg-transparent", className)}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col gap-6">
          {/* Upper Metadata */}
          <div className="flex flex-wrap items-center gap-3">
            {hasBeenUpdatedSinceLastView && (
              <Badge className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-orange-100 text-orange-700 ring-1 ring-orange-200 animate-pulse">
                {t('viewer.updated_since_view', 'Updated since you last viewed')}
              </Badge>
            )}
            <Badge
              className={cn(
                'rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider',
                statusColor === 'green' && 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
                statusColor === 'yellow' && 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
                statusColor === 'gray' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
                statusColor === 'red' && 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
              )}
            >
              {statusLabel}
            </Badge>
            {article.content_type && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <FileText className="h-3 w-3" />
                {t(`content_types.${article.content_type}`)}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-800/40 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              <ShieldCheck className="h-3 w-3" />
              {`v${article.current_version || article.version || 1}`}
              {article.published_version_number &&
              article.published_version_number !== (article.current_version || article.version)
                ? ` · ${t('viewer.published_revision', 'Published')} v${article.published_version_number}`
                : ''}
            </div>
            {article.is_master_template && (
              <Badge className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-1 ring-amber-400/50 flex items-center gap-1.5 shadow-2xs">
                <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                {t('viewer.corporate_standard', 'Corporate Master Standard')}
              </Badge>
            )}
            {article.master_source_id && (
              <Badge className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 ring-1 ring-indigo-300/60 flex items-center gap-1.5 shadow-2xs">
                <GitBranch className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                {t('viewer.inherited_master', 'Inherited Brand Standard')}
              </Badge>
            )}
            {article.scope_type && article.scope_type !== 'organization' && (
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-white/70 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                {article.scope_type}
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <div className="max-w-4xl space-y-4">
            <h1
              className={cn(
                'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-display font-black text-ds-ink dark:text-white leading-[1.15] tracking-tight',
                shouldUseRtl && 'font-arabic leading-[1.25]'
              )}
            >
              {translatedData && !showBilingual ? translatedData.title : article.title}
            </h1>

            {showBilingual && translatedData && (
              <h1
                dir={isRtlTarget ? 'rtl' : 'ltr'}
                className={cn(
                  'text-2xl md:text-4xl font-serif font-bold text-ds-brass dark:text-ds-brass leading-snug',
                  isRtlTarget
                    ? 'font-arabic pe-6 border-e-4 border-ds-brass/60'
                    : 'ps-6 border-s-4 border-ds-brass/60'
                )}
              >
                {translatedData.title}
              </h1>
            )}

            {(translatedData?.description || article.description) && (
              <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-3xl">
                {translatedData ? translatedData.description : article.description}
              </p>
            )}
          </div>

          {/* Lower Metadata Row */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-4 sm:gap-x-8 mt-4 pt-6 sm:pt-8 border-t border-slate-200/60 dark:border-slate-800">
            {article.author && (
              <div className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage src={article.author.avatar_url} />
                  <AvatarFallback className="bg-ds-ink text-white font-bold">
                    {article.author.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {article.author.full_name}
                  </span>
                  {article.department?.name && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      {article.department.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            {article.last_editor?.full_name && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <Pencil className="h-3.5 w-3.5 text-slate-400" />
                <span>{article.last_editor.full_name}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('viewer.updated')}
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-ds-brass" />
                  {t('viewer.updated_at', {
                    date: article.updated_at ? new Date(article.updated_at).toLocaleDateString() : '',
                  })}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8 bg-slate-200/60 dark:bg-slate-800" />

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('viewer.reading_time', 'Est. Time')}
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Timer className="h-3.5 w-3.5 text-ds-ink dark:text-ds-brass" />
                  {readingTime} {t('article.min_read', 'min read')}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8 bg-slate-200/60 dark:bg-slate-800" />

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('viewer.views', 'Views')}
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                  {article.view_count || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
