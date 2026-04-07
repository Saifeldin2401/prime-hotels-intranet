import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { PdfViewer } from '@/components/common/PdfViewer'
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitize'
import type { TrainingContentBlock } from '@/lib/types'
import { Link as LinkIcon } from 'lucide-react'
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
        
        // Use the centralized sanitizeUrl function for protocol validation
        const sanitized = sanitizeUrl(value)
        if (!sanitized) {
            console.warn('Blocked dangerous URL in DocumentBlockRenderer:', value.substring(0, 50))
        }
        return sanitized
    }

    const safeContentUrl = getSafeUrl(block.content_url)
    const isPdf = safeContentUrl?.toLowerCase().endsWith('.pdf')
    
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
                        {safeContentUrl ? (
                            <a
                                href={safeContentUrl}
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

    return (
        <div className="space-y-4">
            <PdfViewer url={safeContentUrl || ''} />
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
