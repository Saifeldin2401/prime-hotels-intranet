-- analytics_events: unify anon/authenticated insert policies.
DROP POLICY IF EXISTS "Anonymous users can insert events" ON public.analytics_events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.analytics_events;
CREATE POLICY analytics_events_insert ON public.analytics_events
  FOR INSERT TO public
  WITH CHECK (
    (user_id IS NULL)
    OR (user_id = (SELECT auth.uid()))
  );

-- job_applications: unify anon/authenticated insert policies.
DROP POLICY IF EXISTS "Public can submit applications" ON public.job_applications;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.job_applications;
CREATE POLICY job_applications_insert ON public.job_applications
  FOR INSERT TO public
  WITH CHECK (
    (referred_by IS NULL)
    OR (referred_by = (SELECT auth.uid()))
  );

-- document_approvals: merge update policies into one.
DROP POLICY IF EXISTS document_approvals_update ON public.document_approvals;
DROP POLICY IF EXISTS document_approvals_update_approver_or_delegate ON public.document_approvals;
CREATE POLICY document_approvals_update ON public.document_approvals
  FOR UPDATE TO authenticated
  USING (
    (approver_id = (SELECT auth.uid()))
    OR (
      status = 'pending'::text
      AND is_active = true
      AND (
        (approver_id = (SELECT auth.uid()))
        OR has_role((SELECT auth.uid()), 'regional_admin'::text)
        OR EXISTS (
          SELECT 1
          FROM public.temporary_approvers ta
          JOIN public.documents d ON d.id = document_approvals.document_id
          WHERE ta.delegator_id = document_approvals.approver_id
            AND (
              ta.delegate_id = (SELECT auth.uid())
              OR (SELECT auth.uid()) = ANY (ta.fallback_delegate_ids)
            )
            AND ta.start_at <= now()
            AND ta.end_at >= now()
            AND ((ta.max_approvals IS NULL) OR (ta.approvals_used < ta.max_approvals))
            AND (
              (
                ta.entity_type IS NOT NULL
                AND ta.entity_id IS NOT NULL
                AND ta.entity_type = 'document_approval'::text
                AND ta.entity_id = document_approvals.id
              )
              OR (
                ta.entity_type IS NULL
                AND ta.entity_id IS NULL
                AND (
                  ta.scope_type = 'all'::text
                  OR (ta.scope_type = 'property'::text AND NOT (ta.scope_id IS DISTINCT FROM d.property_id))
                  OR (ta.scope_type = 'department'::text AND NOT (ta.scope_id IS DISTINCT FROM d.department_id))
                )
              )
            )
        )
      )
    )
  )
  WITH CHECK (
    (approver_id = (SELECT auth.uid()))
    OR (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
  );

-- messages: merge update policies into one.
DROP POLICY IF EXISTS users_archive_own_messages ON public.messages;
DROP POLICY IF EXISTS users_mark_messages_read ON public.messages;
DROP POLICY IF EXISTS users_update_own_draft_messages ON public.messages;
CREATE POLICY messages_update_own ON public.messages
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = sender_id
    OR (SELECT auth.uid()) = recipient_id
  )
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    OR (SELECT auth.uid()) = recipient_id
  );;
