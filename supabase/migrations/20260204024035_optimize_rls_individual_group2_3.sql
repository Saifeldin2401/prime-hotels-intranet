-- Individual Group 2 & 3: Conversations & Documents

-- conversations (participant_id)
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;
CREATE POLICY "Users can view conversations they are part of" ON conversations FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = conversations.id AND cp.participant_id = (select auth.uid()) 
  )
);

-- onboarding_tasks (assigned_to_id)
DROP POLICY IF EXISTS "Users can view assigned tasks" ON onboarding_tasks;
CREATE POLICY "Users can view assigned tasks" ON onboarding_tasks FOR SELECT USING (
  assigned_to_id = (select auth.uid()) OR 
  EXISTS ( 
    SELECT 1 FROM onboarding_process op 
    WHERE op.id = onboarding_tasks.process_id AND op.user_id = (select auth.uid()) 
  )
);

-- document_acknowledgments (user_id)
DROP POLICY IF EXISTS "doc_ack_insert_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_insert_own" ON document_acknowledgments FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
DROP POLICY IF EXISTS "doc_ack_select_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_select_own" ON document_acknowledgments FOR SELECT USING (
  user_id = (select auth.uid())
);
DROP POLICY IF EXISTS "doc_ack_update_own" ON document_acknowledgments;
CREATE POLICY "doc_ack_update_own" ON document_acknowledgments FOR UPDATE USING (
  user_id = (select auth.uid())
);

-- document_feedback (user_id)
DROP POLICY IF EXISTS "Users can manage own feedback" ON document_feedback;
CREATE POLICY "Users can manage own feedback" ON document_feedback FOR ALL USING (
  (select auth.uid()) = user_id
);
;
