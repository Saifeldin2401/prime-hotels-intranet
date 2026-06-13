-- Convert ALL policies to explicit INSERT/UPDATE/DELETE to avoid duplicate SELECT policies.

-- escalation_rules
DROP POLICY IF EXISTS consolidated_escalation_rules_all ON public.escalation_rules;
CREATE POLICY escalation_rules_insert ON public.escalation_rules
  FOR INSERT TO public
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR auth_has_role((SELECT auth.uid()), 'regional_admin'::text)
  );
CREATE POLICY escalation_rules_update ON public.escalation_rules
  FOR UPDATE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR auth_has_role((SELECT auth.uid()), 'regional_admin'::text)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR auth_has_role((SELECT auth.uid()), 'regional_admin'::text)
  );
CREATE POLICY escalation_rules_delete ON public.escalation_rules
  FOR DELETE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR auth_has_role((SELECT auth.uid()), 'regional_admin'::text)
  );

-- knowledge_related_articles
DROP POLICY IF EXISTS "Admins can manage related articles" ON public.knowledge_related_articles;
CREATE POLICY knowledge_related_articles_insert ON public.knowledge_related_articles
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])
    )
  );
CREATE POLICY knowledge_related_articles_update ON public.knowledge_related_articles
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])
    )
  );
CREATE POLICY knowledge_related_articles_delete ON public.knowledge_related_articles
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])
    )
  );

-- knowledge_required_reading
DROP POLICY IF EXISTS "Admins can manage required reading" ON public.knowledge_required_reading;
CREATE POLICY knowledge_required_reading_insert ON public.knowledge_required_reading
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])
    )
  );
CREATE POLICY knowledge_required_reading_update ON public.knowledge_required_reading
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])
    )
  );
CREATE POLICY knowledge_required_reading_delete ON public.knowledge_required_reading
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])
    )
  );

-- maintenance_schedules
DROP POLICY IF EXISTS "Maintenance schedules manageable by admins/managers" ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_insert ON public.maintenance_schedules
  FOR INSERT TO public
  WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_roles.user_id
      FROM public.user_roles
      WHERE user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role])
    )
  );
CREATE POLICY maintenance_schedules_update ON public.maintenance_schedules
  FOR UPDATE TO public
  USING (
    (SELECT auth.uid()) IN (
      SELECT user_roles.user_id
      FROM public.user_roles
      WHERE user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role])
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_roles.user_id
      FROM public.user_roles
      WHERE user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role])
    )
  );
CREATE POLICY maintenance_schedules_delete ON public.maintenance_schedules
  FOR DELETE TO public
  USING (
    (SELECT auth.uid()) IN (
      SELECT user_roles.user_id
      FROM public.user_roles
      WHERE user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role])
    )
  );

-- motivational_content
DROP POLICY IF EXISTS "Admins can manage motivational content" ON public.motivational_content;
CREATE POLICY motivational_content_insert ON public.motivational_content
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND (user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );
CREATE POLICY motivational_content_update ON public.motivational_content
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND (user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND (user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );
CREATE POLICY motivational_content_delete ON public.motivational_content
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND (user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

-- notification_batches (service_role)
DROP POLICY IF EXISTS "Service role full access on notification_batches" ON public.notification_batches;
CREATE POLICY notification_batches_service_role_select ON public.notification_batches
  FOR SELECT TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_batches_service_role_insert ON public.notification_batches
  FOR INSERT TO service_role
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_batches_service_role_update ON public.notification_batches
  FOR UPDATE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_batches_service_role_delete ON public.notification_batches
  FOR DELETE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);

-- notification_queue (service_role)
DROP POLICY IF EXISTS "Service role full access on notification_queue" ON public.notification_queue;
CREATE POLICY notification_queue_service_role_select ON public.notification_queue
  FOR SELECT TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_queue_service_role_insert ON public.notification_queue
  FOR INSERT TO service_role
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_queue_service_role_update ON public.notification_queue
  FOR UPDATE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_queue_service_role_delete ON public.notification_queue
  FOR DELETE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);

