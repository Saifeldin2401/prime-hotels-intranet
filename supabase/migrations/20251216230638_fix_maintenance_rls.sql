-- Fix Maintenance Tickets RLS Policies (Column Name Mismatch)

DROP POLICY IF EXISTS "maintenance_tickets_select_policy" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_insert_policy" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_update_policy" ON maintenance_tickets;

-- Corrected SELECT policy using reported_by_id and assigned_to_id
CREATE POLICY "maintenance_tickets_select_policy" ON maintenance_tickets FOR SELECT
USING (
  has_property_access(auth.uid(), property_id) OR
  (reported_by_id = auth.uid()) OR
  (assigned_to_id = auth.uid())
);

-- Corrected INSERT policy using reported_by_id
CREATE POLICY "maintenance_tickets_insert_policy" ON maintenance_tickets FOR INSERT
WITH CHECK (
  auth.uid() = reported_by_id
);

-- Corrected UPDATE policy using reported_by_id and assigned_to_id
CREATE POLICY "maintenance_tickets_update_policy" ON maintenance_tickets FOR UPDATE
USING (
  has_property_access(auth.uid(), property_id) OR
  (reported_by_id = auth.uid()) OR
  (assigned_to_id = auth.uid())
);;
