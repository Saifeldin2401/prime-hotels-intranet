import { differenceInDays, parseISO, startOfDay, subDays } from 'date-fns'

interface CompletionItem {
    completed_at: string | null
    training_module?: {
        category?: string | null
    } | null
    // Support both structures (nested training_module or direct category if flat)
    category?: string
}

/**
 * Calculates the current streak of consecutive days with at least one completion.
 * @param completions List of completion records with completed_at timestamp
 * @returns Number of consecutive days (including today)
 */
export function calculateStreak(completions: { completed_at: string | null }[]): number {
    if (!completions || completions.length === 0) return 0

    // Extract valid dates, normalize to start of day, and sort descending
    const dates = completions
        .filter(c => c.completed_at)
        .map(c => startOfDay(parseISO(c.completed_at!)).getTime())
        .sort((a, b) => b - a)

    if (dates.length === 0) return 0

    // Remove duplicates
    const uniqueDates = Array.from(new Set(dates))

    const today = startOfDay(new Date()).getTime()
    const yesterday = startOfDay(subDays(new Date(), 1)).getTime()

    // Check if the most recent activity was today or yesterday
    // If most recent was before yesterday, streak is broken -> 0
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0
    }

    let streak = 1
    // uniqueDates is sorted descending (newest first)
    // uniqueDates[0] is the start (today or yesterday)

    for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = uniqueDates[i]
        const next = uniqueDates[i + 1]

        // Difference in days between consecutive entries
        const diff = differenceInDays(current, next)

        if (diff === 1) {
            streak++
        } else {
            // Streak broken
            break
        }
    }

    return streak
}

/**
 * Processes completions to count proficiency/completions per category.
 * useful for Radar charts.
 */
export function processCategoryStats(completions: CompletionItem[]): Record<string, number> {
    const stats: Record<string, number> = {}

    completions.forEach(c => {
        // Resolve category from nested module or direct property
        const category = c.training_module?.category || c.category || 'Uncategorized'

        // Normalize string
        const normalizedKey = category.trim()
        stats[normalizedKey] = (stats[normalizedKey] || 0) + 1
    })

    return stats
}
