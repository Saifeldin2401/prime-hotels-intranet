/**
 * InlineBlockPreview
 * 
 * Renders a type-specific inline preview for content blocks within
 * the Training Builder canvas. Supports text (HTML), video, quiz,
 * image, audio, document, SOP, and interactive block types.
 */

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  ExternalLink,
  FileCheck,
  FileText,
  Headphones,
  Image as ImageIcon,
  Link,
  Video
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { InlineQuizPreview } from './InlineQuizPreview'

interface ContentBlockForm {
  id: string
  type: string
  content: string
  content_url: string
  content_data: Record<string, unknown>
  is_mandatory: boolean
  title: string
  duration?: number
  points?: number
  order: number
}

interface InlineBlockPreviewProps {
  block: ContentBlockForm
  isRTL: boolean
  onRegenerateQuiz?: () => void
}

export function InlineBlockPreview({ block, isRTL, onRegenerateQuiz }: InlineBlockPreviewProps) {
  const { t } = useTranslation('training')

  // ------ Text / Rich HTML content ------
  if (block.type === 'text' || block.type === 'sop_reference') {
    if (!block.content && block.type === 'sop_reference') {
      // SOP reference with no embedded content — show reference card
      const sopTitle = (block.content_data as Record<string, unknown>)?.sop_title as string | undefined
      return (
        <div className={cn(
          'flex items-center gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40',
          isRTL ? 'flex-row-reverse' : ''
        )}>
          <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : 'text-left')}>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200 truncate">
              {sopTitle || block.title || t('builder.inlinePreview.sopReference', 'Knowledge Base SOP')}
            </p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
              {t('builder.inlinePreview.linkedSOP', 'Linked from Knowledge Base')}
            </p>
          </div>
          {block.content_url && (
            <a href={block.content_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-emerald-600 hover:text-emerald-800">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )
    }

    if (!block.content) {
      return (
        <div className="p-3 text-xs text-muted-foreground italic text-center">
          {t('builder.inlinePreview.noContent', 'No content added yet')}
        </div>
      )
    }

    return (
      <InlineErrorBoundary>
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200',
            'max-h-[300px] overflow-y-auto px-3 py-2',
            '[&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5',
            '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
            '[&_p]:text-xs [&_p]:leading-relaxed [&_p]:my-1',
            '[&_ul]:text-xs [&_ul]:my-1 [&_ol]:text-xs [&_ol]:my-1',
            '[&_li]:text-xs [&_li]:my-0.5',
            '[&_table]:text-xs [&_th]:p-1.5 [&_td]:p-1.5',
            '[&_blockquote]:text-xs [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_blockquote]:italic',
            '[&_.callout]:text-xs [&_.callout]:p-2 [&_.callout]:rounded-md [&_.callout]:my-2',
            '[&_.callout-info]:bg-blue-50 [&_.callout-info]:dark:bg-blue-950/30 [&_.callout-info]:border [&_.callout-info]:border-blue-200',
            '[&_.callout-warning]:bg-amber-50 [&_.callout-warning]:dark:bg-amber-950/30 [&_.callout-warning]:border [&_.callout-warning]:border-amber-200',
            isRTL ? 'text-right' : 'text-left'
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
        />
      </InlineErrorBoundary>
    )
  }

  // ------ Quiz blocks ------
  if (block.type === 'quiz') {
    const quizId = (block.content_data as Record<string, unknown>)?.quiz_id as string | undefined
    if (!quizId) {
      return (
        <div className="p-3 text-center text-xs text-muted-foreground italic">
          {t('builder.inlinePreview.quizNotLinked', 'Quiz not linked yet — save or generate questions first')}
        </div>
      )
    }
    return (
      <div className="p-2">
        <InlineQuizPreview
          quizId={quizId}
          onRegenerate={onRegenerateQuiz}
          isRTL={isRTL}
        />
      </div>
    )
  }

  // ------ Video ------
  if (block.type === 'video') {
    if (!block.content_url) {
      return (
        <div className={cn(
          'flex items-center gap-3 p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-dashed border-rose-200/60',
          isRTL ? 'flex-row-reverse' : ''
        )}>
          <Video className="w-5 h-5 text-rose-400" />
          <span className="text-xs text-muted-foreground italic">{t('builder.inlinePreview.noVideo', 'No video URL added yet')}</span>
        </div>
      )
    }
    return (
      <div className="rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-slate-700">
        <div className="aspect-video">
          <iframe
            src={block.content_url}
            className="w-full h-full"
            allowFullScreen
            title={block.title || 'Video Preview'}
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  // ------ Image ------
  if (block.type === 'image') {
    if (!block.content_url) {
      return (
        <div className={cn(
          'flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-dashed border-blue-200/60',
          isRTL ? 'flex-row-reverse' : ''
        )}>
          <ImageIcon className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-muted-foreground italic">{t('builder.inlinePreview.noImage', 'No image uploaded yet')}</span>
        </div>
      )
    }
    return (
      <div className="rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <img
          src={block.content_url}
          alt={block.title || 'Preview'}
          className="max-w-full max-h-[250px] mx-auto object-contain"
          loading="lazy"
        />
      </div>
    )
  }

  // ------ Audio ------
  if (block.type === 'audio') {
    if (!block.content_url) {
      return (
        <div className={cn(
          'flex items-center gap-3 p-4 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-lg border border-dashed border-cyan-200/60',
          isRTL ? 'flex-row-reverse' : ''
        )}>
          <Headphones className="w-5 h-5 text-cyan-400" />
          <span className="text-xs text-muted-foreground italic">{t('builder.inlinePreview.noAudio', 'No audio file added yet')}</span>
        </div>
      )
    }
    return (
      <div className="p-3">
        <audio controls className="w-full" src={block.content_url} preload="metadata">
          {t('builder.inlinePreview.audioUnsupported', 'Your browser does not support the audio element.')}
        </audio>
      </div>
    )
  }

  // ------ Document Link ------
  if (block.type === 'document_link') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/40',
        isRTL ? 'flex-row-reverse' : ''
      )}>
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-amber-600" />
        </div>
        <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : 'text-left')}>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200 truncate">
            {block.title || t('builder.inlinePreview.document', 'Document')}
          </p>
          {block.content_url && (
            <a
              href={block.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-600 hover:text-amber-800 hover:underline flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              {t('builder.inlinePreview.openDocument', 'Open document')}
            </a>
          )}
        </div>
      </div>
    )
  }

  // ------ Practical Assignment ------
  if (block.type === 'assignment' || block.type === 'practical') {
    const prompt = (block.content_data?.instructions as string) || block.content
    const rubric = block.content_data?.rubric as string | undefined
    const requiresApproval = block.content_data?.requires_instructor_approval !== false

    return (
      <div className={cn(
        'p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-2.5',
        isRTL ? 'text-right' : 'text-left'
      )}>
        <div className={cn("flex items-center justify-between gap-2", isRTL ? "flex-row-reverse" : "")}>
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
              {block.title || t('practicalAssignment', 'Practical Assignment')}
            </span>
          </div>
          {requiresApproval && (
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium shrink-0">
              {t('requiresInstructorReview', 'Requires Trainer Review')}
            </span>
          )}
        </div>
        {prompt ? (
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {prompt}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {t('builder.inlinePreview.noContent', 'No prompt/instructions provided yet')}
          </p>
        )}
        {rubric && (
          <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold">{t('evaluationRubric', 'Rubric')}: </span>
            <span>{rubric}</span>
          </div>
        )}
      </div>
    )
  }

  // ------ Fallback ------
  return (
    <div className="p-3 text-xs text-muted-foreground italic text-center">
      {t('builder.inlinePreview.unsupportedType', 'Preview not available for this content type')}
    </div>
  )
}
