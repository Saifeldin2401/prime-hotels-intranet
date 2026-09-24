BEGIN;
-- Restore the original assignment targeting columns the frontend expects (additive;
-- the new-model rules page on assignment_type/la_* is untouched).
ALTER TABLE public.training_assignment_rules
  ADD COLUMN IF NOT EXISTS target_type  text,
  ADD COLUMN IF NOT EXISTS target_id    text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS priority     text DEFAULT 'normal';

ALTER TABLE public.training_assignment_rules ALTER COLUMN target_role DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.learning_assignment_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.learning_content_type NOT NULL,
  content_id uuid NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignment_exemptions_unique_user_content UNIQUE (user_id, content_type, content_id)
);

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
  CONSTRAINT learning_assignment_user_overrides_unique_user_content UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_content ON public.learning_assignment_exemptions (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_user ON public.learning_assignment_exemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_content ON public.learning_assignment_user_overrides (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_user ON public.learning_assignment_user_overrides (user_id);

ALTER TABLE public.learning_assignment_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignment_user_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_assignment_exemptions_select_policy ON public.learning_assignment_exemptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_exemptions_manage_policy ON public.learning_assignment_exemptions
  FOR ALL TO authenticated
  USING (public.is_hr_or_admin((SELECT auth.uid())))
  WITH CHECK (public.is_hr_or_admin((SELECT auth.uid())));

CREATE POLICY learning_assignment_user_overrides_select_policy ON public.learning_assignment_user_overrides
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_user_overrides_manage_policy ON public.learning_assignment_user_overrides
  FOR ALL TO authenticated
  USING (public.is_hr_or_admin((SELECT auth.uid())))
  WITH CHECK (public.is_hr_or_admin((SELECT auth.uid())));
COMMIT;
