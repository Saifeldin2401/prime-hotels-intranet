/**
 * useAIFeedbackAnalyzer - AI-Powered Feedback Sentiment Analysis
 * 
 * Analyzes feedback text to identify sentiment, themes, and actionable insights
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface FeedbackAnalysis {
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
    sentimentScore: number // -100 to 100
    themes: string[]
    keyInsights: string[]
    suggestedActions: string[]
    urgency: 'low' | 'medium' | 'high' | 'critical'
}

export function useAIFeedbackAnalyzer() {
    const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Analyze feedback text
    const analyzeFeedback = useCallback(async (feedbackText: string, context?: {
        source?: string // e.g., 'survey', 'ticket', 'suggestion_box'
        employeeRole?: string
        department?: string
    }) => {
        if (!feedbackText || feedbackText.length < 20) {
            setError('Feedback text too short to analyze')
            return null
        }

        setLoading(true)
        setError(null)

        try {
            const prompt = `You are an HR analytics specialist analyzing employee feedback at a hotel. Analyze this feedback to identify sentiment, themes, and actionable insights.

FEEDBACK TEXT:
"${feedbackText}"

${context?.source ? `Source: ${context.source}` : ''}
${context?.employeeRole ? `Employee Role: ${context.employeeRole}` : ''}
${context?.department ? `Department: ${context.department}` : ''}

Analyze and return a JSON object:
{
  "sentiment": "positive",
  "sentimentScore": 75,
  "themes": ["Recognition", "Work Environment"],
  "keyInsights": [
    "Employee appreciates team collaboration",
    "Positive feedback about management support"
  ],
  "suggestedActions": [
    "Continue team recognition programs",
    "Share positive feedback with department heads"
  ],
  "urgency": "low"
}

ANALYSIS RULES:
- sentiment: "positive" | "neutral" | "negative" | "mixed"
- sentimentScore: -100 (very negative) to +100 (very positive)
- themes: 2-5 relevant themes (e.g., "Training", "Communication", "Workload", "Management", "Career Growth", "Safety", "Equipment", "Scheduling", "Recognition", "Team Dynamics")
- keyInsights: 2-4 specific observations from the feedback
- suggestedActions: 1-3 actionable recommendations
- urgency: "low" (general feedback), "medium" (needs attention), "high" (timely response needed), "critical" (immediate action required)

Return ONLY valid JSON.`

            // Perform Server-Side Analysis using Supabase Edge Function
            try {
                const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                    body: {
                        prompt,
                        model: 'Qwen/Qwen2.5-72B-Instruct',
                        task: 'chat'
                    }
                })

                if (aiError) throw aiError

                // Parse AI response
                let parsed: FeedbackAnalysis | null = null

                // The server returns { response: "string content", success: true }
                let rawContent = aiResult?.response || ''

                // Clean up Markdown code blocks if present
                rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '')

                // Extract JSON object
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                } else {
                    console.warn('No JSON found in AI response:', rawContent)
                    throw new Error('Invalid response format from AI')
                }

                if (parsed) {
                    setAnalysis(parsed)
                    return parsed
                }
            } catch (err: any) {
                console.error('Analysis failed:', err)
                throw err
            }

        } catch (err: any) {
            console.error('Feedback analysis error:', err)
            setError(err.message || 'Failed to analyze feedback')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    // Batch analyze multiple feedback items
    const analyzeBatch = useCallback(async (feedbackItems: { id: string; text: string }[]) => {
        const results: { id: string; analysis: FeedbackAnalysis | null }[] = []

        for (const item of feedbackItems.slice(0, 10)) { // Limit to 10 items
            const result = await analyzeFeedback(item.text)
            results.push({ id: item.id, analysis: result })
        }

        return results
    }, [analyzeFeedback])

    // Clear analysis
    const clearAnalysis = useCallback(() => {
        setAnalysis(null)
        setError(null)
    }, [])

    return {
        analysis,
        loading,
        error,
        analyzeFeedback,
        analyzeBatch,
        clearAnalysis
    }
}

// Keep generic type if needed or remove entirely if unused outside
