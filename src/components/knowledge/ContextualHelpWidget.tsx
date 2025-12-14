/**
 * ContextualHelpWidget
 * 
 * Displays relevant Knowledge Base articles based on the current context.
 * Can be triggered by page, task type, or other workflow triggers.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    HelpCircle,
    X,
    ChevronRight,
    BookOpen,
    FileText,
    Video,
    CheckSquare,
    ExternalLink,
    Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useContextualHelp } from '@/hooks/useKnowledge'
import type { KnowledgeContentType, ContextualHelp } from '@/types/knowledge'

const CONTENT_TYPE_ICONS: Record<KnowledgeContentType, any> = {
    sop: FileText,
    policy: FileText,
    guide: BookOpen,
    checklist: CheckSquare,
    reference: FileText,
    faq: HelpCircle,
    video: Video,
    visual: FileText
}

interface ContextualHelpWidgetProps {
    /** Type of trigger context */
    triggerType: 'task' | 'page' | 'training' | 'maintenance' | 'onboarding' | 'checklist'
    /** Value of the trigger (e.g., task type, page path) */
    triggerValue: string
    /** Display mode */
    variant?: 'floating' | 'inline' | 'minimal'
    /** Position for floating variant */
    position?: 'bottom-right' | 'bottom-left' | 'top-right'
    /** Custom class name */
    className?: string
}

export function ContextualHelpWidget({
    triggerType,
    triggerValue,
    variant = 'floating',
    position = 'bottom-right',
    className
}: ContextualHelpWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    const { data: helpItems, isLoading } = useContextualHelp(triggerType, triggerValue)

    // Don't render if no help items or dismissed
    if (isDismissed || (!isLoading && (!helpItems || helpItems.length === 0))) {
        return null
    }

    const positionClasses = {
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-right': 'top-4 right-4'
    }

    // Minimal variant - just an icon
    if (variant === 'minimal') {
        return (
            <div className={cn("inline-flex items-center gap-1", className)}>
                <Link
                    to={`/knowledge/${helpItems?.[0]?.document_id}`}
                    className="text-hotel-gold hover:text-hotel-gold-dark transition-colors"
                    title="View related help"
                >
                    <HelpCircle className="h-4 w-4" />
                </Link>
            </div>
        )
    }

    // Inline variant - embedded help panel
    if (variant === 'inline') {
        return (
            <Card className={cn("bg-blue-50 border-blue-200", className)}>
                <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                            <Lightbulb className="h-4 w-4" />
                            Related Help
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => setIsDismissed(true)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                    <div className="space-y-2">
                        {helpItems?.slice(0, 3).map(item => (
                            <HelpItemLink key={item.document_id} item={item} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Floating variant - collapsible FAB
    return (
        <div className={cn("fixed z-50", positionClasses[position], className)}>
            {isOpen ? (
                <Card className="w-80 shadow-xl animate-in slide-in-from-bottom-2">
                    <CardHeader className="py-3 px-4 bg-hotel-navy text-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-hotel-gold" />
                                Related Help Articles
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="py-3 px-4 max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="text-sm text-gray-500 text-center py-4">Loading...</div>
                        ) : (
                            <div className="space-y-2">
                                {helpItems?.map(item => (
                                    <HelpItemLink key={item.document_id} item={item} onClick={() => setIsOpen(false)} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
                        <Link
                            to="/knowledge"
                            className="text-xs text-hotel-gold hover:underline flex items-center gap-1"
                        >
                            Browse Knowledge Base <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </Card>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 rounded-full bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy shadow-lg"
                >
                    <HelpCircle className="h-5 w-5" />
                    {helpItems && helpItems.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-hotel-navy text-white text-xs">
                            {helpItems.length}
                        </Badge>
                    )}
                </Button>
            )}
        </div>
    )
}

interface HelpItemLinkProps {
    item: ContextualHelp
    onClick?: () => void
}

function HelpItemLink({ item, onClick }: HelpItemLinkProps) {
    const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText

    return (
        <Link
            to={`/knowledge/${item.document_id}`}
            onClick={onClick}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors group"
        >
            <div className="w-8 h-8 rounded bg-hotel-gold/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-hotel-gold" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-hotel-gold transition-colors line-clamp-1">
                    {item.title}
                </p>
                {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-hotel-gold flex-shrink-0 mt-1" />
        </Link>
    )
}

/**
 * Hook to automatically inject contextual help based on page path
 */
export function usePageContextualHelp() {
    const pathname = window.location.pathname
    return useContextualHelp('page', pathname)
}
