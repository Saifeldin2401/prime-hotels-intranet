-- Tighten RLS policies whose WITH CHECK was always-true (advisor: rls_policy_always_true).
-- Each USING clause was already restrictive; the always-true WITH CHECK let authenticated
-- users mutate/create rows out of their authorized scope (privilege escalation / record forging).
-- Fix: mirror each restrictive USING expression into WITH CHECK.
--
-- Not touched here (deliberate):
--   * job_applications "Public can submit applications" INSERT  -> intentional public job form.
--   * media_access_logs / media_asset_usages INSERT             -> low-sensitivity append logs;
--                                                                  client insert omits accessed_by.
--   * notifications "Users can insert notifications" INSERT     -> app inserts for OTHER users in
--                                                                  ~10 call sites; needs a SECURITY
--                                                                  DEFINER RPC refactor, not an RLS edit.

ALTER POLICY consolidated_job_applications_update ON public.job_applications
WITH CHECK (
  (EXISTS ( SELECT 1 FROM ((user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) JOIN job_postings jp ON ((jp.property_id = up.property_id))) WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (jp.id = job_applications.job_posting_id))))
  OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'property_manager'::app_role) AND (( SELECT auth.uid() AS uid) = ANY (job_applications.routed_to)))))
  OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))))
);

ALTER POLICY consolidated_learning_progress_all ON public.learning_progress
WITH CHECK (can_manage_assignments(( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT auth.uid() AS uid)));

ALTER POLICY consolidated_messages_update ON public.messages
WITH CHECK (
  ((((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = recipient_id)) AND (status <> 'archived'::text))
   OR ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = ANY (ARRAY['sent'::text, 'delivered'::text])))
   OR ((( SELECT auth.uid() AS uid) = sender_id) AND (status = 'draft'::text))
   OR ((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))))
);

ALTER POLICY consolidated_request_steps_update ON public.request_steps
WITH CHECK (
  ((can_view_request(request_id) AND ((assignee_id = ( SELECT auth.uid() AS uid)) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid))))
   OR (EXISTS ( SELECT 1 FROM requests r WHERE ((r.id = request_steps.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id)))))
);

ALTER POLICY consolidated_sop_quiz_questions_all ON public.sop_quiz_questions
WITH CHECK (
  ((EXISTS ( SELECT 1 FROM ((user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) JOIN sop_documents sd ON ((sd.id = sop_quiz_questions.sop_document_id))) WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND ((sd.property_id = up.property_id) OR (sd.property_id IS NULL)))))
   OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))))
);

-- Audit logs and status history are written exclusively by SECURITY DEFINER functions/triggers
-- (log_security_event, log_status_change) which bypass RLS, so restricting the authenticated
-- INSERT policy only blocks direct forging without affecting legitimate writes.
ALTER POLICY audit_logs_insert_system_only ON public.security_audit_logs
WITH CHECK (user_id = ( SELECT auth.uid() AS uid));

ALTER POLICY "System can insert status history" ON public.status_history
WITH CHECK (changed_by = ( SELECT auth.uid() AS uid));
