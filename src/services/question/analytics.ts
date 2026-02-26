import { supabase } from '@/lib/supabase'

export async function getQuestionAnalytics(questionId: string): Promise<{
    totalAttempts: number
    correctAttempts: number
    accuracyRate: number
    avgTimeSeconds: number
    hintUsageRate: number
}> {
    const { data, error } = await supabase
        .from('knowledge_question_attempts')
        .select('is_correct, time_spent_seconds, hint_used')
        .eq('question_id', questionId)

    if (error) throw error

    const attempts = data || []
    const total = attempts.length
    const correct = attempts.filter(a => a.is_correct).length
    const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0)
    const hintsUsed = attempts.filter(a => a.hint_used).length

    return {
        totalAttempts: total,
        correctAttempts: correct,
        accuracyRate: total > 0 ? (correct / total) * 100 : 0,
        avgTimeSeconds: total > 0 ? totalTime / total : 0,
        hintUsageRate: total > 0 ? (hintsUsed / total) * 100 : 0
    }
}

export async function getUserQuestionStats(userId: string): Promise<{
    totalAttempts: number
    correctAnswers: number
    accuracyRate: number
    recentStreak: number
}> {
    const { data, error } = await supabase
        .from('knowledge_question_attempts')
        .select('is_correct, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    const attempts = data || []
    const total = attempts.length
    const correct = attempts.filter(a => a.is_correct).length

    // Calculate Daily Streak (consecutive days with activity)
    // We normalize dates to YYYY-MM-DD strings
    const activityDates = new Set<string>()
    attempts.forEach(a => {
        activityDates.add(new Date(a.created_at).toISOString().split('T')[0])
    })

    const sortedDates = Array.from(activityDates).sort().reverse() // Newest first
    let streak = 0

    // Check if we have activity today
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // If no activity today or yesterday, streak is broken (0) unless we just started
    // Actually, widespread standard: streak is unbroken if you played yesterday OR today.
    // If newest date is older than yesterday, streak is 0.

    if (sortedDates.length > 0) {
        const newest = sortedDates[0]
        if (newest === today || newest === yesterday) {
            streak = 1
            // Check previous days
            const currentDate = new Date(newest)

            for (let i = 1; i < sortedDates.length; i++) {
                currentDate.setDate(currentDate.getDate() - 1)
                const expectedDate = currentDate.toISOString().split('T')[0]

                if (sortedDates[i] === expectedDate) {
                    streak++
                } else {
                    break
                }
            }
        }
    }

    return {
        totalAttempts: total,
        correctAnswers: correct,
        accuracyRate: total > 0 ? (correct / total) * 100 : 0,
        recentStreak: streak
    }
}

export async function getDailyChallengeStatus(userId: string): Promise<{ completed: boolean }> {
    const today = new Date().toISOString().split('T')[0]

    // Check for attempts with context 'daily_challenge' created today
    const { count, error } = await supabase
        .from('knowledge_question_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('context_type', 'daily_challenge')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

    if (error) throw error

    // Consider completed if at least 1 attempt made (or maybe 3? but for now 1 is safer to prevent infinite retries)
    // Actually typically a daily challenge is a set of X questions.
    // If the widget fetches 3 questions, we should check if they did 3.
    // But keeping it simple: if they did ANY daily challenge today, we mark as visited/in-progress.
    // Ideally we track 'completed' specifically.

    return {
        completed: (count || 0) >= 3
    }
}
