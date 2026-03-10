import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileText, Download, ExternalLink, AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { sanitizeHtml } from '@/lib/sanitize'
import { PdfViewer } from '@/components/common/PdfViewer'
import { useTranslationAI, type TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'

interface EmbeddedArticleViewerProps {
    sopId: string
    showBilingual?: boolean
    translationDir?: 'ltr' | 'rtl'
    translationTarget?: TranslationTargetLanguage | null
    className?: string
}

type LegacySopDocument = {
    id: string
    title: string
    description?: string | null
    content?: string | null
    status?: string | null
    file_url?: string | null
    updated_at?: string | null
    published_at?: string | null
    code?: string | null
}

interface EmbeddedHtmlContentProps {
    content: string | null | undefined
    translationTarget?: TranslationTargetLanguage | null
    translatedContent?: string | null
    isTranslating: boolean
    showBilingual?: boolean
    translationDir: 'ltr' | 'rtl'
}

const EmbeddedHtmlContent = ({
    content,
    translationTarget,
    translatedContent,
    isTranslating,
    showBilingual,
    translationDir
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
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }} />
                    </InlineErrorBoundary>
                )}
            </div>

            {/* Original View (if Bilingual) */}
            {showBilingual && translationTarget && (
                <div dir="auto" className="border-l pl-6 border-slate-100">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                        {t('original', 'Original')}
                    </div>
                    <InlineErrorBoundary>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
                    </InlineErrorBoundary>
                </div>
            )}
        </div>
    )
}

export const EmbeddedArticleViewer = (props: EmbeddedArticleViewerProps) => {
    // Use a key to force re-mount when critical props change
    // This is cleaner than useEffect for state resets and fixes the react-doctor error
    return (
        <EmbeddedArticleViewerInner
            key={`${props.sopId}-${props.translationTarget || 'original'}`}
            {...props}
        />
    )
}

