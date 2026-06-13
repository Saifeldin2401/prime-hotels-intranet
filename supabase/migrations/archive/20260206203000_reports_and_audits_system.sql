-- Reports & Audits System (Core Tables + RLS)
-- Date: 2026-02-06

BEGIN;

-- REPORTS
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scope_type text NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'property', 'department')),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_cron text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  output_url text,
  row_count integer,
  triggered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AUDITS
CREATE TABLE IF NOT EXISTS public.audit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scope_type text NOT NULL DEFAULT 'property' CHECK (scope_type IN ('global', 'property', 'department')),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  frequency text DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.audit_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.audit_items(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'na')),
  notes text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_report_definitions_updated_at
      BEFORE UPDATE ON public.report_definitions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_audit_templates_updated_at
      BEFORE UPDATE ON public.audit_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_audit_findings_updated_at
      BEFORE UPDATE ON public.audit_findings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

-- REPORTS RLS
CREATE POLICY report_definitions_select ON public.report_definitions
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY report_definitions_manage ON public.report_definitions
  FOR ALL TO authenticated
  USING (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY report_runs_select ON public.report_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.report_definitions rd
      WHERE rd.id = report_id
        AND (
          rd.created_by = (select auth.uid())
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('department_head'::public.app_role)
        )
    )
  );

CREATE POLICY report_runs_manage ON public.report_runs
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

-- AUDITS RLS
CREATE POLICY audit_templates_select ON public.audit_templates
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY audit_templates_manage ON public.audit_templates
  FOR ALL TO authenticated
  USING (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY audit_items_select ON public.audit_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_templates t
      WHERE t.id = template_id
        AND (
          t.created_by = (select auth.uid())
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('department_head'::public.app_role)
        )
    )
  );

CREATE POLICY audit_items_manage ON public.audit_items
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY audit_runs_select ON public.audit_runs
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY audit_runs_manage ON public.audit_runs
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY audit_findings_select ON public.audit_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_runs r
      WHERE r.id = run_id
        AND (
          r.created_by = (select auth.uid())
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('department_head'::public.app_role)
        )
    )
  );

CREATE POLICY audit_findings_manage ON public.audit_findings
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
