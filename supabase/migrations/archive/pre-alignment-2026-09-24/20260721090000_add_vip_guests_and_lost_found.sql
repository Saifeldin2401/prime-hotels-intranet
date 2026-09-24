-- ============================================================================
-- MIGRATION: add_vip_guests_and_lost_found
-- Completes the Operations Core module (VIP flagging + Lost & Found), the
-- two features not built in the first Operations Core pass.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.vip_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  guest_name text NOT NULL,
  room_number text,
  vip_tier text,
  notes text,
  arrival_date date,
  departure_date date,
  flagged_by uuid NOT NULL REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vip_guests IS 'VIP guest flags with staff-visible notes for stay awareness.';

CREATE TABLE public.lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  item_description text NOT NULL,
  found_location text,
  found_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed','claimed','disposed')),
  claimed_by_guest_name text,
  claimed_at timestamptz,
  stored_location text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.lost_found_items IS 'Lost & found item register.';

CREATE INDEX idx_vip_guests_property_id ON public.vip_guests(property_id);
CREATE INDEX idx_vip_guests_flagged_by ON public.vip_guests(flagged_by);
CREATE INDEX idx_lost_found_items_property_id ON public.lost_found_items(property_id);
CREATE INDEX idx_lost_found_items_created_by ON public.lost_found_items(created_by);

ALTER TABLE public.vip_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY vip_guests_select ON public.vip_guests FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR flagged_by = (SELECT auth.uid()));
CREATE POLICY vip_guests_insert ON public.vip_guests FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND flagged_by = (SELECT auth.uid()));
CREATE POLICY vip_guests_update ON public.vip_guests FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR flagged_by = (SELECT auth.uid()));
CREATE POLICY vip_guests_delete ON public.vip_guests FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY lost_found_items_select ON public.lost_found_items FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY lost_found_items_insert ON public.lost_found_items FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY lost_found_items_update ON public.lost_found_items FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY lost_found_items_delete ON public.lost_found_items FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER vip_guests_set_updated_at BEFORE UPDATE ON public.vip_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER lost_found_items_set_updated_at BEFORE UPDATE ON public.lost_found_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
