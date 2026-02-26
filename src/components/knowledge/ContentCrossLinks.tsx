/**
 * ContentCrossLinks - Cross-reference panel between Knowledge Base and Documents
 * 
 * Shows a contextual link card that directs users to the "other view"
 * of the same document record. Solves the confusion of identical content
 * appearing in both Knowledge Base and Documents sections.
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentCrossLinksProps {
    /** The document ID (same in both KB and Documents) */
    documentId: string
    /** Which page we're currently on */
    mode: 'knowledge' | 'documents'
    /** Optional extra CSS classes */
    className?: string
}

export function ContentCrossLinks({ documentId, mode, className }: ContentCrossLinksProps) {
    const navigate = useNavigate()
    const { t } = useTranslation('common')

    const isKnowledge = mode === 'knowledge'

    const targetPath = isKnowledge
        ? `/documents/${documentId}`
        : `/knowledge/${documentId}`

    const Icon = isKnowledge ? FileText : BookOpen

    return (
        <button
            onClick={() => navigate(targetPath)}
            className={cn(
                "w-full group text-start p-4 rounded-2xl border transition-all duration-300",
                "hover:shadow-md hover:-translate-y-0.5",
                isKnowledge
                    ? "border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 hover:border-blue-300"
                    : "border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-purple-50/40 hover:border-indigo-300",
                className
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                    isKnowledge
                        ? "bg-blue-100 text-blue-600"
                        : "bg-indigo-100 text-indigo-600"
                )}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                            "text-sm font-bold",
                            isKnowledge ? "text-blue-900" : "text-indigo-900"
                        )}>
                            {isKnowledge
                                ? t('cross_links.view_in_documents', 'View in Document Library')
                                : t('cross_links.view_in_knowledge', 'View in Knowledge Base')
                            }
                        </p>
                        <ArrowRight className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1",
                            isKnowledge ? "text-blue-400" : "text-indigo-400"
                        )} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {isKnowledge
                            ? t('cross_links.documents_hint', 'Access version history, downloads, and file management')
                            : t('cross_links.knowledge_hint', 'Read with rich viewer, comments, bookmarks, and related articles')
                        }
                    </p>
                </div>
            </div>
        </button>
    )
}
