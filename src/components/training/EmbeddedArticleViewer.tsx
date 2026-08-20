import {
    ArticleContent,
    ChecklistRenderer,
    FAQAccordion,
    ImageGalleryRenderer,
    VideoPlayer
} from '@/components/knowledge/ContentRenderers'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { PdfViewer } from '@/components/common/PdfViewer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslationAI, type TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { supabase } from '@/lib/supabase'
import { normalizeTranslationErrorMessage } from '@/lib/translationUtils'
import { useQuery } from '@tanstack/react-query'
import {
    AlertCircle,
    BookOpen,
    Building2,
    CheckSquare,
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
import { resolveStorageUrl } from '@/lib/secureFileAccess'
import { cn } from '@/lib/utils'
import type { ChecklistItem, FAQItem } from '@/types/knowledge'

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

export type EnhancedSopDocument = {
    id: string
    title: string
    title_ar?: string | null
    description?: string | null
    description_ar?: string | null
    content?: string | null
    content_ar?: string | null
    summary?: string | null
    status?: string | null
    content_type?: string | null
    sop_code?: string | null
    file_url?: string | null
    video_url?: string | null
    checklist_items?: ChecklistItem[] | null
    faq_items?: FAQItem[] | null
    images?: Array<{
        id: string
        url: string
        caption: string
        order: number
    }> | null
    tags?: string[] | null
    current_version?: number | null
    version?: number | null
    updated_at?: string | null
    published_at?: string | null
    department?: { id: string; name: string } | null
    category?: { id: string; name: string } | null
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
        <div className={`prose md:prose-lg max-w-none dark:prose-invert leading-relaxed ${showBilingual ? 'grid md:grid-cols-2 gap-6' : ''}`}>
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
                            className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed"
                            cacheVersion={cacheVersion || undefined}
                        />
                    </InlineErrorBoundary>
                )}
            </div>

            {/* Original View (if Bilingual) */}
            {showBilingual && translationTarget && (
                <div dir="auto" className="border-l ps-6 border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                        {t('original', 'Original')}
                    </div>
                    <InlineErrorBoundary>
                        <ArticleContent
                            content={content}
                            className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed"
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

    const { data: documentData, isLoading: isDocumentLoading, error: documentError } = useQuery({
        queryKey: ['document-embed-full', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select(`
                    id, title, title_ar, description, description_ar, content, content_ar, summary,
                    status, content_type, sop_code, file_url, video_url, checklist_items, faq_items, images,
                    tags, current_version, updated_at, published_at, is_deleted,
                    department:departments(id, name),
                    category:categories!documents_category_id_fkey(id, name)
                `)
                .eq('id', sopId)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .maybeSingle()

            if (error) throw error
            return data as unknown as EnhancedSopDocument | null
        },
        enabled: !!sopId,
        staleTime: 0
    })

    const isLikelyUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    const shouldTryBySopCode = !!sopId && !isDocumentLoading && !isLikelyUuid(sopId) && (!documentData || !!documentError)

    const { data: legacyDocument, isLoading: isLegacyLoading, error: legacyError } = useQuery({
        queryKey: ['legacy-sop-document-by-code-full', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select(`
                    id, title, title_ar, description, description_ar, content, content_ar, summary,
                    status, content_type, sop_code, file_url, video_url, checklist_items, faq_items, images,
                    tags, current_version, updated_at, published_at, is_deleted,
                    department:departments(id, name),
                    category:categories!documents_category_id_fkey(id, name)
                `)
                .eq('content_type', 'sop')
                .eq('sop_code', sopId)
                .maybeSingle()

            if (error) throw error
            return data as unknown as EnhancedSopDocument | null
        },
        enabled: shouldTryBySopCode,
        staleTime: 0
    })

    const rawDocument = (documentData || legacyDocument) as EnhancedSopDocument | null
    const document: EnhancedSopDocument | null = rawDocument
        ? {
            ...rawDocument,
            title: rawDocument.title || fallbackTitle || '',
            content: rawDocument.content || fallbackContent || null
        }
        : (fallbackContent ? {
            id: sopId,
            title: fallbackTitle || t('sopReference', 'Standard Operating Procedure'),
            content: fallbackContent,
            status: 'PUBLISHED'
        } : null)

    const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null)
    useEffect(() => {
        let cancelled = false
        if (!document?.file_url) {
            setResolvedFileUrl(null)
            return
        }
        resolveStorageUrl(document.file_url, 3600, 'documents').then(url => {
            if (!cancelled) setResolvedFileUrl(url)
        })
        return () => { cancelled = true }
    }, [document?.file_url])

    const isLoading = isDocumentLoading || (shouldTryBySopCode && isLegacyLoading)
    const resolvedError = document ? null : (documentError || legacyError)

    // Translation state
    const translateAI = useTranslationAI()
    const [translatedContentByLanguage, setTranslatedContentByLanguage] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [translatedTitleByLanguage, setTranslatedTitleByLanguage] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [translationDiagnosticsByLanguage, setTranslationDiagnosticsByLanguage] = useState<Partial<Record<TranslationTargetLanguage, TranslationDiagnostics>>>({})
    const [isTranslating, setIsTranslating] = useState(false)
    const [translationError, setTranslationError] = useState<string | null>(null)
    const translationAttemptRef = useRef<{ key: string; status: 'pending' | 'success' | 'error' } | null>(null)
    const translatedContent = translationTarget ? translatedContentByLanguage[translationTarget] ?? null : null
    const translatedTitle = translationTarget ? translatedTitleByLanguage[translationTarget] ?? null : null
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
                if (attempt >= maxAttempts) {
                    throw error
                }
                await delay(350 * attempt)
            }
        }

        throw new Error('Translation failed')
    }, [translateAI])

    const translateRichContent = useCallback(async (content: string, target: TranslationTargetLanguage, requestKey: string) => {
        const existingRequest = embeddedContentTranslationRequests.get(requestKey)
        if (existingRequest) {
            return existingRequest
        }

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

                if (partialFailures === 0) {
                    break
                }

                await delay(220 * pass)
            }

            return {
                translatedHtml: lastTranslatedHtml,
                diagnostics: {
                    partialFailures,
                    totalSegments
                }
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
        if (!translationTarget) return

        setTranslatedContentByLanguage(prev => {
            const next = { ...prev }
            delete next[translationTarget]
            return next
        })
        setTranslationDiagnosticsByLanguage(prev => {
            const next = { ...prev }
            delete next[translationTarget]
            return next
        })
        translationAttemptRef.current = null
        setTranslationError(null)
    }, [translationTarget])

    useEffect(() => {
        setTranslatedContentByLanguage({})
        setTranslatedTitleByLanguage({})
        setTranslationDiagnosticsByLanguage({})
        setTranslationError(null)
        translationAttemptRef.current = null
    }, [document?.id])

    useEffect(() => {
        setTranslationError(null)
        translationAttemptRef.current = null
    }, [translationTarget])

    // Effect to trigger translation
    useEffect(() => {
        const translateContent = async () => {
            if (!document || !translationTarget) return

            const needsContentTranslation = Boolean(document.content && !translatedContentByLanguage[translationTarget])
            const needsTitleTranslation = Boolean(document.title && !translatedTitleByLanguage[translationTarget])

            if ((!needsContentTranslation && !needsTitleTranslation) || isTranslating) return

            const attemptKey = `${document.id}-${translationTarget}`
            if (translationAttemptRef.current?.key === attemptKey) {
                if (translationAttemptRef.current.status !== 'pending') return
            } else {
                translationAttemptRef.current = { key: attemptKey, status: 'pending' }
            }

            setIsTranslating(true)
            setTranslationError(null)
            try {
                const tasks: Promise<void>[] = []

                if (needsContentTranslation && document.content) {
                    tasks.push(
                        translateRichContent(document.content, translationTarget, `${attemptKey}:content`).then(({ translatedHtml, diagnostics }) => {
                            setTranslatedContentByLanguage(prev => ({
                                ...prev,
                                [translationTarget]: translatedHtml
                            }))
                            setTranslationDiagnosticsByLanguage(prev => ({
                                ...prev,
                                [translationTarget]: diagnostics
                            }))
                            if (diagnostics.partialFailures > 0) {
                                setTranslationError(`Translation incomplete. ${diagnostics.partialFailures} section${diagnostics.partialFailures === 1 ? '' : 's'} still need retry.`)
                            }
                        })
                    )
                }

                if (needsTitleTranslation && document.title) {
                    tasks.push(
                        translateAI.mutateAsync({
                            text: document.title,
                            target_lang: translationTarget,
                            source_lang: 'auto',
                            strict_target_only: true
                        }).then((titleRes) => {
                            setTranslatedTitleByLanguage(prev => ({
                                ...prev,
                                [translationTarget]: titleRes.translated_text
                            }))
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

        if (translationTarget && document && (document.content || document.title)) {
            translateContent()
        }
    }, [document, document?.id, document?.content, document?.title, translationTarget, translateAI, translatedContentByLanguage, translatedTitleByLanguage, isTranslating, translateRichContent])

    if (isLoading) {
        return (
            <div className="space-y-4 p-6 border rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="pt-4">
                    <Skeleton className="h-32 w-full rounded-lg" />
                </div>
            </div>
        )
    }

    if (resolvedError || !document) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('errorLoadingSop', 'Error Loading Resource')}</AlertTitle>
                <AlertDescription>
                    {t('sopNotFoundOrError', 'The referenced Standard Operating Procedure (SOP) could not be loaded. It may have been removed or you do not have permission to view it.')}
                </AlertDescription>
            </Alert>
        )
    }

    // Content checks
    const isPdf = Boolean(document.file_url?.toLowerCase().endsWith('.pdf'))
    const isImage = Boolean(document.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    const hasHtmlContent = Boolean(document.content || document.content_ar || fallbackContent)
    const hasChecklist = Array.isArray(document.checklist_items) && document.checklist_items.length > 0
    const hasFaq = Array.isArray(document.faq_items) && document.faq_items.length > 0
    const hasImages = Array.isArray(document.images) && document.images.length > 0
    const hasVideo = Boolean(document.video_url || (document.content_type === 'video' && (document.video_url || document.file_url)))
    const hasAnyContent = hasHtmlContent || hasChecklist || hasFaq || hasImages || hasVideo || isPdf || isImage || Boolean(document.summary) || Boolean(document.description)

    const displayTitle = (translationTarget && translatedTitle)
        ? translatedTitle
        : (document.title || t('sopReference', 'Standard Operating Procedure'))

    // The official Knowledge Base article route is /knowledge/:id
    const openInKnowledgeBaseHref = `/knowledge/${document.id || sopId}`

    return (
        <Card className={cn("overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900", className)}>
            <CardContent className="p-0">
                {/* Header */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            {isTranslating ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {document.sop_code && (
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                        {document.sop_code}
                                    </Badge>
                                )}
                                {document.content_type && (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80">
                                        <FileText className="h-3 w-3 me-1" />
                                        {document.content_type}
                                    </Badge>
                                )}
                                {document.status && (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold tracking-wide">
                                        {document.status}
                                    </span>
                                )}
                                {document.current_version && (
                                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                                        <ShieldCheck className="inline-block h-3 w-3 me-0.5" />
                                        {`v${document.current_version}`}
                                    </span>
                                )}
                                {document.department?.name && (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {document.department.name}
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 leading-tight">
                                {displayTitle}
                            </h3>

                            {document.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {document.description}
                                </p>
                            )}
                        </div>
                    </div>

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
                        {document.file_url && (
                            <Button variant="outline" size="sm" asChild className="h-9">
                                <a href={resolvedFileUrl || document.file_url} target="_blank" rel="noreferrer">
                                    <Download className="me-2 h-4 w-4" />
                                    {t('download', 'Download')}
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:text-hotel-navy hover:border-hotel-gold text-slate-700 dark:text-slate-200 font-semibold"
                        >
                            <a href={openInKnowledgeBaseHref} target="_blank" rel="noreferrer">
                                <ExternalLink className="me-2 h-4 w-4 text-hotel-gold" />
                                {t('viewInKnowledgeBase', 'View in Knowledge Base')}
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 md:p-8 space-y-8 bg-white dark:bg-slate-900 min-h-[250px]">
                    {hasAnyContent ? (
                        <>
                            {/* 1. TL;DR / Quick Summary Banner */}
                            {document.summary && (
                                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                                    <div className="flex items-center gap-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                        <Zap className="h-4 w-4 text-amber-600 fill-amber-500" />
                                        <span>{t('viewer.tldr', 'Key Summary')}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                        "{document.summary}"
                                    </p>
                                </div>
                            )}

                            {/* 2. Video Player if available */}
                            {hasVideo && (
                                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                    <VideoPlayer
                                        videoUrl={document.video_url || document.file_url!}
                                        title={displayTitle}
                                    />
                                </div>
                            )}

                            {/* 3. HTML / Article Content */}
                            {hasHtmlContent && (
                                <EmbeddedHtmlContent
                                    content={document.content || document.content_ar || fallbackContent}
                                    translationTarget={translationTarget}
                                    translatedContent={translatedContent}
                                    isTranslating={isTranslating}
                                    showBilingual={showBilingual}
                                    translationDir={translationDir}
                                    cacheVersion={document.updated_at}
                                />
                            )}

                            {/* 4. Interactive Checklist Steps */}
                            {hasChecklist && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-base font-bold text-hotel-navy dark:text-slate-100">
                                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                                        <span>{t('checklistSteps', 'Checklist Procedure Steps')}</span>
                                    </div>
                                    <ChecklistRenderer items={document.checklist_items!} />
                                </div>
                            )}

                            {/* 5. FAQs Accordion */}
                            {hasFaq && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-base font-bold text-hotel-navy dark:text-slate-100">
                                        <HelpCircle className="h-5 w-5 text-hotel-gold" />
                                        <span>{t('faqTitle', 'Frequently Asked Questions')}</span>
                                    </div>
                                    <FAQAccordion items={document.faq_items!} />
                                </div>
                            )}

                            {/* 6. Visual Image Gallery */}
                            {hasImages && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-base font-bold text-hotel-navy dark:text-slate-100">
                                        <Images className="h-5 w-5 text-indigo-600" />
                                        <span>{t('visualGallery', 'Visual Guide Gallery')}</span>
                                    </div>
                                    <ImageGalleryRenderer
                                        images={document.images!}
                                        cacheVersion={document.updated_at || undefined}
                                    />
                                </div>
                            )}

                            {/* 7. PDF Viewer if applicable */}
                            {isPdf && resolvedFileUrl && (
                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[600px] bg-slate-100 dark:bg-slate-950">
                                    <PdfViewer url={resolvedFileUrl} />
                                </div>
                            )}

                            {/* 8. Attached Image Viewer if applicable */}
                            {isImage && resolvedFileUrl && (
                                <div className="flex justify-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                    <img
                                        src={resolvedFileUrl}
                                        alt={document.title}
                                        className="max-h-[600px] w-auto object-contain rounded shadow-sm"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-400">
                            <FileText className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-4" />
                            <h4 className="text-lg font-medium text-hotel-navy dark:text-slate-200 mb-2">
                                {displayTitle}
                            </h4>
                            <p className="max-w-md mb-6 text-sm text-slate-500">
                                {t('sopReferenceHint', 'Standard Operating Procedure details can be viewed directly in the Knowledge Base.')}
                            </p>
                            <Button asChild className="bg-hotel-navy hover:bg-hotel-navy-light text-white">
                                <a href={openInKnowledgeBaseHref} target="_blank" rel="noreferrer">
                                    <ExternalLink className="me-2 h-4 w-4" />
                                    {t('viewInKnowledgeBase', 'View in Knowledge Base')}
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
