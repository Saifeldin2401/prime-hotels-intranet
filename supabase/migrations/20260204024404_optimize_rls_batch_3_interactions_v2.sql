-- Batch 3: Interactions & Workflow Tables RLS Optimization (v2)

-- maintenance_tickets
DROP POLICY IF EXISTS "Property Staff can view tickets for their property" ON maintenance_tickets;
CREATE POLICY "Property Staff can view tickets for their property" ON maintenance_tickets FOR SELECT TO authenticated USING (property_id IN (SELECT property_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can create tickets" ON maintenance_tickets;
CREATE POLICY "Users can create tickets" ON maintenance_tickets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = reported_by_id);

DROP POLICY IF EXISTS "Users can view tickets assigned to them" ON maintenance_tickets;
CREATE POLICY "Users can view tickets assigned to them" ON maintenance_tickets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = assigned_to_id);

DROP POLICY IF EXISTS "Users can view tickets reported by them" ON maintenance_tickets;
CREATE POLICY "Users can view tickets reported by them" ON maintenance_tickets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = reported_by_id);

DROP POLICY IF EXISTS "maintenance_tickets_insert_policy" ON maintenance_tickets;
CREATE POLICY "maintenance_tickets_insert_policy" ON maintenance_tickets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = reported_by_id);

-- leave_requests
DROP POLICY IF EXISTS "Users can create leave requests" ON leave_requests;
CREATE POLICY "Users can create leave requests" ON leave_requests FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = requester_id);

DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
CREATE POLICY "Users can view own leave requests" ON leave_requests FOR SELECT TO authenticated USING ((SELECT auth.uid()) = requester_id);

-- requests
DROP POLICY IF EXISTS "requests_insert_own" ON requests;
CREATE POLICY "requests_insert_own" ON requests FOR INSERT TO authenticated WITH CHECK (requester_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "requests_update_owner_or_assignee" ON requests;
CREATE POLICY "requests_update_owner_or_assignee" ON requests FOR UPDATE TO authenticated USING (can_view_request(id) AND (((requester_id = (SELECT auth.uid())) AND (status = ANY (ARRAY['draft'::text, 'returned_for_correction'::text]))) OR (current_assignee_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())))) WITH CHECK (requester_id = requester_id);

-- request_comments
DROP POLICY IF EXISTS "request_comments_insert" ON request_comments;
CREATE POLICY "request_comments_insert" ON request_comments FOR INSERT TO authenticated WITH CHECK (((author_id = (SELECT auth.uid())) AND can_view_request(request_id) AND ((visibility = 'all'::text) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())))));

DROP POLICY IF EXISTS "request_attachments_insert" ON request_attachments;
CREATE POLICY "request_attachments_insert" ON request_attachments FOR INSERT TO authenticated WITH CHECK (((uploaded_by = (SELECT auth.uid())) AND can_view_request(request_id)));
;
