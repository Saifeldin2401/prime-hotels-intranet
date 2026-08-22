import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { PdfViewer } from '@/components/common/PdfViewer'
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitize'
import { resolveStorageUrl } from '@/lib/secureFileAccess'
import type { TrainingContentBlock } from '@/lib/types'
import { Link as LinkIcon, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DocumentBlockRendererProps {
    block: TrainingContentBlock
    translatedContent?: string
    showBilingual?: boolean
    translationLabel?: string
    translationDir?: 'ltr' | 'rtl'
}

interface DocumentBlockDescriptionProps {
    originalMarkup: string
    translatedMarkup: string
    hasTranslation: boolean
    showBilingual?: boolean
    translationLabel?: string
    translationDir: 'ltr' | 'rtl'
}

const DocumentBlockDescription = ({
    originalMarkup,
    translatedMarkup,
    hasTranslation,
    showBilingual,
    translationLabel,
    translationDir
}: DocumentBlockDescriptionProps) => {
    const { t } = useTranslation('training')

    // SECURITY: All markup is pre-sanitized before being passed to this component
    // The sanitizeHtml function is called in the parent component (DocumentBlockRenderer)
    // to ensure all content is safe before rendering

    if (!hasTranslation) {
        return (
            <div className="text-sm text-gray-500 prose max-w-none dark:prose-invert">
                <InlineErrorBoundary>
                    {/* SECURITY: Content sanitized via sanitizeHtml() in parent */}
                    <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                </InlineErrorBoundary>
            </div>
        )
    }

    if (showBilingual) {
        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-500 prose max-w-none dark:prose-invert">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                        {t('original', 'Original')}
                    </div>
                    <InlineErrorBoundary>
                        {/* SECURITY: Content sanitized via sanitizeHtml() in parent */}
                        <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                    </InlineErrorBoundary>
                </div>
                <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
                        {t('translatedTo', { language: translationLabel || t('translated', 'Translated') })}
                    </div>
                    <InlineErrorBoundary>
                        {/* SECURITY: Content sanitized via sanitizeHtml() in parent */}
                        <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                    </InlineErrorBoundary>
                </div>
            </div>
        )
    }

    return (
        <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
            <InlineErrorBoundary>
                {/* SECURITY: Content sanitized via sanitizeHtml() in parent */}
                <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
            </InlineErrorBoundary>
        </div>
    )
}

