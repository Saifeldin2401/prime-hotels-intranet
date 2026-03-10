-- Tighten announcements select policy to enforce target audiences and scope
BEGIN;

DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;

CREATE POLICY "announcements_select_policy" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now()) AND
    (scheduled_at IS NULL OR scheduled_at <= now()) AND
    (
      public.has_role_optimized('corporate_admin'::public.app_role) OR
      public.has_role_optimized('regional_admin'::public.app_role) OR
      public.has_role_optimized('regional_hr'::public.app_role) OR
      public.has_role_optimized('property_manager'::public.app_role) OR
      public.has_role_optimized('property_hr'::public.app_role) OR
      public.has_role_optimized('department_head'::public.app_role) OR
      (
        (property_id IS NULL OR EXISTS (
          SELECT 1 FROM public.user_properties up
          WHERE up.user_id = auth.uid() AND up.property_id = announcements.property_id
        )) AND
        (department_id IS NULL OR EXISTS (
          SELECT 1 FROM public.user_departments ud
          WHERE ud.user_id = auth.uid() AND ud.department_id = announcements.department_id
        )) AND
        (
          target_audience IS NULL OR
          (target_audience->>'type') IS NULL OR
          (target_audience->>'type') = 'all' OR
          (
            (target_audience->>'type') = 'role' AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
              AND ur.role::text IN (
                SELECT jsonb_array_elements_text(target_audience->'values')
              )
            )
          ) OR
          (
            (target_audience->>'type') = 'department' AND EXISTS (
              SELECT 1 FROM public.user_departments ud
              WHERE ud.user_id = auth.uid()
              AND ud.department_id::text IN (
                SELECT jsonb_array_elements_text(target_audience->'values')
              )
            )
          ) OR
          (
            (target_audience->>'type') = 'property' AND EXISTS (
              SELECT 1 FROM public.user_properties up
              WHERE up.user_id = auth.uid()
              AND up.property_id::text IN (
                SELECT jsonb_array_elements_text(target_audience->'values')
              )
            )
          ) OR
          (
            (target_audience->>'type') = 'individual' AND (
              auth.uid()::text IN (
                SELECT jsonb_array_elements_text(target_audience->'values')
              )
            )
          )
        )
      )
    )
  );

COMMIT;
