-- Final RLS Performance Optimization - Groups 4 & 5

-- Group 4: Property Operations
-- room_inventory
DROP POLICY IF EXISTS "Managers can manage inventory" ON room_inventory;
CREATE POLICY "Managers can manage inventory" ON room_inventory FOR ALL USING (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);
DROP POLICY IF EXISTS "Users see inventory for accessible properties" ON room_inventory;
CREATE POLICY "Users see inventory for accessible properties" ON room_inventory FOR SELECT USING (
  has_property_access((select auth.uid()), property_id)
);

-- rate_summary
DROP POLICY IF EXISTS "Managers can manage rates" ON rate_summary;
CREATE POLICY "Managers can manage rates" ON rate_summary FOR ALL USING (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);
DROP POLICY IF EXISTS "Users see rates for accessible properties" ON rate_summary;
CREATE POLICY "Users see rates for accessible properties" ON rate_summary FOR SELECT USING (
  has_property_access((select auth.uid()), property_id)
);

-- market_segments
DROP POLICY IF EXISTS "Managers can manage segments" ON market_segments;
CREATE POLICY "Managers can manage segments" ON market_segments FOR ALL USING (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);
DROP POLICY IF EXISTS "Users see segments for accessible properties" ON market_segments;
CREATE POLICY "Users see segments for accessible properties" ON market_segments FOR SELECT USING (
  has_property_access((select auth.uid()), property_id)
);

-- daily_revenue
DROP POLICY IF EXISTS "Managers can insert revenue data" ON daily_revenue;
CREATE POLICY "Managers can insert revenue data" ON daily_revenue FOR INSERT WITH CHECK (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);
DROP POLICY IF EXISTS "Managers can update revenue data" ON daily_revenue;
CREATE POLICY "Managers can update revenue data" ON daily_revenue FOR UPDATE USING (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);

-- daily_occupancy
DROP POLICY IF EXISTS "Managers can insert occupancy data" ON daily_occupancy;
CREATE POLICY "Managers can insert occupancy data" ON daily_occupancy FOR INSERT WITH CHECK (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);
DROP POLICY IF EXISTS "Managers can update occupancy data" ON daily_occupancy;
CREATE POLICY "Managers can update occupancy data" ON daily_occupancy FOR UPDATE USING (
  (has_role((select auth.uid()), 'regional_admin'::text) OR has_role((select auth.uid()), 'property_manager'::text)) AND has_property_access((select auth.uid()), property_id)
);

-- Group 5: Admin & Onboarding
-- onboarding_templates
DROP POLICY IF EXISTS "Templates editable by admins" ON onboarding_templates;
CREATE POLICY "Templates editable by admins" ON onboarding_templates FOR ALL USING (
  EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = (select auth.uid()) AND user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role]) )
);

-- onboarding_process
DROP POLICY IF EXISTS "Managers can view/edit their staff's process" ON onboarding_process;
CREATE POLICY "Managers can view/edit their staff's process" ON onboarding_process FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = onboarding_process.user_id AND (profiles.reporting_to = (select auth.uid()) OR EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = (select auth.uid()) AND user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])) ) )
);

-- announcement_targets
DROP POLICY IF EXISTS "announcement_targets_manage" ON announcement_targets;
CREATE POLICY "announcement_targets_manage" ON announcement_targets FOR ALL USING (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);

-- announcement_attachments
DROP POLICY IF EXISTS "announcement_attachments_manage" ON announcement_attachments;
CREATE POLICY "announcement_attachments_manage" ON announcement_attachments FOR ALL USING (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);

-- escalation_rules
DROP POLICY IF EXISTS "escalation_rules_manage" ON escalation_rules;
CREATE POLICY "escalation_rules_manage" ON escalation_rules FOR ALL USING (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);

-- job_titles
DROP POLICY IF EXISTS "Allow manage access for admins" ON job_titles;
CREATE POLICY "Allow manage access for admins" ON job_titles FOR ALL USING (
  EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = (select auth.uid()) AND user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]) )
);
;
