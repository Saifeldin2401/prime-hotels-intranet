-- Attendance Policies
DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own" ON attendance FOR INSERT WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
CREATE POLICY "attendance_update_own" ON attendance FOR UPDATE USING (employee_id = auth.uid());

-- Goals Policies
DROP POLICY IF EXISTS "goals_insert_own" ON goals;
CREATE POLICY "goals_insert_own" ON goals FOR INSERT WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "goals_update_own" ON goals;
CREATE POLICY "goals_update_own" ON goals FOR UPDATE USING (employee_id = auth.uid());

-- Training Progress Policies
DROP POLICY IF EXISTS "training_progress_insert" ON training_progress;
CREATE POLICY "training_progress_insert" ON training_progress FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "training_progress_update" ON training_progress;
CREATE POLICY "training_progress_update" ON training_progress FOR UPDATE USING (user_id = auth.uid());

-- Document Acknowledgments Policies
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_ack_select_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_select_own" ON document_acknowledgments FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "doc_ack_update_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_update_own" ON document_acknowledgments FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "doc_ack_insert_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_insert_own" ON document_acknowledgments FOR INSERT WITH CHECK (user_id = auth.uid());
;
