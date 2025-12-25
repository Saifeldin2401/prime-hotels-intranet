/**
 * useAITicketTriage - AI-Powered Maintenance Ticket Classification
 * 
 * Provides AI suggestions for ticket category, priority, and department
 * when a user describes a maintenance issue.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface TriageSuggestion {
    category: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    department: string
    confidence: number
    suggestedTitle?: string
    roomNumber?: string
    similarTickets: SimilarTicket[]
}

interface SimilarTicket {
    id: string
    title: string
    status: string
    resolved_at?: string
    resolution_notes?: string
}

export function useAITicketTriage() {
    const [suggestion, setSuggestion] = useState<TriageSuggestion | null>(null)
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Clear suggestion
    const clearSuggestion = useCallback(() => {
        setSuggestion(null)
    }, [])

    // Analyze ticket description
    const analyzeTicket = useCallback(async (description: string, location?: string) => {
        if (!description || description.length < 10) {
            setSuggestion(null)
            return
        }

        setLoading(true)

        try {
            // 1. Search for similar past tickets
            // Strip all non-alphanumeric characters except spaces
            const keywords = description.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
                .slice(0, 5) // Take top 5 keywords

            // Similar tickets search disabled due to Supabase query limitations
            // The AI classification works without it - can be re-enabled with full-text search later
            const similarTickets: SimilarTicket[] = []

            // 2. Call AI for classification
            const prompt = `You are a hotel maintenance manager. Classify this maintenance request and suggest the appropriate category, priority, department, a concise title, and extract any room number mentioned.

MAINTENANCE REQUEST:
"${description}"
${location ? `Location provided: ${location}` : ''}

CLASSIFICATION RULES:
- Categories: HVAC, Plumbing, Electrical, Housekeeping, Carpentry, IT/Technology, General Maintenance, Safety, Exterior/Grounds
- Priorities: 
  - critical: Safety hazard, flooding, fire risk, security breach
  - high: Guest-impacting, multiple rooms affected, health concern
  - medium: Functional issue, scheduled repair needed
  - low: Cosmetic, minor inconvenience, preventive
- Departments: Engineering, Housekeeping, IT, Facilities, Security

Return ONLY a valid JSON object:
{
  "category": "HVAC",
  "priority": "medium",
  "department": "Engineering",
  "suggestedTitle": "AC Not Cooling - Room 302",
  "roomNumber": "302",
  "confidence": 85
}

NOTES:
- suggestedTitle: Create a short, professional title (max 60 chars) summarizing the issue
- roomNumber: Extract room number if mentioned (e.g., "room 101", "rm 205", "suite 500"), otherwise null
- If no room mentioned, set roomNumber to null

Do not include any text outside the JSON.`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: { prompt, model: 'Qwen/Qwen2.5-7B-Instruct' }
            })

            if (aiError) throw aiError

            // Parse AI response
            let parsed: any = null
            try {
                const jsonMatch = (aiResult?.result || '').match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                }
            } catch {
                console.warn('Failed to parse AI triage response')
            }

            if (parsed) {
                setSuggestion({
                    category: parsed.category || 'General Maintenance',
                    priority: parsed.priority || 'medium',
                    department: parsed.department || 'Engineering',
                    confidence: parsed.confidence || 70,
                    suggestedTitle: parsed.suggestedTitle || undefined,
                    roomNumber: parsed.roomNumber || undefined,
                    similarTickets
                })
            } else {
                // Fallback classification based on keywords
                const fallbackSuggestion = getFallbackClassification(description)
                setSuggestion({
                    ...fallbackSuggestion,
                    similarTickets
                })
            }

        } catch (error: any) {
            console.error('Ticket triage error:', error)
            // Don't show error toast - silent fallback
            const fallbackSuggestion = getFallbackClassification(description)
            setSuggestion({
                ...fallbackSuggestion,
                similarTickets: []
            })
        } finally {
            setLoading(false)
        }
    }, [])

    // Debounced version for real-time typing
    const analyzeTicketDebounced = useCallback((description: string, location?: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            analyzeTicket(description, location)
        }, 800)
    }, [analyzeTicket])

    return {
        suggestion,
        loading,
        analyzeTicket,
        analyzeTicketDebounced,
        clearSuggestion
    }
}

// Fallback classification based on keywords
function getFallbackClassification(description: string): Omit<TriageSuggestion, 'similarTickets'> {
    const text = description.toLowerCase()

    // Category detection
    let category = 'General Maintenance'
    let department = 'Engineering'
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'

    if (text.includes('ac') || text.includes('air condition') || text.includes('heating') || text.includes('hvac') || text.includes('temperature') || text.includes('cold') || text.includes('hot')) {
        category = 'HVAC'
        department = 'Engineering'
    } else if (text.includes('water') || text.includes('leak') || text.includes('drain') || text.includes('toilet') || text.includes('faucet') || text.includes('plumb') || text.includes('shower')) {
        category = 'Plumbing'
        department = 'Engineering'
    } else if (text.includes('light') || text.includes('power') || text.includes('outlet') || text.includes('electric') || text.includes('switch')) {
        category = 'Electrical'
        department = 'Engineering'
    } else if (text.includes('wifi') || text.includes('internet') || text.includes('tv') || text.includes('computer') || text.includes('phone') || text.includes('network')) {
        category = 'IT/Technology'
        department = 'IT'
    } else if (text.includes('clean') || text.includes('dirty') || text.includes('stain') || text.includes('smell') || text.includes('odor')) {
        category = 'Housekeeping'
        department = 'Housekeeping'
    } else if (text.includes('door') || text.includes('lock') || text.includes('window') || text.includes('furniture') || text.includes('cabinet')) {
        category = 'Carpentry'
        department = 'Facilities'
    } else if (text.includes('fire') || text.includes('smoke') || text.includes('alarm') || text.includes('security') || text.includes('emergency')) {
        category = 'Safety'
        department = 'Security'
        priority = 'critical'
    }

    // Priority detection
    if (text.includes('flood') || text.includes('fire') || text.includes('emergency') || text.includes('dangerous') || text.includes('smoke')) {
        priority = 'critical'
    } else if (text.includes('urgent') || text.includes('guest') || text.includes('multiple') || text.includes('not working') || text.includes("doesn't work")) {
        priority = 'high'
    } else if (text.includes('minor') || text.includes('cosmetic') || text.includes('when possible') || text.includes('small')) {
        priority = 'low'
    }

    return {
        category,
        priority,
        department,
        confidence: 60 // Lower confidence for keyword-based
    }
}
