-- Admins should be able to see all notification delivery events in the analytics dashboard
CREATE POLICY admins_read_notification_delivery_events ON public.notification_delivery_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
