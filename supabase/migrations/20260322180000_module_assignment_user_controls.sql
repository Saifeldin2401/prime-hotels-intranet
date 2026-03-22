BEGIN;

CREATE TABLE IF NOT EXISTS public.learning_assignment_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.learning_content_type NOT NULL,
  content_id uuid NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignment_exemptions_unique_user_content
    UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_content
  ON public.learning_assignment_exemptions (content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_user
  ON public.learning_assignment_exemptions (user_id);

CREATE TABLE IF NOT EXISTS public.learning_assignment_user_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.learning_content_type NOT NULL,
  content_id uuid NOT NULL,
  due_date timestamptz,
  priority text CHECK (priority IS NULL OR priority = ANY (ARRAY['normal'::text, 'high'::text, 'compliance'::text])),
  instructions text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignment_user_overrides_unique_user_content
    UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_content
  ON public.learning_assignment_user_overrides (content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_user
  ON public.learning_assignment_user_overrides (user_id);

DROP TRIGGER IF EXISTS update_learning_assignment_exemptions_updated_at
  ON public.learning_assignment_exemptions;
CREATE TRIGGER update_learning_assignment_exemptions_updated_at
  BEFORE UPDATE ON public.learning_assignment_exemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_assignment_user_overrides_updated_at
  ON public.learning_assignment_user_overrides;
CREATE TRIGGER update_learning_assignment_user_overrides_updated_at
  BEFORE UPDATE ON public.learning_assignment_user_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.learning_assignment_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignment_user_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_assignment_exemptions_select_policy ON public.learning_assignment_exemptions;
CREATE POLICY learning_assignment_exemptions_select_policy
  ON public.learning_assignment_exemptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  );

DROP POLICY IF EXISTS learning_assignment_exemptions_manage_policy ON public.learning_assignment_exemptions;
CREATE POLICY learning_assignment_exemptions_manage_policy
  ON public.learning_assignment_exemptions
  FOR ALL
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  );

DROP POLICY IF EXISTS learning_assignment_user_overrides_select_policy ON public.learning_assignment_user_overrides;
CREATE POLICY learning_assignment_user_overrides_select_policy
  ON public.learning_assignment_user_overrides
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  );

DROP POLICY IF EXISTS learning_assignment_user_overrides_manage_policy ON public.learning_assignment_user_overrides;
CREATE POLICY learning_assignment_user_overrides_manage_policy
  ON public.learning_assignment_user_overrides
  FOR ALL
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'corporate_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
    OR has_role((SELECT auth.uid()), 'regional_hr'::text)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
    OR has_role((SELECT auth.uid()), 'property_hr'::text)
    OR has_role((SELECT auth.uid()), 'department_head'::text)
  );

COMMIT;
