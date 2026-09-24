-- ============================================================================
-- MIGRATION: add_operations_core_essentials
-- Adds the three highest-frequency hospitality-native Operations features:
-- Guest Requests, Incidents, and a Daily Logbook (which can reference an
-- incident). These are the workflows this app currently pushes to WhatsApp/
-- paper. RLS mirrors maintenance_tickets' established pattern exactly:
-- has_property_access(auth.uid(), property_id) OR self (reporter/assignee).
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.guest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  room_number text,
  guest_name text,
  request_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.guest_requests IS 'Front-line guest service requests (towels, late checkout, wake-up calls, etc). Replaces ad-hoc WhatsApp fulfillment tracking.';

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','major','critical')),
  description text NOT NULL,
  location text,
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.incidents IS 'Operational incident log (guest complaints, safety issues, property damage). Feeds the daily logbook via logbook_entries.incident_id.';

CREATE TABLE public.logbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  shift text CHECK (shift IN ('morning','afternoon','evening','night')),
  entry_type text NOT NULL DEFAULT 'general' CHECK (entry_type IN ('general','handover','incident_ref')),
  content text NOT NULL,
  incident_id uuid REFERENCES public.incidents(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.logbook_entries IS 'Running per-shift operational log and shift-handover notes. Replaces the paper logbook.';

CREATE INDEX idx_guest_requests_property_id ON public.guest_requests(property_id);
CREATE INDEX idx_guest_requests_department_id ON public.guest_requests(department_id);
CREATE INDEX idx_guest_requests_assigned_to ON public.guest_requests(assigned_to);
CREATE INDEX idx_guest_requests_created_by ON public.guest_requests(created_by);

CREATE INDEX idx_incidents_property_id ON public.incidents(property_id);
CREATE INDEX idx_incidents_department_id ON public.incidents(department_id);
CREATE INDEX idx_incidents_reported_by ON public.incidents(reported_by);

CREATE INDEX idx_logbook_entries_property_id ON public.logbook_entries(property_id);
CREATE INDEX idx_logbook_entries_department_id ON public.logbook_entries(department_id);
CREATE INDEX idx_logbook_entries_incident_id ON public.logbook_entries(incident_id);
CREATE INDEX idx_logbook_entries_created_by ON public.logbook_entries(created_by);

ALTER TABLE public.guest_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_requests_select ON public.guest_requests FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));
CREATE POLICY guest_requests_insert ON public.guest_requests FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY guest_requests_update ON public.guest_requests FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));
CREATE POLICY guest_requests_delete ON public.guest_requests FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY incidents_select ON public.incidents FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR reported_by = (SELECT auth.uid()));
CREATE POLICY incidents_insert ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND reported_by = (SELECT auth.uid()));
CREATE POLICY incidents_update ON public.incidents FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR reported_by = (SELECT auth.uid()));
CREATE POLICY incidents_delete ON public.incidents FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY logbook_entries_select ON public.logbook_entries FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY logbook_entries_insert ON public.logbook_entries FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY logbook_entries_update ON public.logbook_entries FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY logbook_entries_delete ON public.logbook_entries FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER guest_requests_set_updated_at BEFORE UPDATE ON public.guest_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER incidents_set_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER logbook_entries_set_updated_at BEFORE UPDATE ON public.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
