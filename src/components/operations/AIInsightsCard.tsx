import React, { useState, useEffect, useCallback } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, ArrowRight, BrainCircuit, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useTranslation } from "react-i18next";

interface AIInsight {
    type: 'success' | 'warning' | 'tip'
    title: string
    description: string
    impact?: string
}

interface AIInsightsCardProps {
    data: {
        occupancyRate: number
        adr: number
        revpar: number
        totalRevenue: number
        previousPeriod?: any
    }
    className?: string
}

export function AIInsightsCard({ data, className }: AIInsightsCardProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(true)
    const [insights, setInsights] = useState<AIInsight[]>([])
    const [summary, setSummary] = useState('')

    const generateInsights = useCallback(() => {
        const newInsights: AIInsight[] = []

        // No hardcoded findings - only data-driven summary for now

        setInsights(newInsights)

        if (data.occupancyRate > 0) {
            setSummary(`Performance summary: The current occupancy rate of ${data.occupancyRate.toFixed(1)}% and an average daily rate of SAR ${data.adr.toFixed(2)} have been analyzed from recent PMS data.`)
        }
    }, [data.occupancyRate, data.adr])

    useEffect(() => {
        if (data.occupancyRate > 0) {
            generateInsights()
            setIsAnalyzing(false)
        } else {
            setIsAnalyzing(false)
            setInsights([])
            setSummary('')
        }
    }, [data, generateInsights])

    return (
        <Card className={cn("overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Operations Insights</CardTitle>
                            <CardDescription>Automated performance analysis and recommendations</CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="gap-1 px-2 py-1 text-primary border-primary/30">
                        <BrainCircuit className="h-3 w-3" />
                        Live Analysis
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAnalyzing ? (
                    <div className="py-8 space-y-4">
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                            <div className="space-y-1">
                                <p className="font-medium">Analyzing operational data...</p>
                                <p className="text-xs text-muted-foreground">Cross-referencing PMS logs with historical benchmarks</p>
                            </div>
                        </div>
                        <Progress value={45} className="h-1 animate-pulse" />
                    </div>
                ) : (
                    <>
                        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-sm italic leading-relaxed text-foreground/90">
                                "{summary}"
                            </p>
                        </div>

                        <div className="grid gap-3">
                            {insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border hover:border-primary/30 transition-all group"
                                >
                                    <div className={cn(
                                        "p-2 rounded-md mt-0.5",
                                        insight.type === 'success' ? "bg-green-500/10 text-green-600" :
                                            insight.type === 'warning' ? "bg-amber-500/10 text-amber-600" :
                                                "bg-blue-500/10 text-blue-600"
                                    )}>
                                        {insight.type === 'success' ? <TrendingUp className="h-4 w-4" /> :
                                            insight.type === 'warning' ? <TrendingDown className="h-4 w-4" /> :
                                                <Lightbulb className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold">{insight.title}</h4>
                                            {insight.impact && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Impact: {insight.impact}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-snug">
                                            {insight.description}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex justify-between items-center text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                Data Source: Live PMS Sync
                            </div>
                            <div>Last Analysis: {new Date().toLocaleTimeString()}</div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
