import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

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

export function useAnalyticsStats(options?: { enabled?: boolean }) {
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

            const rawSummary = summaryRes.data as Record<string, unknown> | null
            const summary: AnalyticsSummary = {
                active_now: typeof rawSummary?.active_now === 'number' ? rawSummary.active_now : 0,
                active_today: typeof rawSummary?.active_today === 'number' ? rawSummary.active_today : 0,
                sessions_today: typeof rawSummary?.sessions_today === 'number' ? rawSummary.sessions_today : 0,
            }

            const rawSearch = searchRes.data?.[0]
            const topQueries: { query: string; count: number }[] = Array.isArray(rawSearch?.top_queries)
                ? (rawSearch.top_queries as Array<{ query?: unknown; count?: unknown }>).map((item) => ({
                    query: typeof item?.query === 'string' ? item.query : '',
                    count: typeof item?.count === 'number' ? item.count : 0,
                }))
                : []

            const searchMetrics = {
                total_searches: rawSearch?.total_searches ?? 0,
                zero_results_count: rawSearch?.zero_results_count ?? 0,
                avg_results_count: rawSearch?.avg_results_count ?? 0,
                top_queries: topQueries,
            }

            return {
                summary,
                dau: dauRes.data ?? [],
                topEvents: eventsRes.data ?? [],
                searchMetrics,
            }
        },
        enabled: options?.enabled ?? true,
        staleTime: 120000, // Cache for 2 minutes
        refetchInterval: 300000 // Refresh every 5 minutes
    })
}