export const DocumentBlockRenderer = ({
    block,
    translatedContent,
    showBilingual,
    translationLabel,
    translationDir = 'ltr'
}: DocumentBlockRendererProps) => {
    const { t } = useTranslation('training')
    
    /**
     * SECURITY: URL validation to prevent javascript: and other dangerous protocols
     */
    const getSafeUrl = (value?: string | null): string | null => {
        if (!value) return null
        const trimmed = value.trim()
        if (!trimmed) return null

        // Bare storage object keys (e.g. "training/documents/<uuid>.pdf") are not
        // navigable URLs -- resolveStorageUrl() below signs them against Supabase
        // Storage. Routing a protocol-less key through sanitizeUrl() is wrong:
        // `new URL(path, location.href)` silently resolves it as a RELATIVE path
        // against the current page, turning a valid storage key into a same-origin
        // URL that fetches the SPA's own index.html (looks like "storage is
        // broken" but the file was never touched).
        const hasSchemeOrIsProtocolRelative = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)
        if (!hasSchemeOrIsProtocolRelative) {
            if (trimmed.includes('..')) {
                console.warn('Blocked suspicious storage path in DocumentBlockRenderer:', trimmed.substring(0, 50))
                return null
            }
            return trimmed
        }

        // Anything with an actual scheme (http(s):, javascript:, data:, //host, etc.)
        // goes through the centralized sanitizer for protocol validation.
        const sanitized = sanitizeUrl(trimmed)
        if (!sanitized) {
            console.warn('Blocked dangerous URL in DocumentBlockRenderer:', trimmed.substring(0, 50))
        }
        return sanitized
    }

    const safeContentUrl = getSafeUrl(block.content_url)

    // The 'documents' storage bucket is private - a URL captured at author-upload time
    // (via handleFileUpload's getPublicUrl()) never actually resolves. Re-sign it fresh
    // for the current viewer before linking/rendering it.
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
    const [resolving, setResolving] = useState(!!safeContentUrl)
    const [retryToken, setRetryToken] = useState(0)

    useEffect(() => {
        let cancelled = false
        setResolving(!!safeContentUrl)
        if (!safeContentUrl) {
            setResolvedUrl(null)
            return
        }
        // Training Builder uploads land in the private 'documents' bucket and are
        // stored as a bare object path, so tell the resolver which bucket to sign against.
        // 1hr TTL: a 5min TTL used to race against how long a learner actually spends
        // on a step before opening the attached PDF, expiring the link under their feet.
        resolveStorageUrl(safeContentUrl, 3600, 'documents').then((url) => {
            if (!cancelled) {
                setResolvedUrl(url)
                setResolving(false)
            }
        })
        return () => { cancelled = true }
    }, [safeContentUrl, retryToken])

    // Re-signs a fresh URL on demand (network hiccup, an unusually long-lived tab, etc.)
    // instead of leaving the learner stuck on a dead link with only a "Download" fallback.
    const handleRetry = useCallback(() => {
        setRetryToken((t) => t + 1)
    }, [])

    const isPdf = (() => {
        try {
            return new URL(safeContentUrl ?? '').pathname.toLowerCase().endsWith('.pdf')
        } catch {
            return safeContentUrl?.toLowerCase().endsWith('.pdf') ?? false
        }
    })()

    // SECURITY: Sanitize HTML content before rendering
    // This prevents XSS attacks from malicious content in the block
    const originalMarkup = sanitizeHtml(block.content, { allowIframes: false })
    const translatedMarkup = translatedContent ? sanitizeHtml(translatedContent, { allowIframes: false }) : ''

    if (!isPdf) {
        return (
            <div className="space-y-4">
                <div className="p-6 border rounded-lg bg-slate-50 flex items-center gap-4">
                    <LinkIcon className="h-8 w-8 text-blue-500" />
                    <div>
                        <h4 className="font-medium">{t('attachedDocument')}</h4>
                        {resolving ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-400 text-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t('resolvingLink', 'Resolving link...')}
                            </span>
                        ) : resolvedUrl ? (
                            <a
                                href={resolvedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all"
                            >
                                {safeContentUrl}
                            </a>
                        ) : (
                            <span className="text-slate-500 break-all">
                                {t('noLinkProvided')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="mt-2">
                    <DocumentBlockDescription
                        originalMarkup={originalMarkup}
                        translatedMarkup={translatedMarkup}
                        hasTranslation={!!translatedContent}
                        showBilingual={showBilingual}
                        translationLabel={translationLabel}
                        translationDir={translationDir}
                    />
                </div>
            </div>
        )
    }

    if (resolving) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-slate-50 text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-hotel-gold" />
                <span className="text-xs">{t('loadingPdf', 'Loading document...')}</span>
            </div>
        )
    }

    if (!resolvedUrl) {
        return (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-slate-50 text-slate-500 gap-3">
                <p className="text-sm font-medium">{t('unableToLoadDocument', 'Unable to access attached PDF document.')}</p>
                <button
                    type="button"
                    onClick={handleRetry}
                    className="text-xs font-medium text-hotel-navy hover:text-hotel-gold transition-colors underline"
                >
                    {t('common:retry', 'Retry')}
                </button>
                <div className="mt-2">
                    <DocumentBlockDescription
                        originalMarkup={originalMarkup}
                        translatedMarkup={translatedMarkup}
                        hasTranslation={!!translatedContent}
                        showBilingual={showBilingual}
                        translationLabel={translationLabel}
                        translationDir={translationDir}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <PdfViewer key={retryToken} url={resolvedUrl} onRetry={handleRetry} />
            <div className="mt-2">
                <DocumentBlockDescription
                    originalMarkup={originalMarkup}
                    translatedMarkup={translatedMarkup}
                    hasTranslation={!!translatedContent}
                    showBilingual={showBilingual}
                    translationLabel={translationLabel}
                    translationDir={translationDir}
                />
            </div>
        </div>
    )
}

export default DocumentBlockRenderer
