import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AnalyticsSummary {
    active_now: number
    active_today: number
    sessions_today: number
}

export interface DailyActiveUser {
    date: string
    active_users: number
}

export interface AdminAnalyticsStats {
    summary: AnalyticsSummary
    dau: DailyActiveUser[]
    topEvents: { event_name: string, count: number }[]
    searchMetrics: {
        total_searches: number
        zero_results_count: number
        avg_results_count: number
        top_queries: { query: string, count: number }[]
    }
}

export function useAnalyticsStats() {
    return useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async (): Promise<AdminAnalyticsStats> => {
            const [summaryRes, dauRes, eventsRes, searchRes] = await Promise.all([
                supabase.rpc('get_analytics_summary'),
                supabase.rpc('get_daily_active_users', { days_ago: 30 }),
                supabase.rpc('get_top_events', { limit_count: 10 }),
                supabase.rpc('get_search_metrics', { days_ago: 30 })
            ])

            if (summaryRes.error) throw summaryRes.error
            if (dauRes.error) throw dauRes.error
            if (eventsRes.error) throw eventsRes.error
            if (searchRes.error) throw searchRes.error

            // Parse Search Metrics (comes as a single row)
            const searchData = searchRes.data[0] || { total_searches: 0, zero_results_count: 0, avg_results_count: 0, top_queries: [] }

            return {
                summary: summaryRes.data,
                dau: dauRes.data,
                topEvents: eventsRes.data,
                searchMetrics: searchData
            }
        },
        refetchInterval: 60000 // Refresh every minute
    })
}
