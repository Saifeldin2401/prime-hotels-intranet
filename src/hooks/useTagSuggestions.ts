/**
 * useTagSuggestions Hook
 * 
 * Uses AI to suggest tags based on content analysis.
 * No DB changes needed - just suggestions displayed to user.
 */

import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface TagSuggestion {
    tag: string
    confidence: 'high' | 'medium' | 'low'
    reason: string
}

export function useTagSuggestions() {
    const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
    const [isGenerating, setIsGenerating] = useState(false)

    const generateSuggestions = useCallback(async (
        title: string,
        content: string,
        description?: string
    ): Promise<TagSuggestion[]> => {
        if (!title && !content) {
            setSuggestions([])
            return []
        }

        setIsGenerating(true)
        try {
            const prompt = `Analyze this knowledge base article and suggest relevant tags/categories.
                    
Article Title: ${title}
${description ? `Description: ${description}` : ''}
Content Preview: ${content?.slice(0, 1500) || 'N/A'}

Suggest 5-8 relevant tags that would help categorize this article.
For each tag, provide:
1. The tag name (single word or short phrase, max 2 words)
2. Confidence level (high/medium/low)
3. Brief reason why this tag fits

Format as JSON array:
[{"tag": "tag-name", "confidence": "high", "reason": "brief explanation"}]

Focus on: department, topic, task type, equipment, and compliance areas.`

            const res = await multiProviderRouter.execute<TagSuggestion[]>(prompt, {
                task: 'fast',
                jsonMode: true,
            })

            let aiResponseText = res.rawText || ''
            let parsedSuggestions: TagSuggestion[] = []

            if (Array.isArray(res.data)) {
                parsedSuggestions = res.data
            } else if (aiResponseText) {
                try {
                    // Try to extract JSON from the response
                    const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/)
                    if (jsonMatch) {
                        parsedSuggestions = JSON.parse(jsonMatch[0])
                    }
                } catch (parseError) {
                    console.warn('Failed to parse tag suggestions:', parseError)
                    // Fallback: simple keyword extraction
                    parsedSuggestions = extractKeywords(title, content, description)
                }
            } else {
                parsedSuggestions = extractKeywords(title, content, description)
            }

            setSuggestions(parsedSuggestions)
            return parsedSuggestions
        } catch (error) {
            console.error('Failed to generate tag suggestions:', error)
            toast.error('Failed to generate tag suggestions')
            // Return fallback suggestions
            const fallback = extractKeywords(title, content, description)
            setSuggestions(fallback)
            return fallback
        } finally {
            setIsGenerating(false)
        }
    }, [])

    const clearSuggestions = useCallback(() => {
        setSuggestions([])
    }, [])

    return {
        suggestions,
        isGenerating,
        generateSuggestions,
        clearSuggestions
    }
}

/**
 * Fallback keyword extraction when AI fails
 */
function extractKeywords(title: string, content?: string, description?: string): TagSuggestion[] {
    const text = `${title} ${description || ''} ${content || ''}`.toLowerCase()
    const keywords: TagSuggestion[] = []

    // Hotel-specific keyword mapping
    const keywordPatterns: Array<[RegExp, string, string]> = [
        [/\b(checkin|check-in|checkout|check-out|front desk|reception)\b/, 'front-desk', 'Front desk operations'],
        [/\b(housekeeping|cleaning|room attendant|hk)\b/, 'housekeeping', 'Housekeeping procedures'],
        [/\b(maintenance|repair|fix|broken|plumbing|electrical)\b/, 'maintenance', 'Maintenance issues'],
        [/\b(food|beverage|restaurant|kitchen|menu|dining|fb|f&b)\b/, 'food-beverage', 'F&B operations'],
        [/\b(safety|fire|emergency|evacuation|first aid|cpr)\b/, 'safety', 'Safety & emergency'],
        [/\b(security|theft|lost|found|access|key|lock)\b/, 'security', 'Security procedures'],
        [/\b(vip|guest|service|complaint|feedback)\b/, 'guest-service', 'Guest services'],
        [/\b(training|onboarding|new hire|orientation)\b/, 'training', 'Training & development'],
        [/\b(policy|procedure|guideline|standard|compliance)\b/, 'policy', 'Policies & compliance'],
        [/\b(billing|payment|invoice|charge|refund|pos)\b/, 'billing', 'Billing & payments'],
        [/\b(reservation|booking|ota|channel|availability)\b/, 'reservations', 'Reservations'],
        [/\b(spa|gym|pool|fitness|wellness|recreation)\b/, 'spa-recreation', 'Spa & recreation'],
    ]

    for (const [pattern, tag, reason] of keywordPatterns) {
        if (pattern.test(text)) {
            keywords.push({
                tag,
                confidence: 'high',
                reason
            })
        }
    }

    // Add generic content type tags
    if (/\b(sop|procedure|step|process|how to)\b/.test(text)) {
        keywords.push({ tag: 'sop', confidence: 'high', reason: 'Standard operating procedure content' })
    }
    if (/\b(policy|rule|regulation|must|shall|required)\b/.test(text)) {
        keywords.push({ tag: 'policy', confidence: 'high', reason: 'Policy document' })
    }
    if (/\b(checklist|verify|confirm|ensure|review)\b/.test(text)) {
        keywords.push({ tag: 'checklist', confidence: 'medium', reason: 'Contains verification steps' })
    }

    return keywords.slice(0, 8)
}

export default useTagSuggestions
