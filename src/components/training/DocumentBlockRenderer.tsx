import { useTranslation } from 'react-i18next'
import { Link as LinkIcon } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import type { TrainingContentBlock } from '@/lib/types'
import { PdfViewer } from '@/components/common/PdfViewer'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'

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

    if (!hasTranslation) {
        return (
            <div className="text-sm text-gray-500 prose max-w-none dark:prose-invert">
                <InlineErrorBoundary>
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
                        <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                    </InlineErrorBoundary>
                </div>
                <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
                        {t('translatedTo', { language: translationLabel || t('translated', 'Translated') })}
                    </div>
                    <InlineErrorBoundary>
                        <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                    </InlineErrorBoundary>
                </div>
            </div>
        )
    }

    return (
        <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
            <InlineErrorBoundary>
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
    const getSafeUrl = (value?: string | null) => {
        if (!value) return null
        try {
            const parsed = new URL(value)
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.toString()
            }
            return null
        } catch {
            return null
        }
    }

    const safeContentUrl = getSafeUrl(block.content_url)
    const isPdf = safeContentUrl?.toLowerCase().endsWith('.pdf')
    const originalMarkup = sanitizeHtml(block.content)
    const translatedMarkup = translatedContent ? sanitizeHtml(translatedContent) : ''

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
                                rel="noreferrer"
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
