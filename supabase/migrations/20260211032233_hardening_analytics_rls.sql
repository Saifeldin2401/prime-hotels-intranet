-- Harden analytics_events RLS policies for better performance and security
-- 1. Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert events" ON analytics_events;
DROP POLICY IF EXISTS "Anonymous users can insert events" ON analytics_events;

-- 2. Create optimized insert policies
-- Note: use (SELECT auth.uid()) for improved performance as per audit
CREATE POLICY "Authenticated users can insert events" ON analytics_events
    FOR INSERT 
    TO authenticated
    WITH CHECK ((user_id = (SELECT auth.uid())) OR (user_id IS NULL));

CREATE POLICY "Anonymous users can insert events" ON analytics_events
    FOR INSERT 
    TO anon
    WITH CHECK (user_id IS NULL);

-- 3. Harden user_sessions RLS (security fix)
DROP POLICY IF EXISTS "Users can create sessions" ON user_sessions;
CREATE POLICY "Users can create sessions" ON user_sessions
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Add indices for performance as identified in audit
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp DESC);
;
