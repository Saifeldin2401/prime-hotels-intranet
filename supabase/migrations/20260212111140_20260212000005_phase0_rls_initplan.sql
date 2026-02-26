-- Phase 0: RLS initplan performance fixes (wrap auth.* in SELECT)

ALTER POLICY "departments_select_authenticated" ON public.departments
  USING (
    (is_active = true)
    OR has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR has_role((select auth.uid()), 'property_manager'::text)
    OR has_role((select auth.uid()), 'property_hr'::text)
    OR has_property_access((select auth.uid()), property_id)
  );

ALTER POLICY "document_approvals_select_approver_or_delegate" ON public.document_approvals
  USING (
    (approver_id = (select auth.uid()))
    OR has_role((select auth.uid()), 'regional_admin'::text)
    OR EXISTS (
      SELECT 1
      FROM documents d
      JOIN temporary_approvers ta ON ta.delegator_id = document_approvals.approver_id
      WHERE d.id = document_approvals.document_id
        AND (
          ta.delegate_id = (select auth.uid())
          OR (select auth.uid()) = ANY (ta.fallback_delegate_ids)
        )
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
           AND ta.entity_type = 'document_approval'::text
           AND ta.entity_id = document_approvals.id)
          OR
          (ta.entity_type IS NULL AND ta.entity_id IS NULL
           AND (
             ta.scope_type = 'all'::text
             OR (ta.scope_type = 'property'::text AND NOT (ta.scope_id IS DISTINCT FROM d.property_id))
             OR (ta.scope_type = 'department'::text AND NOT (ta.scope_id IS DISTINCT FROM d.department_id))
           ))
        )
    )
  );

ALTER POLICY "document_approvals_update_approver_or_delegate" ON public.document_approvals
  USING (
    status = 'pending'::text
    AND is_active = true
    AND (
      approver_id = (select auth.uid())
      OR has_role((select auth.uid()), 'regional_admin'::text)
      OR EXISTS (
        SELECT 1
        FROM temporary_approvers ta
        JOIN documents d ON d.id = document_approvals.document_id
        WHERE ta.delegator_id = document_approvals.approver_id
          AND (
            ta.delegate_id = (select auth.uid())
            OR (select auth.uid()) = ANY (ta.fallback_delegate_ids)
          )
          AND ta.start_at <= now()
          AND ta.end_at >= now()
          AND (ta.max_approvals IS NULL OR ta.approvals_used < ta.max_approvals)
          AND (
            (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
             AND ta.entity_type = 'document_approval'::text
             AND ta.entity_id = document_approvals.id)
            OR
            (ta.entity_type IS NULL AND ta.entity_id IS NULL
             AND (
               ta.scope_type = 'all'::text
               OR (ta.scope_type = 'property'::text AND NOT (ta.scope_id IS DISTINCT FROM d.property_id))
               OR (ta.scope_type = 'department'::text AND NOT (ta.scope_id IS DISTINCT FROM d.department_id))
             ))
          )
      )
    )
  )
  WITH CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

ALTER POLICY "approval_requests_select" ON public.approval_requests
  USING (
    current_approver_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::text)
    OR EXISTS (
      SELECT 1
      FROM temporary_approvers ta
      WHERE (
        ta.delegate_id = (select auth.uid())
        OR (select auth.uid()) = ANY (ta.fallback_delegate_ids)
      )
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
           AND ta.entity_type = approval_requests.entity_type
           AND ta.entity_id = approval_requests.entity_id)
          OR
          (ta.entity_type IS NULL AND ta.entity_id IS NULL
           AND (
             ta.scope_type = 'all'::text
             OR (ta.scope_type = 'property'::text AND ta.scope_id IN (
               SELECT user_properties.property_id
               FROM user_properties
               WHERE user_properties.user_id = approval_requests.current_approver_id
             ))
             OR (ta.scope_type = 'department'::text AND ta.scope_id IN (
               SELECT user_departments.department_id
               FROM user_departments
               WHERE user_departments.user_id = approval_requests.current_approver_id
             ))
           ))
        )
        AND ta.delegator_id = approval_requests.current_approver_id
    )
  );

ALTER POLICY "users_archive_own_messages" ON public.messages
  USING (
    (select auth.uid()) = sender_id
    OR (select auth.uid()) = recipient_id
  )
  WITH CHECK (
    (select auth.uid()) = sender_id
    OR (select auth.uid()) = recipient_id
  );

ALTER POLICY "users_mark_messages_read" ON public.messages
  USING (
    (select auth.uid()) = recipient_id
    AND status = ANY (ARRAY['sent'::text, 'delivered'::text])
  )
  WITH CHECK ((select auth.uid()) = recipient_id);

ALTER POLICY "users_update_own_draft_messages" ON public.messages
  USING (
    (select auth.uid()) = sender_id
    AND status = 'draft'::text
  )
  WITH CHECK ((select auth.uid()) = sender_id);

ALTER POLICY "Users can view conversations they are part of" ON public.conversations
  USING ((select auth.uid()) = ANY (participant_ids));

ALTER POLICY "allow_certificate_history_insert" ON public.certificate_history
  WITH CHECK ((select auth.uid()) = performed_by);

ALTER POLICY "audit_logs_insert_system" ON public.audit_logs
  WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER POLICY "Users can update relevant onboarding tasks" ON public.onboarding_tasks
  USING (
    assigned_to_id = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM onboarding_process p
      WHERE p.id = onboarding_tasks.process_id
        AND p.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles r
      WHERE r.user_id = (select auth.uid())
        AND r.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])
    )
  );

ALTER POLICY "temporary_approvers_delete_delegation" ON public.temporary_approvers
  USING (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "temporary_approvers_insert_delegation" ON public.temporary_approvers
  WITH CHECK (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "temporary_approvers_select_delegation" ON public.temporary_approvers
  USING (
    delegator_id = (select auth.uid())
    OR delegate_id = (select auth.uid())
    OR (select auth.uid()) = ANY (fallback_delegate_ids)
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "temporary_approvers_update_delegation" ON public.temporary_approvers
  USING (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  )
  WITH CHECK (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "training_block_progress_manage" ON public.training_block_progress
  USING (user_id = (select auth.uid()));

ALTER POLICY "training_block_progress_select" ON public.training_block_progress
  USING (
    user_id = (select auth.uid())
    OR has_any_role((select auth.uid()), ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role])
  );

ALTER POLICY "pii_access_logs_insert_policy" ON public.pii_access_logs
  WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER POLICY "Admins can manage motivational content" ON public.motivational_content
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND (user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );;
