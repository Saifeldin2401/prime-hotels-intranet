/**
 * useDuplicateDetection Hook
 * 
 * Checks for potentially duplicate content before creation.
 * Uses fuzzy string matching to find similar titles.
 */

import { useCallback, useMemo, useState } from 'react'
import { useKnowledgeArticles } from './useKnowledge'

interface DuplicateCheckResult {
    isChecking: boolean
    duplicates: Array<{
        id: string
        title: string
        similarity: number
        content_type: string
    }>
    hasDuplicates: boolean
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null)
    )

    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j
    }

    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            )
        }
    }

    return track[str2.length][str1.length]
}

/**
 * Calculate similarity percentage (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 100

    const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())
    return Math.round(((longer.length - distance) / longer.length) * 100)
}

/**
 * Check for word overlap
 */
function wordOverlap(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    if (words1.length === 0 || words2.length === 0) return 0

    const commonWords = words1.filter(w => words2.includes(w))
    return Math.round((commonWords.length / Math.max(words1.length, words2.length)) * 100)
}

export function useDuplicateDetection() {
    const [title, setTitle] = useState('')

    // Fetch existing articles for comparison
    const { data: existingArticles, isLoading, isFetching } = useKnowledgeArticles(
        { query: title.length > 3 ? title : undefined },
        1,
        50
    )

    const checkForDuplicates = useCallback((newTitle: string) => {
        setTitle(newTitle)
    }, [])

    const result = useMemo<DuplicateCheckResult>(() => {
        if (!existingArticles?.articles || title.length < 5) {
            return { isChecking: false, duplicates: [], hasDuplicates: false }
        }

        const duplicates = existingArticles.articles
            .map(article => {
                const similarity = calculateSimilarity(title, article.title)
                const wordSim = wordOverlap(title, article.title)
                // Combined score weighted toward word overlap for semantic similarity
                const combinedScore = Math.round(similarity * 0.4 + wordSim * 0.6)

                return {
                    id: article.id,
                    title: article.title,
                    similarity: combinedScore,
                    content_type: article.content_type
                }
            })
            .filter(d => d.similarity >= 60) // Threshold for "potential duplicate"
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5) // Top 5 matches

        return {
            isChecking: isLoading || isFetching,
            duplicates,
            hasDuplicates: duplicates.length > 0
        }
    }, [existingArticles, title, isLoading, isFetching])

    const clearCheck = useCallback(() => {
        setTitle('')
    }, [])

    return {
        checkForDuplicates,
        clearCheck,
        result,
        isReady: !isLoading
    }
}

export default useDuplicateDetection
