import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as LinkIcon } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import type { TrainingContentBlock } from '@/lib/types'
import { PdfViewer } from '@/components/common/PdfViewer'

interface DocumentBlockRendererProps {
    block: TrainingContentBlock
    translatedContent?: string
    showBilingual?: boolean
    translationLabel?: string
    translationDir?: 'ltr' | 'rtl'
}

export const DocumentBlockRenderer = ({
    block,
    translatedContent,
    showBilingual,
    translationLabel,
    translationDir = 'ltr'
}: DocumentBlockRendererProps) => {
    const { t } = useTranslation('training')
    const isPdf = block.content_url?.toLowerCase().endsWith('.pdf')
    const originalMarkup = sanitizeHtml(block.content)
    const translatedMarkup = translatedContent ? sanitizeHtml(translatedContent) : ''

    const renderDescription = () => {
        if (!translatedContent) {
            return (
                <div className="text-sm text-gray-500 prose max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
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
                        <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                    </div>
                    <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
                            {t('translatedTo', { language: translationLabel || t('translated', 'Translated') })}
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                    </div>
                </div>
            )
        }

        return (
            <div className="text-sm text-gray-600 prose max-w-none dark:prose-invert" dir={translationDir}>
                <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
            </div>
        )
    }

    if (!isPdf) {
        return (
            <div className="space-y-4">
                <div className="p-6 border rounded-lg bg-slate-50 flex items-center gap-4">
                    <LinkIcon className="h-8 w-8 text-blue-500" />
                    <div>
                        <h4 className="font-medium">{t('attachedDocument')}</h4>
                        <a
                            href={block.content_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline break-all"
                        >
                            {block.content_url || t('noLinkProvided')}
                        </a>
                    </div>
                </div>
                <div className="mt-2">
                    {renderDescription()}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <PdfViewer url={block.content_url || ''} />
            <div className="mt-2">
                {renderDescription()}
            </div>
        </div>
    )
}
