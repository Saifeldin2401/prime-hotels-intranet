-- =============================================================================
-- Security fix: analytics_events_insert policy bypassed RLS on INSERT
-- =============================================================================
-- `analytics_events_insert` had `WITH CHECK (true)`, which permits any role
-- (including anon) to insert an analytics_events row with an arbitrary
-- user_id, spoofing another user's activity.
--
-- A second, correctly-scoped policy (`auth_insert_own_events`) already exists
-- on this table and enforces `user_id IS NULL OR user_id = auth.uid()` — the
-- same self-scoping pattern used by the table's other user-scoped access
-- (contrast with `hr_admin_view_analytics`, which scopes SELECT to
-- is_hr_or_admin()). Since RLS policies are OR'd together, the always-true
-- policy fully negated that scoping. Drop the redundant/unsafe policy; the
-- properly-scoped one remains in effect.
-- =============================================================================

DROP POLICY IF EXISTS analytics_events_insert ON public.analytics_events;
