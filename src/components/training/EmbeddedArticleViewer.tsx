/**
 * EmbeddedArticleViewer
 * 
 * Full-fidelity Knowledge Base article viewer embedded inside the Training Player.
 * Uses the exact same knowledgeService data hydrator, styling tokens, and content renderers
 * as the main KnowledgeViewer page.
 */

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { PdfViewer } from '@/components/common/PdfViewer'
import { ArticleContent } from '@/components/knowledge/ArticleContent'
import {
    ChecklistRenderer,
    FAQAccordion,
    ImageGalleryRenderer,
    VideoPlayer
} from '@/components/knowledge/ContentRenderers'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKnowledgeArticle } from '@/hooks/useKnowledge'
import { useTranslationAI, type TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { resolveDocumentUrl } from '@/lib/secureFileAccess'
import { supabase } from '@/lib/supabase'
import { normalizeTranslationErrorMessage } from '@/lib/translationUtils'
import { cn } from '@/lib/utils'
import '@/styles/knowledge-ui.css'
import { STATUS_CONFIG, type KnowledgeArticle } from '@/types/knowledge'
import { useQuery } from '@tanstack/react-query'
import {
    AlertCircle,
    BookOpen,
    Building2,
    CheckSquare,
    Clock,
    Download,
    ExternalLink,
    FileText,
    HelpCircle,
    Images,
    Loader2,
    ShieldCheck,
    Video,
    Zap
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type TranslationDiagnostics = {
    partialFailures: number
    totalSegments: number
}

type RichTranslationResult = {
    translatedHtml: string
    diagnostics: TranslationDiagnostics
}

const embeddedContentTranslationRequests = new Map<string, Promise<RichTranslationResult>>()

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface EmbeddedArticleViewerProps {
    sopId: string
    fallbackTitle?: string
    fallbackContent?: string
    showBilingual?: boolean
    translationDir?: 'ltr' | 'rtl'
    translationTarget?: TranslationTargetLanguage | null
    className?: string
}

interface EmbeddedHtmlContentProps {
    content: string | null | undefined
    translationTarget?: TranslationTargetLanguage | null
    translatedContent?: string | null
    isTranslating: boolean
    showBilingual?: boolean
    translationDir: 'ltr' | 'rtl'
    cacheVersion?: string | null
}

const EmbeddedHtmlContent = ({
    content,
    translationTarget,
    translatedContent,
    isTranslating,
    showBilingual,
    translationDir,
    cacheVersion
}: EmbeddedHtmlContentProps) => {
    const { t } = useTranslation('training')

    if (!content) return null

    const displayContent = (translationTarget && translatedContent) ? translatedContent : content
    const isTranslatingContent = Boolean(translationTarget && isTranslating)

    return (
        <div className={`prose md:prose-lg max-w-none dark:prose-invert leading-relaxed ${showBilingual ? 'grid md:grid-cols-2 gap-8' : ''}`}>
            {/* Translated or Main View */}
            <div dir={translationTarget && translatedContent ? translationDir : 'auto'} className="relative">
                {showBilingual && (
                    <div className="text-[10px] uppercase tracking-[0.2em] text-hotel-gold mb-2 font-bold">
                        {translationTarget || t('original', 'Original')}
                    </div>
                )}

                {isTranslatingContent ? (
                    <div className="space-y-4 animate-pulse">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>
                ) : (
                    <InlineErrorBoundary>
                        <ArticleContent
                            content={displayContent ?? ''}
                            className="prose md:prose-lg max-w-none text-slate-800 dark:text-slate-200 kb-prose transition-all duration-300"
                            cacheVersion={cacheVersion || undefined}
                        />
                    </InlineErrorBoundary>
                )}
            </div>

            {/* Original View (if Bilingual) */}
            {showBilingual && translationTarget && (
                <div dir="auto" className="border-l ps-6 border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 font-bold">
                        {t('original', 'Original')}
                    </div>
                    <InlineErrorBoundary>
                        <ArticleContent
                            content={content}
                            className="prose md:prose-lg max-w-none text-slate-800 dark:text-slate-200 kb-prose transition-all duration-300"
                            cacheVersion={cacheVersion || undefined}
                        />
                    </InlineErrorBoundary>
                </div>
            )}
        </div>
    )
}

export const EmbeddedArticleViewer = (props: EmbeddedArticleViewerProps) => {
    return (
        <EmbeddedArticleViewerInner
            key={`${props.sopId}-${props.translationTarget || 'original'}`}
            {...props}
        />
    )
}

const EmbeddedArticleViewerInner = ({
    sopId,
    fallbackTitle,
    fallbackContent,
    showBilingual,
    translationDir = 'ltr',
    translationTarget,
    className
}: EmbeddedArticleViewerProps) => {
    const { t } = useTranslation('training')
    const isLikelyUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    // Primary: fetch article via knowledgeService
    const {
        data: primaryArticle,
        isLoading: isPrimaryLoading,
        error: primaryError
    } = useKnowledgeArticle(isLikelyUuid(sopId) ? sopId : undefined)

    // Secondary fallback: if sopId is an sop_code or code string
    const shouldTryBySopCode = Boolean(sopId && !isLikelyUuid(sopId))
    const {
        data: fallbackByCodeArticle,
        isLoading: isCodeLoading,
        error: codeError
    } = useQuery({
        queryKey: ['knowledge-article-by-code', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select(`
                    *,
                    author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                    last_editor:profiles!documents_last_published_by_fkey(id, full_name, avatar_url),
                    department:departments(id, name),
                    category:categories!documents_category_id_fkey(id, name)
                `)
                .eq('content_type', 'sop')
                .eq('sop_code', sopId)
                .eq('is_deleted', false)
                .maybeSingle()

            if (error) throw error
            return data as unknown as KnowledgeArticle | null
        },
        enabled: shouldTryBySopCode,
        staleTime: 1000 * 60 * 5
    })

    const rawArticle = primaryArticle || fallbackByCodeArticle
    const article: KnowledgeArticle | null = rawArticle
        ? {
            ...rawArticle,
            title: rawArticle.title || fallbackTitle || '',
            content: rawArticle.content || fallbackContent || null
        }
        : (fallbackContent ? ({
            id: sopId,
            title: fallbackTitle || t('sopReference', 'Standard Operating Procedure'),
            content: fallbackContent,
            status: 'PUBLISHED',
            content_type: 'sop'
        } as unknown as KnowledgeArticle) : null)

    const isLoading = isPrimaryLoading || (shouldTryBySopCode && isCodeLoading)
    const resolvedError = article ? null : (primaryError || codeError)

    // Secure URL resolution for attached files / PDFs
    const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null)
    useEffect(() => {
        let cancelled = false
        if (!article?.id || !article?.file_url) {
            setResolvedFileUrl(null)
            return
        }
        resolveDocumentUrl(article.id, article.file_url).then((url) => {
            if (!cancelled) setResolvedFileUrl(url)
        })
        return () => { cancelled = true }
    }, [article?.id, article?.file_url])

    // AI Translation
    const translateAI = useTranslationAI()
    const [translatedContentByLanguage, setTranslatedContentByLanguage] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [translatedTitleByLanguage, setTranslatedTitleByLanguage] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [translatedSummaryByLanguage, setTranslatedSummaryByLanguage] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [translationDiagnosticsByLanguage, setTranslationDiagnosticsByLanguage] = useState<Partial<Record<TranslationTargetLanguage, TranslationDiagnostics>>>({})
    const [isTranslating, setIsTranslating] = useState(false)
    const [translationError, setTranslationError] = useState<string | null>(null)
    const translationAttemptRef = useRef<{ key: string; status: 'pending' | 'success' | 'error' } | null>(null)

    const translatedContent = translationTarget ? translatedContentByLanguage[translationTarget] ?? null : null
    const translatedTitle = translationTarget ? translatedTitleByLanguage[translationTarget] ?? null : null
    const translatedSummary = translationTarget ? translatedSummaryByLanguage[translationTarget] ?? null : null
    const translationDiagnostics = translationTarget ? translationDiagnosticsByLanguage[translationTarget] ?? null : null

    const invokeTranslationWithRetry = useCallback(async (request: {
        text: string
        target_lang: TranslationTargetLanguage
        source_lang: 'auto'
        preserve_format: boolean
        strict_target_only?: boolean
    }) => {
        const maxAttempts = 2
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await translateAI.mutateAsync(request)
            } catch (error) {
                if (attempt >= maxAttempts) throw error
                await delay(350 * attempt)
            }
        }
        throw new Error('Translation failed')
    }, [translateAI])

    const translateRichContent = useCallback(async (content: string, target: TranslationTargetLanguage, requestKey: string) => {
        const existingRequest = embeddedContentTranslationRequests.get(requestKey)
        if (existingRequest) return existingRequest

        const requestPromise = (async () => {
            let lastTranslatedHtml = content
            let partialFailures = 0
            let totalSegments = 0

            for (let pass = 1; pass <= 3; pass += 1) {
                const result = await invokeTranslationWithRetry({
                    text: content,
                    target_lang: target,
                    source_lang: 'auto',
                    preserve_format: true,
                    strict_target_only: true
                })

                lastTranslatedHtml = result.translated_text || content
                partialFailures = result.meta?.partial_failures ?? 0
                totalSegments = result.meta?.total_segments ?? 0

                if (partialFailures === 0) break
                await delay(220 * pass)
            }

            return {
                translatedHtml: lastTranslatedHtml,
                diagnostics: { partialFailures, totalSegments }
            }
        })()

        embeddedContentTranslationRequests.set(requestKey, requestPromise)
        try {
            return await requestPromise
        } finally {
            embeddedContentTranslationRequests.delete(requestKey)
        }
    }, [invokeTranslationWithRetry])

    const handleRetryTranslation = useCallback(() => {
        if (!translationTarget || !article) return
        const attemptKey = `${article.id}:${translationTarget}:${Date.now()}`
        translationAttemptRef.current = null

        setIsTranslating(true)
        setTranslationError(null)

        const tasks: Promise<void>[] = []

        if (article.content) {
            tasks.push(
                translateRichContent(article.content, translationTarget, `${attemptKey}:content`).then(({ translatedHtml, diagnostics }) => {
                    setTranslatedContentByLanguage(prev => ({ ...prev, [translationTarget]: translatedHtml }))
                    setTranslationDiagnosticsByLanguage(prev => ({ ...prev, [translationTarget]: diagnostics }))
                })
            )
        }

        if (article.title) {
            tasks.push(
                translateAI.mutateAsync({
                    text: article.title,
                    target_lang: translationTarget,
                    source_lang: 'auto',
                    strict_target_only: true
                }).then((res) => {
                    setTranslatedTitleByLanguage(prev => ({ ...prev, [translationTarget]: res.translated_text }))
                })
            )
        }

        if (article.summary) {
            tasks.push(
                translateAI.mutateAsync({
                    text: article.summary,
                    target_lang: translationTarget,
                    source_lang: 'auto',
                    strict_target_only: true
                }).then((res) => {
                    setTranslatedSummaryByLanguage(prev => ({ ...prev, [translationTarget]: res.translated_text }))
                })
            )
        }

        Promise.all(tasks)
            .catch((err) => {
                const message = normalizeTranslationErrorMessage(err instanceof Error ? err.message : 'Translation failed')
                setTranslationError(message)
            })
            .finally(() => setIsTranslating(false))
    }, [translationTarget, article, translateRichContent, translateAI])

    useEffect(() => {
        if (!translationTarget || !article) return

        const attemptKey = `${article.id || sopId}:${translationTarget}`
        if (translationAttemptRef.current?.key === attemptKey && translationAttemptRef.current.status !== 'error') {
            return
        }

        const translateContent = async () => {
            const needsContentTranslation = Boolean(article.content && !translatedContentByLanguage[translationTarget])
            const needsTitleTranslation = Boolean(article.title && !translatedTitleByLanguage[translationTarget])
            const needsSummaryTranslation = Boolean(article.summary && !translatedSummaryByLanguage[translationTarget])

            if (!needsContentTranslation && !needsTitleTranslation && !needsSummaryTranslation) return

            setIsTranslating(true)
            setTranslationError(null)
            translationAttemptRef.current = { key: attemptKey, status: 'pending' }

            try {
                const tasks: Promise<void>[] = []

                if (needsContentTranslation && article.content) {
                    tasks.push(
                        translateRichContent(article.content, translationTarget, `${attemptKey}:content`).then(({ translatedHtml, diagnostics }) => {
                            setTranslatedContentByLanguage(prev => ({ ...prev, [translationTarget]: translatedHtml }))
                            setTranslationDiagnosticsByLanguage(prev => ({ ...prev, [translationTarget]: diagnostics }))
                            if (diagnostics.partialFailures > 0) {
                                setTranslationError(`Translation incomplete. ${diagnostics.partialFailures} section${diagnostics.partialFailures === 1 ? '' : 's'} still need retry.`)
                            }
                        })
                    )
                }

                if (needsTitleTranslation && article.title) {
                    tasks.push(
                        translateAI.mutateAsync({
                            text: article.title,
                            target_lang: translationTarget,
                            source_lang: 'auto',
                            strict_target_only: true
                        }).then((titleRes) => {
                            setTranslatedTitleByLanguage(prev => ({ ...prev, [translationTarget]: titleRes.translated_text }))
                        })
                    )
                }

                if (needsSummaryTranslation && article.summary) {
                    tasks.push(
                        translateAI.mutateAsync({
                            text: article.summary,
                            target_lang: translationTarget,
                            source_lang: 'auto',
                            strict_target_only: true
                        }).then((sumRes) => {
                            setTranslatedSummaryByLanguage(prev => ({ ...prev, [translationTarget]: sumRes.translated_text }))
                        })
                    )
                }

                await Promise.all(tasks)
                if (translationAttemptRef.current?.key === attemptKey) {
                    translationAttemptRef.current.status = 'success'
                }
            } catch (err) {
                console.error("SOP Translation error:", err)
                const message = normalizeTranslationErrorMessage(err instanceof Error ? err.message : 'Translation failed')
                setTranslationError(message)
                if (translationAttemptRef.current?.key === attemptKey) {
                    translationAttemptRef.current.status = 'error'
                }
            } finally {
                setIsTranslating(false)
            }
        }

        if (translationTarget && article && (article.content || article.title || article.summary)) {
            translateContent()
        }
    }, [article, sopId, translationTarget, translateAI, translatedContentByLanguage, translatedTitleByLanguage, translatedSummaryByLanguage, translateRichContent])

    if (isLoading) {
        return (
            <div className="space-y-4 p-6 sm:p-8 border rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="pt-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (resolvedError || !article) {
        return (
            <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('errorLoadingSop', 'Error Loading Resource')}</AlertTitle>
                <AlertDescription>
                    {t('sopNotFoundOrError', 'The referenced Standard Operating Procedure (SOP) could not be loaded. It may have been removed or you do not have permission to view it.')}
                </AlertDescription>
            </Alert>
        )
    }

    // Content checks
    const isPdf = Boolean(article.file_url?.toLowerCase().endsWith('.pdf'))
    const isImage = Boolean(article.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    const hasHtmlContent = Boolean(article.content || article.content_ar || fallbackContent)
    const hasChecklist = Array.isArray(article.checklist_items) && article.checklist_items.length > 0
    const hasFaq = Array.isArray(article.faq_items) && article.faq_items.length > 0
    const hasImages = Array.isArray(article.images) && article.images.length > 0
    const hasVideo = Boolean(article.video_url || (article.content_type === 'video' && (article.video_url || article.file_url)))
    const hasSummary = Boolean(article.summary || article.description)
    const hasAnyContent = hasHtmlContent || hasChecklist || hasFaq || hasImages || hasVideo || isPdf || isImage || hasSummary

    const displayTitle = (translationTarget && translatedTitle)
        ? translatedTitle
        : (article.title || t('sopReference', 'Standard Operating Procedure'))

    const displaySummary = (translationTarget && translatedSummary)
        ? translatedSummary
        : (article.summary || article.description)

    const statusStyle = article.status && STATUS_CONFIG[article.status]
        ? STATUS_CONFIG[article.status]
        : { label: article.status || 'PUBLISHED', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }

    // External route to full article viewer
    const openInKnowledgeBaseHref = `/knowledge/${article.id || sopId}`

    return (
        <Card className={cn("overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl", className)}>
            <CardContent className="p-0">
                {/* 1. Header Banner */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                            {isTranslating ? <Loader2 className="h-6 w-6 animate-spin" /> : <BookOpen className="h-6 w-6" />}
                        </div>
                        <div className="space-y-2 min-w-0 flex-1">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {article.sop_code && (
                                    <Badge variant="outline" className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5">
                                        {article.sop_code}
                                    </Badge>
                                )}
                                {article.content_type && (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80">
                                        <FileText className="h-3 w-3 me-1" />
                                        {article.content_type}
                                    </Badge>
                                )}
                                {article.status && (
                                    <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wide uppercase", statusStyle.color)}>
                                        {statusStyle.label}
                                    </span>
                                )}
                                {article.current_version && (
                                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                                        <ShieldCheck className="inline-block h-3 w-3 me-0.5" />
                                        {`v${article.current_version}`}
                                    </span>
                                )}
                                {article.department?.name && (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {article.department.name}
                                    </span>
                                )}
                                {article.estimated_read_time && (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {`${article.estimated_read_time} min`}
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h2 className="font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-slate-100 leading-snug">
                                {displayTitle}
                            </h2>

                            {article.description && !article.summary && (
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {article.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                        {translationError && (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                                {translationError}
                            </span>
                        )}
                        {translationTarget && translationDiagnostics?.partialFailures ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={handleRetryTranslation}
                                disabled={isTranslating}
                            >
                                {isTranslating ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                                {t('retryTranslation', 'Retry Translation')}
                            </Button>
                        ) : null}
                        {article.file_url && (
                            <Button variant="outline" size="sm" asChild className="h-9">
                                <a href={resolvedFileUrl || article.file_url} target="_blank" rel="noreferrer">
                                    <Download className="me-2 h-4 w-4" />
                                    {t('download', 'Download')}
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:text-hotel-navy hover:border-hotel-gold text-slate-700 dark:text-slate-200 font-semibold shadow-xs"
                        >
                            <a href={openInKnowledgeBaseHref} target="_blank" rel="noreferrer">
                                <ExternalLink className="me-2 h-4 w-4 text-hotel-gold" />
                                {t('viewInKnowledgeBase', 'View in Knowledge Base')}
                            </a>
                        </Button>
                    </div>
                </div>

                {/* 2. Content Area */}
                <div className="p-6 sm:p-8 md:p-10 space-y-8 bg-white dark:bg-slate-900 min-h-[300px]">
                    {hasAnyContent ? (
                        <>
                            {/* Key Highlights / Summary Banner */}
                            {displaySummary && (
                                <div className="relative group p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent">
                                    <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-[15px] p-5 sm:p-6 shadow-xs border border-indigo-100/50 dark:border-indigo-900/30">
                                        <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <Zap className="h-3.5 w-3.5 fill-indigo-600 dark:fill-indigo-400" />
                                            {t('viewer.tldr', 'Key Summary')}
                                        </h3>
                                        <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                            "{displaySummary}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Attached File Quick Preview */}
                            {article.file_url && !isPdf && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('viewer.attached_file', 'Attached Document')}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{article.file_url.split('/').pop()}</p>
                                        </div>
                                    </div>
                                    <div className="flex w-full sm:w-auto gap-2">
                                        <Button variant="ghost" size="sm" className="h-9 flex-1 sm:flex-none px-3 sm:px-4 rounded-lg hover:bg-white dark:hover:bg-slate-700" disabled={!resolvedFileUrl} onClick={() => resolvedFileUrl && window.open(resolvedFileUrl, '_blank')}>
                                            <ExternalLink className="h-4 w-4 me-2" />
                                            {t('viewer.view', 'View')}
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none px-3 sm:px-4 rounded-lg bg-white dark:bg-slate-800" disabled={!resolvedFileUrl} onClick={() => resolvedFileUrl && window.open(resolvedFileUrl, '_blank')}>
                                            <Download className="h-4 w-4 me-2" />
                                            {t('viewer.download', 'Download')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* PDF Viewer if applicable */}
                            {isPdf && resolvedFileUrl && (
                                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                    <PdfViewer url={resolvedFileUrl} />
                                </div>
                            )}

                            {/* Video Player if available */}
                            {hasVideo && (
                                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                    <VideoPlayer
                                        videoUrl={article.video_url || article.file_url!}
                                        title={displayTitle}
                                    />
                                </div>
                            )}

                            {/* Main Article Content Card */}
                            {hasHtmlContent && (
                                <div className="article-content-wrapper">
                                    <EmbeddedHtmlContent
                                        content={article.content || article.content_ar || fallbackContent}
                                        translationTarget={translationTarget}
                                        translatedContent={translatedContent}
                                        isTranslating={isTranslating}
                                        showBilingual={showBilingual}
                                        translationDir={translationDir}
                                        cacheVersion={article.updated_at}
                                    />
                                </div>
                            )}

                            {/* Checklist Procedure Steps */}
                            {hasChecklist && (
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                                        <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        <span>{t('checklistSteps', 'Checklist Procedure Steps')}</span>
                                    </div>
                                    <ChecklistRenderer items={article.checklist_items!} />
                                </div>
                            )}

                            {/* FAQ Accordion */}
                            {hasFaq && (
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                                        <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        <span>{t('faqTitle', 'Frequently Asked Questions')}</span>
                                    </div>
                                    <FAQAccordion items={article.faq_items!} />
                                </div>
                            )}

                            {/* Visual Image Gallery */}
                            {hasImages && (
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                                        <Images className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        <span>{t('visualGallery', 'Visual Reference Gallery')}</span>
                                    </div>
                                    <ImageGalleryRenderer
                                        images={article.images!}
                                        cacheVersion={article.updated_at || undefined}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <AlertCircle className="h-10 w-10 mb-3 opacity-20" />
                            <p className="italic">{t('viewer.no_content', 'No content available for this procedure.')}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
