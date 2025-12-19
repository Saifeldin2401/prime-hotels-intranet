import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as LinkIcon } from 'lucide-react'
import type { TrainingContentBlock } from '@/lib/types'
import { PdfViewer } from '@/components/common/PdfViewer'

interface DocumentBlockRendererProps {
    block: TrainingContentBlock
}

export const DocumentBlockRenderer = ({ block }: DocumentBlockRendererProps) => {
    const { t } = useTranslation('training')
    const isPdf = block.content_url?.toLowerCase().endsWith('.pdf')

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
                <div className="mt-2 text-sm text-gray-500 prose max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <PdfViewer url={block.content_url || ''} />
            <div className="mt-2 text-sm text-gray-500 prose max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
        </div>
    )
}
