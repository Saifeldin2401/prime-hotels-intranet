-- ============================================================================
-- MIGRATION: add_capex_projects_module
-- Adds Projects / Pre-opening / CAPEX domain tables:
-- projects, milestones, expenditures, opening checklist items, and templates.
-- RLS is enabled on every public table and scoped through property access.
-- ============================================================================

CREATE TABLE public.capex_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'renovation'
    CHECK (category IN ('renovation','pre_opening','equipment','it_infrastructure','facility_expansion','sustainability')),
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','approved','in_progress','on_hold','completed','cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  allocated_budget numeric NOT NULL CHECK (allocated_budget >= 0),
  spent_amount numeric NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  target_completion_date date,
  project_manager_id uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.capex_projects IS 'Capital projects, renovations, pre-opening initiatives, and group-level CAPEX programs.';

CREATE TABLE public.capex_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.capex_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','delayed')),
  owner_id uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.capex_milestones IS 'Key milestone dates and delivery checkpoints for CAPEX and pre-opening projects.';

CREATE TABLE public.capex_expenditures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.capex_projects(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  vendor_name text,
  invoice_number text,
  expense_date date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.capex_expenditures IS 'Actual spend captured against CAPEX projects; rolls up into capex_projects.spent_amount.';

CREATE TABLE public.pre_opening_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.capex_projects(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'handover'
    CHECK (phase IN ('brand_standards','legal','hr_staffing','procurement','it_pms','rooms','fnb','sales_marketing','finance','handover')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','blocked','done','waived')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to uuid REFERENCES public.profiles(id),
  due_date date,
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.pre_opening_checklist_items IS 'Opening-readiness checklist items tied to a CAPEX/pre-opening project.';

CREATE TABLE public.capex_project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'pre_opening'
    CHECK (category IN ('renovation','pre_opening','equipment','it_infrastructure','facility_expansion','sustainability')),
  description text,
  default_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.capex_project_templates IS 'Reusable project templates with default checklist phases for openings, renovations, and CAPEX programs.';

CREATE INDEX idx_capex_projects_property_id ON public.capex_projects(property_id);
CREATE INDEX idx_capex_projects_project_manager_id ON public.capex_projects(project_manager_id);
CREATE INDEX idx_capex_projects_created_by ON public.capex_projects(created_by);
CREATE INDEX idx_capex_projects_status_category ON public.capex_projects(status, category);
CREATE INDEX idx_capex_milestones_project_id ON public.capex_milestones(project_id);
CREATE INDEX idx_capex_milestones_owner_id ON public.capex_milestones(owner_id);
CREATE INDEX idx_capex_milestones_created_by ON public.capex_milestones(created_by);
CREATE INDEX idx_capex_expenditures_project_id ON public.capex_expenditures(project_id);
CREATE INDEX idx_capex_expenditures_created_by ON public.capex_expenditures(created_by);
CREATE INDEX idx_pre_opening_checklist_items_project_id ON public.pre_opening_checklist_items(project_id);
CREATE INDEX idx_pre_opening_checklist_items_assigned_to ON public.pre_opening_checklist_items(assigned_to);
CREATE INDEX idx_pre_opening_checklist_items_created_by ON public.pre_opening_checklist_items(created_by);
CREATE INDEX idx_capex_project_templates_created_by ON public.capex_project_templates(created_by);

ALTER TABLE public.capex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_opening_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY capex_projects_select ON public.capex_projects FOR SELECT TO authenticated
  USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id))
    OR created_by = (SELECT auth.uid())
    OR project_manager_id = (SELECT auth.uid())
    OR (
      property_id IS NULL
      AND (
        has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
        OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
        OR has_role((SELECT auth.uid()), 'property_manager'::app_role)
        OR has_role((SELECT auth.uid()), 'department_head'::app_role)
      )
    )
  );

CREATE POLICY capex_projects_insert ON public.capex_projects FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id))
      OR (
        property_id IS NULL
        AND (
          has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
          OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
        )
      )
    )
  );

CREATE POLICY capex_projects_update ON public.capex_projects FOR UPDATE TO authenticated
  USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id))
    OR created_by = (SELECT auth.uid())
    OR project_manager_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id))
    OR created_by = (SELECT auth.uid())
    OR project_manager_id = (SELECT auth.uid())
  );

CREATE POLICY capex_projects_delete ON public.capex_projects FOR DELETE TO authenticated
  USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id))
    OR (
      property_id IS NULL
      AND (
        has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
        OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
      )
    )
  );

CREATE POLICY capex_milestones_select ON public.capex_milestones FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_milestones.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            p.property_id IS NULL
            AND (
              has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'property_manager'::app_role)
              OR has_role((SELECT auth.uid()), 'department_head'::app_role)
            )
          )
        )
    )
  );

