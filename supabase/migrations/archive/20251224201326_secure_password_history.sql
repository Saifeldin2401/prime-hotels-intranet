-- ============================================
-- SECURE PASSWORD HISTORY TABLE
-- ============================================

ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_history_select_own" ON password_history
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "password_history_insert_own" ON password_history
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Prevent updates/deletes entirely (history is append-only)
-- No policies for UPDATE/DELETE means default deny.;
