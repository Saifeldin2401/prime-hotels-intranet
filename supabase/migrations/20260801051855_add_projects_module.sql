-- ============================================================================
-- MIGRATION: add_projects_module
-- Adds Projects (pre-opening, renovation, CAPEX, opening checklists). Task
-- management is NOT duplicated -- the existing, already-full-featured `tasks`
-- table (status/priority/assignee/due_date/tags) gets a nullable project_id
-- link instead, so a project's "checklist" is just its tasks. Existing task
-- RLS policies apply unchanged (row-level, unaffected by a new column).
-- ============================================================================

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'other' CHECK (project_type IN ('pre_opening','renovation','capex','other')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','on_hold','completed','cancelled')),
  budget_amount numeric,
  actual_spend numeric NOT NULL DEFAULT 0,
  start_date date,
  target_completion_date date,
  actual_completion_date date,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.projects IS 'Pre-opening, renovation, and CAPEX projects. Checklists/task management reuse the existing tasks table via tasks.project_id.';

CREATE INDEX idx_projects_property_id ON public.projects(property_id);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ADD COLUMN project_id uuid REFERENCES public.projects(id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
