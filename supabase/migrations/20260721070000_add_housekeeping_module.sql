-- ============================================================================
-- MIGRATION: add_housekeeping_module
-- Standalone internal room-status tracker (no PMS integration exists yet;
-- this is the source of truth for room status until a PMS adapter can sync
-- it). RLS mirrors maintenance_tickets' established pattern.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  room_number text NOT NULL,
  floor text,
  room_type text,
  status text NOT NULL DEFAULT 'clean' CHECK (status IN ('clean','dirty','inspected','out_of_order','occupied','vacant')),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, room_number)
);
COMMENT ON TABLE public.rooms IS 'Internal room registry + live status board. Source of truth until a PMS adapter can sync room status.';

CREATE TABLE public.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  task_type text NOT NULL CHECK (task_type IN ('checkout_clean','stayover_clean','deep_clean','inspection','maintenance_flag')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','verified')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  assigned_to uuid REFERENCES public.profiles(id),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.housekeeping_tasks IS 'Housekeeping task queue tied to a room (property_id denormalized for RLS).';

CREATE INDEX idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX idx_housekeeping_tasks_room_id ON public.housekeeping_tasks(room_id);
CREATE INDEX idx_housekeeping_tasks_property_id ON public.housekeeping_tasks(property_id);
CREATE INDEX idx_housekeeping_tasks_assigned_to ON public.housekeeping_tasks(assigned_to);
CREATE INDEX idx_housekeeping_tasks_created_by ON public.housekeeping_tasks(created_by);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY rooms_delete ON public.rooms FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY housekeeping_tasks_select ON public.housekeeping_tasks FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));
CREATE POLICY housekeeping_tasks_insert ON public.housekeeping_tasks FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY housekeeping_tasks_update ON public.housekeeping_tasks FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));
CREATE POLICY housekeeping_tasks_delete ON public.housekeeping_tasks FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER housekeeping_tasks_set_updated_at BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
