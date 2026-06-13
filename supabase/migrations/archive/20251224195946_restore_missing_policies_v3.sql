-- ============================================
-- RESTORE MISSING POLICIES (DROPPED BY CASCADE) - FINAL ATTEMPT
-- ============================================

-- 1. Training Modules
CREATE POLICY "training_modules_select" ON training_modules
FOR SELECT USING (true); 

CREATE POLICY "training_modules_manage" ON training_modules
FOR ALL USING (
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr'])
  OR (auth_has_role(auth.uid(), 'property_manager') AND check_property_access(property_id))
);

-- 2. Document Versions
CREATE POLICY "document_versions_select" ON document_versions
FOR SELECT USING (true);

CREATE POLICY "document_versions_manage" ON document_versions
FOR ALL USING (
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager'])
);

-- 3. Approval Requests
CREATE POLICY "approval_requests_select" ON approval_requests
FOR SELECT USING (true);

CREATE POLICY "approval_requests_manage" ON approval_requests
FOR ALL USING (
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr'])
  OR current_approver_id = auth.uid()
);

-- 4. Training Certificates (Simplified)
CREATE POLICY "training_certificates_select" ON training_certificates
FOR SELECT USING (true);

CREATE POLICY "training_certificates_manage" ON training_certificates
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']));

-- 5. Notification Templates
CREATE POLICY "notification_templates_read" ON notification_templates FOR SELECT USING (true);
CREATE POLICY "notification_templates_manage" ON notification_templates FOR ALL USING (auth_has_role(auth.uid(), 'regional_admin'));

-- 6. Escalation Rules
CREATE POLICY "escalation_rules_read" ON escalation_rules FOR SELECT USING (true);
CREATE POLICY "escalation_rules_manage" ON escalation_rules FOR ALL USING (auth_has_role(auth.uid(), 'regional_admin'));

-- 7. Announcement Targets/Attachments
CREATE POLICY "announcement_targets_select" ON announcement_targets FOR SELECT USING (true);
CREATE POLICY "announcement_targets_manage" ON announcement_targets FOR ALL USING (auth_has_role(auth.uid(), 'regional_admin'));

CREATE POLICY "announcement_attachments_select" ON announcement_attachments FOR SELECT USING (true);
CREATE POLICY "announcement_attachments_manage" ON announcement_attachments FOR ALL USING (auth_has_role(auth.uid(), 'regional_admin'));

-- 8. Approval History
CREATE POLICY "approval_history_select" ON approval_history FOR SELECT USING (true);

-- 9. Training Quizzes
CREATE POLICY "training_quizzes_select" ON training_quizzes FOR SELECT USING (true);
CREATE POLICY "training_quizzes_manage" ON training_quizzes FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']));;