-- notification_templates
DROP POLICY IF EXISTS notification_templates_manage ON public.notification_templates;
CREATE POLICY notification_templates_insert ON public.notification_templates
  FOR INSERT TO public
  WITH CHECK (auth_has_role((SELECT auth.uid()), 'regional_admin'::text));
CREATE POLICY notification_templates_update ON public.notification_templates
  FOR UPDATE TO public
  USING (auth_has_role((SELECT auth.uid()), 'regional_admin'::text))
  WITH CHECK (auth_has_role((SELECT auth.uid()), 'regional_admin'::text));
CREATE POLICY notification_templates_delete ON public.notification_templates
  FOR DELETE TO public
  USING (auth_has_role((SELECT auth.uid()), 'regional_admin'::text));

-- onboarding_templates
DROP POLICY IF EXISTS "Templates editable by admins" ON public.onboarding_templates;
CREATE POLICY onboarding_templates_insert ON public.onboarding_templates
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );
CREATE POLICY onboarding_templates_update ON public.onboarding_templates
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );
CREATE POLICY onboarding_templates_delete ON public.onboarding_templates
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );

-- role_permissions
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON public.role_permissions;
CREATE POLICY role_permissions_insert ON public.role_permissions
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
  );
CREATE POLICY role_permissions_update ON public.role_permissions
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
  );
CREATE POLICY role_permissions_delete ON public.role_permissions
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
  );

-- scheduled_reminders (service_role)
DROP POLICY IF EXISTS "Service role can manage reminders" ON public.scheduled_reminders;
CREATE POLICY scheduled_reminders_service_role_select ON public.scheduled_reminders
  FOR SELECT TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY scheduled_reminders_service_role_insert ON public.scheduled_reminders
  FOR INSERT TO service_role
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY scheduled_reminders_service_role_update ON public.scheduled_reminders
  FOR UPDATE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY scheduled_reminders_service_role_delete ON public.scheduled_reminders
  FOR DELETE TO service_role
  USING ((SELECT auth.role()) = 'service_role'::text);

-- sop_assignments
DROP POLICY IF EXISTS consolidated_sop_assignments_all ON public.sop_assignments;
CREATE POLICY sop_assignments_insert ON public.sop_assignments
  FOR INSERT TO public
  WITH CHECK (
    (EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_properties up ON up.user_id = ur.user_id
      JOIN public.sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'property_hr'::public.app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])
    )
  );
CREATE POLICY sop_assignments_update ON public.sop_assignments
  FOR UPDATE TO public
  USING (
    (EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_properties up ON up.user_id = ur.user_id
      JOIN public.sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'property_hr'::public.app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])
    )
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_properties up ON up.user_id = ur.user_id
      JOIN public.sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'property_hr'::public.app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])
    )
  );
CREATE POLICY sop_assignments_delete ON public.sop_assignments
  FOR DELETE TO public
  USING (
    (EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_properties up ON up.user_id = ur.user_id
      JOIN public.sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'property_hr'::public.app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])
    )
  );

-- task_templates
DROP POLICY IF EXISTS "Managers can manage task templates" ON public.task_templates;
CREATE POLICY task_templates_insert ON public.task_templates
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );
CREATE POLICY task_templates_update ON public.task_templates
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );
CREATE POLICY task_templates_delete ON public.task_templates
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
    )
  );

-- training_quiz_attempts
DROP POLICY IF EXISTS training_quiz_attempts_manage ON public.training_quiz_attempts;
CREATE POLICY training_quiz_attempts_insert ON public.training_quiz_attempts
  FOR INSERT TO public
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );
CREATE POLICY training_quiz_attempts_update ON public.training_quiz_attempts
  FOR UPDATE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );
CREATE POLICY training_quiz_attempts_delete ON public.training_quiz_attempts
  FOR DELETE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );

-- user_path_enrollments
DROP POLICY IF EXISTS user_path_enrollments_manage ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_insert ON public.user_path_enrollments
  FOR INSERT TO public
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );
CREATE POLICY user_path_enrollments_update ON public.user_path_enrollments
  FOR UPDATE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );
CREATE POLICY user_path_enrollments_delete ON public.user_path_enrollments
  FOR DELETE TO public
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
  );;
