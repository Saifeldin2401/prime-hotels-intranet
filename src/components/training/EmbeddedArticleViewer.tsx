import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, ExternalLink, AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { useDocument } from '@/hooks/useDocuments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { sanitizeHtml } from '@/lib/sanitize'
import { PdfViewer } from '@/components/common/PdfViewer'
import { useTranslationAI, type TranslationTargetLanguage } from '@/hooks/useTranslationAI'

interface EmbeddedArticleViewerProps {
    sopId: string
    showBilingual?: boolean
    translationDir?: 'ltr' | 'rtl'
    translationTarget?: TranslationTargetLanguage | null
    className?: string
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
    // ... rest of the component logic ...
    const { data: document, isLoading, error } = useDocument(sopId)
    const [viewMode, setViewMode] = useState<'inline' | 'fallback'>('inline')

    // Translation state
    const translateAI = useTranslationAI()
    const [translatedContent, setTranslatedContent] = useState<string | null>(null)
    const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
    const [isTranslating, setIsTranslating] = useState(false)

    // Effect to trigger translation
    useEffect(() => {
        const translateContent = async () => {
            if (!document || !translationTarget || !document.content) return

            // If we already have it, don't re-fetch
            if (translatedContent) return

            setIsTranslating(true)
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
            } catch (err) {
                console.error("SOP Translation error:", err)
            } finally {
                setIsTranslating(false)
            }
        }

        if (translationTarget && document && document.content) {
            translateContent()
        }
    }, [document, translationTarget, translateAI, translatedContent])

    // Effect to determine initial view mode based on file type
    useEffect(() => {
        if (document) {
            const isPdf = document.file_url?.toLowerCase().endsWith('.pdf')
            const isImage = document.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            const hasContent = !!document.content

            if (hasContent || isPdf || isImage) {
                setViewMode('inline')
            } else {
                setViewMode('fallback')
            }
        }
    }, [document])

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

    if (error || !document) {
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

    // Helper to render HTML content safely
    const renderHtmlContent = () => {
        if (!document.content) return null

        const displayContent = (translationTarget && translatedContent) ? translatedContent : document.content
        const isTranslatingContent = translationTarget && isTranslating

        return (
            <div className={`prose md:prose-lg max-w-none dark:prose-invert leading-relaxed ${showBilingual ? 'grid md:grid-cols-2 gap-6' : ''}`}>
                {/* Translated or Main View */}
                <div dir={translationTarget && translatedContent ? translationDir : 'auto'} className="relative">
                    {showBilingual && (
                        <div className="text-[10px] uppercase tracking-[0.2em] text-hotel-gold mb-2 font-bold">
                            {translationTarget || 'Original'}
                        </div>
                    )}

                    {isTranslatingContent ? (
                        <div className="space-y-4 animate-pulse">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }} />
                    )}
                </div>

                {/* Original View (if Bilingual) */}
                {showBilingual && translationTarget && (
                    <div dir="auto" className="border-l pl-6 border-slate-100">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                            {t('original', 'Original')}
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.content) }} />
                    </div>
                )}
            </div>
        )
    }

    const displayTitle = (translationTarget && translatedTitle) ? translatedTitle : document.title

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
                                {document.status !== 'PUBLISHED' && (
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
                        {document.file_url && (
                            <Button variant="outline" size="sm" asChild className="h-9">
                                <a href={document.file_url} target="_blank" rel="noreferrer">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('download', 'Download')}
                                </a>
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild className="h-9 text-slate-500 hover:text-hotel-navy">
                            <a href={`/documents/${sopId}`} target="_blank" rel="noreferrer">
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
                                    {renderHtmlContent()}
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