const EmbeddedArticleViewerInner = ({
    sopId,
    showBilingual,
    translationDir = 'ltr',
    translationTarget,
    className
}: EmbeddedArticleViewerProps) => {
    const { t } = useTranslation('training')
    const { data: documentData, isLoading: isDocumentLoading, error: documentError } = useQuery({
        queryKey: ['document-embed', sopId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, description, content, status, file_url, updated_at, is_deleted')
                .eq('id', sopId)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .maybeSingle()

            if (error) throw error
            return data as LegacySopDocument | null
        },
        enabled: !!sopId
    })
    const shouldTryLegacy = !!sopId && !isDocumentLoading && (!documentData || !!documentError)

    const isLikelyUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    const { data: legacyDocument, isLoading: isLegacyLoading, error: legacyError } = useQuery({
        queryKey: ['legacy-sop-document', sopId],
        queryFn: async () => {
            let query = supabase
                .from('sop_documents')
                .select('id, title, description, content, status, updated_at, published_at, code')

            if (isLikelyUuid(sopId)) {
                query = query.eq('id', sopId)
            } else {
                query = query.eq('code', sopId)
            }

            const { data, error } = await query.maybeSingle()

            if (error) throw error
            return data as LegacySopDocument | null
        },
        enabled: shouldTryLegacy
    })

    const document = (documentData || legacyDocument) as LegacySopDocument | null
    const isLoading = isDocumentLoading || (shouldTryLegacy && isLegacyLoading)
    const resolvedError = document ? null : (documentError || legacyError)

    // Translation state
    const translateAI = useTranslationAI()
    const [translatedContent, setTranslatedContent] = useState<string | null>(null)
    const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translationError, setTranslationError] = useState<string | null>(null)
    const translationAttemptRef = useRef<{ key: string; status: 'pending' | 'success' | 'error' } | null>(null)

    useEffect(() => {
        setTranslatedContent(null)
        setTranslatedTitle(null)
        setTranslationError(null)
        translationAttemptRef.current = null
    }, [document?.id, translationTarget])

    // Effect to trigger translation
    useEffect(() => {
        const translateContent = async () => {
            if (!document || !translationTarget || !document.content) return

            if (translatedContent || isTranslating) return

            const attemptKey = `${document.id}-${translationTarget}`
            if (translationAttemptRef.current?.key === attemptKey) {
                if (translationAttemptRef.current.status !== 'pending') return
            } else {
                translationAttemptRef.current = { key: attemptKey, status: 'pending' }
            }

            setIsTranslating(true)
            setTranslationError(null)
            try {
                // Translate content
                const contentRes = await translateAI.mutateAsync({
                    text: document.content,
                    target_lang: translationTarget,
                    source_lang: 'auto',
                    preserve_format: true // Important for HTML
                })
                setTranslatedContent(contentRes.translated_text)

                // Translate title
                if (document.title) {
                    const titleRes = await translateAI.mutateAsync({
                        text: document.title,
                        target_lang: translationTarget,
                        source_lang: 'auto'
                    })
                    setTranslatedTitle(titleRes.translated_text)
                }

                if (translationAttemptRef.current?.key === attemptKey) {
                    translationAttemptRef.current.status = 'success'
                }
            } catch (err) {
                console.error("SOP Translation error:", err)
                const message = err instanceof Error ? err.message : 'Translation failed'
                setTranslationError(message)
                if (translationAttemptRef.current?.key === attemptKey) {
                    translationAttemptRef.current.status = 'error'
                }
            } finally {
                setIsTranslating(false)
            }
        }

        if (translationTarget && document && document.content) {
            translateContent()
        }
    }, [document, document?.id, document?.content, document?.title, translationTarget, translateAI, translatedContent, isTranslating])

    if (isLoading) {
        return (
            <div className="space-y-4 p-6 border rounded-xl bg-white shadow-sm">
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

    const isPdf = document.file_url?.toLowerCase().endsWith('.pdf')
    const isImage = document.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    const hasContent = !!document.content
    const viewMode = (hasContent || isPdf || isImage) ? 'inline' : 'fallback'

    const displayTitle = (translationTarget && translatedTitle) ? translatedTitle : (document.title || t('sopReference', 'Standard Operating Procedure'))
    const openInNewTabHref = documentData ? `/documents/${sopId}` : `/knowledge/${sopId}`

    return (
        <Card className={`overflow-hidden border-slate-200 shadow-sm ${className}`}>
            <CardContent className="p-0">
                {/* Header */}
                <div className="bg-slate-50/80 border-b border-slate-100 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            {isTranslating ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg text-hotel-navy leading-tight">
                                    {displayTitle}
                                </h3>
                                {document.status && document.status !== 'PUBLISHED' && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold tracking-wide">
                                        {document.status}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1">
                                {document.description || t('sopReference', 'Standard Operating Procedure')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {translationError && (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                                {translationError}
                            </span>
                        )}
                        {document.file_url && (
                            <Button variant="outline" size="sm" asChild className="h-9">
                                <a href={document.file_url} target="_blank" rel="noreferrer">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('download', 'Download')}
                                </a>
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild className="h-9 text-slate-500 hover:text-hotel-navy">
                            <a href={openInNewTabHref} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t('openInNewTab', 'Open in New Tab')}
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 md:p-8 bg-white min-h-[300px]">
                    {viewMode === 'inline' ? (
                        <>
                            {/* 1. Article/HTML Content */}
                            {document.content && (
                                <div className="mb-8">
                                    <EmbeddedHtmlContent
                                        content={document.content}
                                        translationTarget={translationTarget}
                                        translatedContent={translatedContent}
                                        isTranslating={isTranslating}
                                        showBilingual={showBilingual}
                                        translationDir={translationDir}
                                    />
                                </div>
                            )}

                            {/* 2. PDF Viewer */}
                            {isPdf && document.file_url && (
                                <div className="rounded-xl overflow-hidden border border-slate-200 h-[600px] bg-slate-100">
                                    <PdfViewer url={document.file_url} />
                                </div>
                            )}

                            {/* 3. Image Viewer */}
                            {isImage && document.file_url && (
                                <div className="flex justify-center bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    <img
                                        src={document.file_url}
                                        alt={document.title}
                                        className="max-h-[600px] w-auto object-contain rounded shadow-sm"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                            <FileText className="h-16 w-16 text-slate-200 mb-4" />
                            <h4 className="text-lg font-medium text-hotel-navy mb-2">
                                {t('previewNotAvailable', 'Preview Not Available')}
                            </h4>
                            <p className="max-w-md mb-6">
                                {t('documentCannotBePreviewed', 'This document type cannot be viewed directly in the player.')}
                            </p>
                            {document.file_url && (
                                <Button asChild>
                                    <a href={document.file_url} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('downloadToView', 'Download to View')}
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
