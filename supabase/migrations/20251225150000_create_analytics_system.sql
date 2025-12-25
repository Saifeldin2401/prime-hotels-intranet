-- Migration: Create Comprehensive Analytics System
-- Description: Establishes a multi-layered tracking system for user behavior, sessions, and search intelligence.

-- ============================================================================
-- 1. USER SESSIONS TABLE
-- Tracks active user sessions, device info, and engagement duration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    device_info JSONB DEFAULT '{}', -- OS, Browser, Screen Size
    ip_address TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for Session Performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active_at DESC);

-- RLS: Users can create sessions and read/update their own.
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create sessions" ON user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager')
        )
    );

-- ============================================================================
-- 2. ANALYTICS EVENTS TABLE
-- High-volume behavioral event stream.
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,         -- e.g., 'nav:page_view', 'auth:login'
    category TEXT NOT NULL,           -- e.g., 'navigation', 'engagement', 'conversion'
    properties JSONB DEFAULT '{}',    -- Flexible payload: { "url": "/tasks", "duration": 500 }
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'       -- User Agent, Version, etc.
);

-- Indexes for Analytics Queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
-- Gin index for querying within JSON properties
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING gin (properties);

-- RLS: Public insert (authenticated), restricted select.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert events" ON analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Allow all auth users to log events

CREATE POLICY "Admins can view analytics" ON analytics_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager')
        )
    );

-- ============================================================================
-- 3. SEARCH ANALYTICS TABLE
-- Dedicated tracking for search performance and user intent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    source TEXT NOT NULL,             -- e.g., 'knowledge_base', 'staff_directory'
    results_count INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    clicked_result_id TEXT,           -- Weak reference to clicked item ID
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    filters JSONB DEFAULT '{}'        -- Applied filters during search
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_source ON search_analytics(source);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp DESC);

-- RLS
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert search logs" ON search_analytics
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can view search logs" ON search_analytics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager')
        )
    );

-- ============================================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================================

-- Function to cleanup old analytics data (Retention Policy: 90 Days)
CREATE OR REPLACE FUNCTION cleanup_analytics_data()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_events
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Keep search analytics longer for trend analysis (1 Year)
    DELETE FROM search_analytics
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Cleanup inactive sessions older than 30 days
    DELETE FROM user_sessions
    WHERE last_active_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
