-- Align operations import permissions with routed access and make import deletion atomic.

DROP POLICY IF EXISTS "Managers can insert occupancy data" ON public.daily_occupancy;
CREATE POLICY "Managers can insert occupancy data" ON public.daily_occupancy
  FOR INSERT WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can update occupancy data" ON public.daily_occupancy;
CREATE POLICY "Managers can update occupancy data" ON public.daily_occupancy
  FOR UPDATE USING (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can insert revenue data" ON public.daily_revenue;
CREATE POLICY "Managers can insert revenue data" ON public.daily_revenue
  FOR INSERT WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can update revenue data" ON public.daily_revenue;
CREATE POLICY "Managers can update revenue data" ON public.daily_revenue
  FOR UPDATE USING (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can manage segments" ON public.market_segments;
CREATE POLICY "Managers can manage segments" ON public.market_segments
  FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can manage inventory" ON public.room_inventory;
CREATE POLICY "Managers can manage inventory" ON public.room_inventory
  FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can manage rates" ON public.rate_summary;
CREATE POLICY "Managers can manage rates" ON public.rate_summary
  FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

DROP POLICY IF EXISTS "Managers can create import logs" ON public.data_import_logs;
CREATE POLICY "Managers can create import logs" ON public.data_import_logs
  FOR INSERT WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), property_id)
  );

CREATE OR REPLACE FUNCTION public.delete_operations_import(import_log_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_property_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT property_id
  INTO target_property_id
  FROM public.data_import_logs
  WHERE id = import_log_id;

  IF target_property_id IS NULL THEN
    RAISE EXCEPTION 'Import log not found';
  END IF;

  IF NOT (
    public.has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']::app_role[])
    AND public.has_property_access(auth.uid(), target_property_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete this import';
  END IF;

  DELETE FROM public.market_segments WHERE source_import_id = import_log_id;
  DELETE FROM public.room_inventory WHERE source_import_id = import_log_id;
  DELETE FROM public.rate_summary WHERE source_import_id = import_log_id;
  DELETE FROM public.daily_revenue WHERE source_import_id = import_log_id;
  DELETE FROM public.daily_occupancy WHERE source_import_id = import_log_id;
  DELETE FROM public.data_import_logs WHERE id = import_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_operations_import(UUID) TO authenticated;
