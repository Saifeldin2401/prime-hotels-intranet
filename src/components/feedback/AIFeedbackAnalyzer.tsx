/**
 * AIFeedbackAnalyzer - Analyze employee feedback with AI
 * 
 * Displays sentiment, themes, insights, and suggested actions
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Lightbulb,
    Target,
    RefreshCw,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIFeedbackAnalyzer } from '@/hooks/useAIFeedbackAnalyzer'

const sentimentConfig = {
    positive: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: ThumbsUp,
        gradient: 'from-green-50 to-emerald-50',
        progressColor: 'bg-green-500'
    },
    neutral: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Minus,
        gradient: 'from-gray-50 to-slate-50',
        progressColor: 'bg-gray-400'
    },
    negative: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: ThumbsDown,
        gradient: 'from-red-50 to-rose-50',
        progressColor: 'bg-red-500'
    },
    mixed: {
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: TrendingUp,
        gradient: 'from-amber-50 to-yellow-50',
        progressColor: 'bg-amber-500'
    }
}

const urgencyConfig = {
    low: { color: 'bg-green-100 text-green-700', label: 'Low Priority' },
    medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium Priority' },
    high: { color: 'bg-orange-100 text-orange-700', label: 'High Priority' },
    critical: { color: 'bg-red-100 text-red-700', label: 'Immediate Action' }
}

interface AIFeedbackAnalyzerProps {
    defaultFeedback?: string
    onAnalysisComplete?: (analysis: any) => void
    className?: string
}

export function AIFeedbackAnalyzer({
    defaultFeedback = '',
    onAnalysisComplete,
    className
}: AIFeedbackAnalyzerProps) {
    const { analysis, loading, error, analyzeFeedback, clearAnalysis } = useAIFeedbackAnalyzer()
    const [feedbackText, setFeedbackText] = useState(defaultFeedback)

    const handleAnalyze = async () => {
        const result = await analyzeFeedback(feedbackText)
        if (result && onAnalysisComplete) {
            onAnalysisComplete(result)
        }
    }

    const canAnalyze = feedbackText.length >= 20

    // Normalize sentiment score to 0-100 for progress bar
    const normalizedScore = analysis ? (analysis.sentimentScore + 100) / 2 : 50

    return (
        <div className={cn("space-y-6", className)}>
            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg">AI Feedback Analyzer</span>
                            <p className="text-sm font-normal text-muted-foreground">
                                Analyze employee feedback for sentiment and insights
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Feedback Text</Label>
                        <Textarea
                            placeholder="Paste or type employee feedback here... (minimum 20 characters)"
                            className="min-h-[120px]"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {feedbackText.length} characters {feedbackText.length < 20 && '(need at least 20)'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleAnalyze}
                            disabled={!canAnalyze || loading}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Analyze Feedback
                                </>
                            )}
                        </Button>
                        {analysis && (
                            <Button variant="outline" onClick={clearAnalysis}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </CardContent>
            </Card>

            {/* Analysis Results */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Card>
                            <CardContent className="py-6 space-y-4">
                                <Skeleton className="h-6 w-1/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <div className="flex gap-2 pt-2">
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {analysis && !loading && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        {/* Sentiment Overview */}
                        <Card className={cn(
                            "overflow-hidden bg-gradient-to-br",
                            sentimentConfig[analysis.sentiment].gradient
                        )}>
                            <CardContent className="py-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const SentimentIcon = sentimentConfig[analysis.sentiment].icon
                                            return (
                                                <div className={cn(
                                                    "h-12 w-12 rounded-xl flex items-center justify-center",
                                                    sentimentConfig[analysis.sentiment].color
                                                )}>
                                                    <SentimentIcon className="h-6 w-6" />
                                                </div>
                                            )
                                        })()}
                                        <div>
                                            <h3 className="text-xl font-bold capitalize">{analysis.sentiment} Sentiment</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Score: {analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={urgencyConfig[analysis.urgency].color}>
                                        {urgencyConfig[analysis.urgency].label}
                                    </Badge>
                                </div>

                                {/* Sentiment Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Negative</span>
                                        <span>Neutral</span>
                                        <span>Positive</span>
                                    </div>
                                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "absolute h-full transition-all duration-500",
                                                sentimentConfig[analysis.sentiment].progressColor
                                            )}
                                            style={{ width: `${normalizedScore}%` }}
                                        />
                                        <div
                                            className="absolute top-0 h-full w-0.5 bg-gray-400"
                                            style={{ left: '50%' }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Themes */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Target className="h-4 w-4 text-blue-600" />
                                    Identified Themes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.themes.map((theme, i) => (
                                        <Badge key={i} variant="outline" className="bg-white">
                                            {theme}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Key Insights */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    Key Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.keyInsights.map((insight, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Suggested Actions */}
                        <Card className="bg-gradient-to-br from-violet-50 to-blue-50 border-violet-100">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-violet-600" />
                                    Suggested Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.suggestedActions.map((action, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                                            <div className="h-5 w-5 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 text-xs font-medium text-violet-700">
                                                {i + 1}
                                            </div>
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
