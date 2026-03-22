/**
 * Analytics System Types
 * Manual definition matching the `analytics_events` and `user_sessions` tables.
 */

export interface AnalyticsEvent {
    id?: string;
    event_name: string;
    category: string;
    properties;
    user_id?: string | null;
    session_id?: string | null;
    timestamp?: string;
    metadata?;
}

export interface UserSession {
    id: string;
    user_id: string;
    started_at: string;
    last_active_at: string;
    user_agent?: string | null;
    device_info?;
    ip_address?: string | null;
    is_active: boolean;
    metadata?;
}

export interface SearchAnalyticsEvent {
    id?: string;
    query: string;
    source: string;
    results_count: number;
    user_id?: string | null;
    session_id?: string | null;
    clicked_result_id?: string | null;
    timestamp?: string;
    filters?;
}

// Event Taxonomy Helper Types
export type EventCategory = 'navigation' | 'engagement' | 'conversion' | 'system' | 'auth' | 'search';

export const AnalyticsEvents = {
    PAGE_VIEW: 'nav:page_view',
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    SEARCH: 'search:query',
    SEARCH_CLICK: 'search:click',
    FEATURE_USAGE: 'feature:interaction',
    ERROR: 'sys:error'
} as const;

export type AnalyticsEvents = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