CREATE POLICY capex_milestones_insert ON public.capex_milestones FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_milestones.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_milestones_update ON public.capex_milestones FOR UPDATE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_milestones.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_milestones_delete ON public.capex_milestones FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_milestones.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_expenditures_select ON public.capex_expenditures FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            p.property_id IS NULL
            AND (
              has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'property_manager'::app_role)
              OR has_role((SELECT auth.uid()), 'department_head'::app_role)
            )
          )
        )
    )
  );

CREATE POLICY capex_expenditures_insert ON public.capex_expenditures FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_expenditures_update ON public.capex_expenditures FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_expenditures_delete ON public.capex_expenditures FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY pre_opening_checklist_items_select ON public.pre_opening_checklist_items FOR SELECT TO authenticated
  USING (
    assigned_to = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = pre_opening_checklist_items.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            p.property_id IS NULL
            AND (
              has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
              OR has_role((SELECT auth.uid()), 'property_manager'::app_role)
              OR has_role((SELECT auth.uid()), 'department_head'::app_role)
            )
          )
        )
    )
  );

CREATE POLICY pre_opening_checklist_items_insert ON public.pre_opening_checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = pre_opening_checklist_items.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY pre_opening_checklist_items_update ON public.pre_opening_checklist_items FOR UPDATE TO authenticated
  USING (
    assigned_to = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = pre_opening_checklist_items.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY pre_opening_checklist_items_delete ON public.pre_opening_checklist_items FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.capex_projects p
      WHERE p.id = pre_opening_checklist_items.project_id
        AND (
          (p.property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), p.property_id))
          OR p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY capex_project_templates_select ON public.capex_project_templates FOR SELECT TO authenticated
  USING (is_active = true OR created_by = (SELECT auth.uid()));

CREATE POLICY capex_project_templates_modify ON public.capex_project_templates FOR ALL TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'corporate_admin'::app_role)
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
  );

CREATE TRIGGER capex_projects_set_updated_at BEFORE UPDATE ON public.capex_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER capex_milestones_set_updated_at BEFORE UPDATE ON public.capex_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER capex_expenditures_set_updated_at BEFORE UPDATE ON public.capex_expenditures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pre_opening_checklist_items_set_updated_at BEFORE UPDATE ON public.pre_opening_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER capex_project_templates_set_updated_at BEFORE UPDATE ON public.capex_project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalculate_capex_project_spent_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_project_id uuid;
begin
  if tg_op = 'DELETE' then
    v_project_id := old.project_id;
  else
    v_project_id := new.project_id;
  end if;

  update public.capex_projects
  set spent_amount = (
      select coalesce(sum(amount), 0)
      from public.capex_expenditures
      where project_id = v_project_id
    ),
    updated_at = now()
  where id = v_project_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER trg_recalculate_capex_project_spent_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.capex_expenditures
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_capex_project_spent_amount();

INSERT INTO public.capex_project_templates (template_name, category, description, default_checklist)
VALUES
  (
    'Hotel Pre-Opening Readiness',
    'pre_opening',
    'Default readiness plan for legal, staffing, procurement, PMS, rooms, F&B, sales, finance, and handover.',
    '[
      {"phase":"legal","title":"Operating licenses and permits signed off"},
      {"phase":"hr_staffing","title":"Leadership hiring complete"},
      {"phase":"procurement","title":"OS&E and FF&E procurement tracker approved"},
      {"phase":"it_pms","title":"PMS, POS, keycard, and network readiness test complete"},
      {"phase":"rooms","title":"Mock room inspection and defect closure complete"},
      {"phase":"fnb","title":"Menu engineering and kitchen readiness signed off"},
      {"phase":"sales_marketing","title":"OTA, website, and opening campaign checklist complete"},
      {"phase":"finance","title":"Cash handling, banking, and cost-control procedures approved"},
      {"phase":"handover","title":"Owner/operator handover pack accepted"}
    ]'::jsonb
  ),
  (
    'Guestroom Renovation',
    'renovation',
    'Renovation template covering mockup approval, procurement, room release, snagging, and closeout.',
    '[
      {"phase":"brand_standards","title":"Mockup room approved against brand standards"},
      {"phase":"procurement","title":"Long-lead FF&E orders confirmed"},
      {"phase":"rooms","title":"Room release schedule agreed with operations"},
      {"phase":"handover","title":"Snag list closed and rooms returned to inventory"}
    ]'::jsonb
  ),
  (
    'Systems & Infrastructure Upgrade',
    'it_infrastructure',
    'Technology upgrade template for PMS, network, cyber, interfaces, and go-live support.',
    '[
      {"phase":"it_pms","title":"Interface map and cutover plan approved"},
      {"phase":"procurement","title":"Hardware and license procurement complete"},
      {"phase":"it_pms","title":"UAT completed with department heads"},
      {"phase":"handover","title":"Go-live support and handover completed"}
    ]'::jsonb
  );
