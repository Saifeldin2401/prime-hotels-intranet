/**
 * AIDocumentSummary - Display AI-generated document summary
 * 
 * Shows summary, key changes, reading time, and target audience
 * Can either accept pre-computed summary OR content to analyze
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Sparkles,
    Clock,
    Users,
    ListChecks,
    RefreshCw,
    ChevronRight,
    FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIDocumentSummarizer } from '@/hooks/useAIDocumentSummarizer'

interface DocumentSummary {
    summary: string
    keyChanges?: string[]
    readingTime?: number
    targetAudience?: string
}

interface AIDocumentSummaryProps {
    /** Pre-computed summary data */
    summary?: DocumentSummary | null
    /** Loading state (for pre-computed) */
    loading?: boolean
    /** Error message */
    error?: string | null
    /** Regenerate callback */
    onRegenerate?: () => void
    /** OR: Content to analyze */
    content?: string
    /** Document title for context */
    title?: string
    /** Previous content for change detection */
    previousContent?: string
    className?: string
    compact?: boolean
}

export function AIDocumentSummary({
    summary: propSummary,
    loading: propLoading,
    error: propError,
    onRegenerate: propOnRegenerate,
    content,
    title,
    previousContent,
    className,
    compact = false
}: AIDocumentSummaryProps) {
    const {
        summary: hookSummary,
        loading: hookLoading,
        error: hookError,
        summarizeDocument,
        clearSummary
    } = useAIDocumentSummarizer()

    // Determine which mode we're in
    const isContentMode = !!content && !propSummary
    const summary = isContentMode ? hookSummary : propSummary
    const loading = isContentMode ? hookLoading : (propLoading ?? false)
    const error = isContentMode ? hookError : propError

    const handleGenerate = () => {
        if (content) {
            summarizeDocument(content, title, previousContent)
        }
    }

    const handleRegenerate = () => {
        if (propOnRegenerate) {
            propOnRegenerate()
        } else if (content) {
            summarizeDocument(content, title, previousContent)
        }
    }

    // If in content mode and no summary yet, show generate button
    if (isContentMode && !summary && !loading) {
        return (
            <Card className={cn("border-dashed border-violet-200 bg-violet-50/30", className)}>
                <CardContent className="py-6">
                    <div className="text-center space-y-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">AI Document Summary</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                Generate a summary, identify key changes, and estimate reading time
                            </p>
                        </div>
                        <Button
                            onClick={handleGenerate}
                            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyze Document
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <Card className={cn("", className)}>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-600 animate-pulse" />
                        <span className="text-sm text-muted-foreground">Generating AI summary...</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className={cn("border-red-100", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-red-600">{error}</p>
                        <Button variant="ghost" size="sm" onClick={handleRegenerate}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!summary) return null

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-3 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100",
                    className
                )}
            >
                <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            {summary.readingTime && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {summary.readingTime} min read
                                </span>
                            )}
                            {summary.targetAudience && (
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {summary.targetAudience}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className={cn("overflow-hidden", className)}>
                {/* Header */}
                <CardHeader className="pb-3 bg-gradient-to-r from-violet-50 to-blue-50 border-b border-violet-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <CardTitle className="text-base font-semibold">AI Summary</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRegenerate} className="h-8">
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Regenerate
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Summary */}
                    <div>
                        <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
                    </div>

                    {/* Key Changes */}
                    {summary.keyChanges && summary.keyChanges.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                <ListChecks className="h-4 w-4 text-green-600" />
                                Key Changes
                            </div>
                            <ul className="space-y-1.5">
                                {summary.keyChanges.map((change, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                        <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                        {summary.readingTime && (
                            <Badge variant="outline" className="gap-1 bg-white">
                                <Clock className="h-3 w-3" />
                                {summary.readingTime} min read
                            </Badge>
                        )}
                        {summary.targetAudience && (
                            <Badge variant="outline" className="gap-1 bg-white">
                                <Users className="h-3 w-3" />
                                {summary.targetAudience}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
