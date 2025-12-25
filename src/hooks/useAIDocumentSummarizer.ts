/**
 * useAIDocumentSummarizer - AI-Powered Document Change Summarization
 * 
 * Generates concise summaries of document content and changes
 * for policy updates, knowledge base articles, and SOPs.
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface DocumentSummary {
    summary: string
    keyChanges?: string[]
    readingTime?: number
    targetAudience?: string
}

export function useAIDocumentSummarizer() {
    const [summary, setSummary] = useState<DocumentSummary | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Generate summary for a document
    const summarizeDocument = useCallback(async (
        content: string,
        title?: string,
        previousContent?: string
    ) => {
        if (!content || content.length < 50) {
            setError('Content too short to summarize')
            return null
        }

        setLoading(true)
        setError(null)

        try {
            // Strip HTML tags for cleaner analysis
            const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            const cleanPrevious = previousContent?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

            const isUpdate = !!previousContent && previousContent !== content

            const prompt = isUpdate
                ? `You are a corporate communications specialist. Analyze the changes between two versions of a hotel policy document and provide a summary.

DOCUMENT TITLE: ${title || 'Untitled Document'}

PREVIOUS VERSION:
"${cleanPrevious?.substring(0, 2000)}"

UPDATED VERSION:
"${cleanContent.substring(0, 2000)}"

Provide a JSON response with:
{
  "summary": "A 2-3 sentence summary of what this document is about",
  "keyChanges": ["Change 1: Brief description", "Change 2: Brief description"],
  "targetAudience": "Who should read this (e.g., All Staff, Department Heads, Front Desk)",
  "readingTime": 3
}

RULES:
- keyChanges: List 2-5 specific changes made
- readingTime: Estimated minutes to read the full document
- Be concise but specific
- If changes are minor (typos, formatting), indicate that

Return ONLY valid JSON.`
                : `You are a corporate communications specialist. Summarize this hotel policy/SOP document.

DOCUMENT TITLE: ${title || 'Untitled Document'}

CONTENT:
"${cleanContent.substring(0, 3000)}"

Provide a JSON response with:
{
  "summary": "A 2-3 sentence summary of what this document covers and its purpose",
  "targetAudience": "Who should read this (e.g., All Staff, Department Heads, Front Desk)",
  "readingTime": 3
}

RULES:
- summary: Clear, professional, informative
- readingTime: Estimated minutes based on word count (~200 words/min)
- targetAudience: Be specific about roles

Return ONLY valid JSON.`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: { prompt, model: 'Qwen/Qwen2.5-7B-Instruct' }
            })

            if (aiError) throw aiError

            // Parse AI response
            let parsed: DocumentSummary | null = null
            try {
                const jsonMatch = (aiResult?.result || '').match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                }
            } catch {
                console.warn('Failed to parse AI summary response')
            }

            if (parsed) {
                setSummary(parsed)
                return parsed
            } else {
                // Fallback summary
                const wordCount = cleanContent.split(/\s+/).length
                const fallback: DocumentSummary = {
                    summary: `This document contains ${wordCount} words covering hotel policies and procedures.`,
                    readingTime: Math.ceil(wordCount / 200),
                    targetAudience: 'All Staff'
                }
                setSummary(fallback)
                return fallback
            }

        } catch (err: any) {
            console.error('Document summarization error:', err)
            setError(err.message || 'Failed to generate summary')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    // Clear summary
    const clearSummary = useCallback(() => {
        setSummary(null)
        setError(null)
    }, [])

    return {
        summary,
        loading,
        error,
        summarizeDocument,
        clearSummary
    }
}
