/**
 * Analytics System Types
 * Manual definition matching the `analytics_events` and `user_sessions` tables.
 */

export interface AnalyticsEvent {
    id?: string;
    organization_id?: string | null;
    event_name: string;
    category: string;
    properties;
    user_id?: string | null;
    session_id?: string | null;
    timestamp?: string;
    metadata?;
}

// Event Taxonomy Helper Types
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
