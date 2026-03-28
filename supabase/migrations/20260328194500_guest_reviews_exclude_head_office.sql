-- Remove PRIME Head Office from Guest Reviews domain and block future usage.
-- Head Office remains in core org data, but it is not a review-tracked property.

DO $$
DECLARE
  v_head_office_property_id uuid := '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid;
BEGIN
  DELETE FROM public.guest_review_notification_queue q
  WHERE q.review_id IN (
    SELECT gr.id
    FROM public.guest_reviews gr
    WHERE gr.property_id = v_head_office_property_id
  )
  OR q.assignment_id IN (
    SELECT a.id
    FROM public.guest_review_assignments a
    WHERE a.property_id = v_head_office_property_id
  );

  DELETE FROM public.guest_review_audit_events e
  WHERE e.property_id = v_head_office_property_id
    OR e.review_id IN (
      SELECT gr.id
      FROM public.guest_reviews gr
      WHERE gr.property_id = v_head_office_property_id
    )
    OR e.assignment_id IN (
      SELECT a.id
      FROM public.guest_review_assignments a
      WHERE a.property_id = v_head_office_property_id
    )
    OR e.response_id IN (
      SELECT r.id
      FROM public.guest_review_responses r
      JOIN public.guest_reviews gr ON gr.id = r.review_id
      WHERE gr.property_id = v_head_office_property_id
    );

  DELETE FROM public.guest_review_responses r
  USING public.guest_reviews gr
  WHERE r.review_id = gr.id
    AND gr.property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_issues i
  USING public.guest_reviews gr
  WHERE i.review_id = gr.id
    AND gr.property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_assignments a
  WHERE a.property_id = v_head_office_property_id
     OR a.review_id IN (
       SELECT gr.id
       FROM public.guest_reviews gr
       WHERE gr.property_id = v_head_office_property_id
     );

  DELETE FROM public.guest_reviews
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.property_review_owner_mappings
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_property_settings
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_notification_endpoints
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_report_recipients
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_daily_reports
  WHERE property_id = v_head_office_property_id;

  DELETE FROM public.guest_review_sources
  WHERE property_id = v_head_office_property_id;
END $$;

ALTER TABLE public.guest_review_sources
  DROP CONSTRAINT IF EXISTS guest_review_sources_no_head_office_chk;
ALTER TABLE public.guest_review_sources
  ADD CONSTRAINT guest_review_sources_no_head_office_chk
  CHECK (property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_property_settings
  DROP CONSTRAINT IF EXISTS guest_review_property_settings_no_head_office_chk;
ALTER TABLE public.guest_review_property_settings
  ADD CONSTRAINT guest_review_property_settings_no_head_office_chk
  CHECK (property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.property_review_owner_mappings
  DROP CONSTRAINT IF EXISTS property_review_owner_mappings_no_head_office_chk;
ALTER TABLE public.property_review_owner_mappings
  ADD CONSTRAINT property_review_owner_mappings_no_head_office_chk
  CHECK (property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_reviews
  DROP CONSTRAINT IF EXISTS guest_reviews_no_head_office_chk;
ALTER TABLE public.guest_reviews
  ADD CONSTRAINT guest_reviews_no_head_office_chk
  CHECK (property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_assignments
  DROP CONSTRAINT IF EXISTS guest_review_assignments_no_head_office_chk;
ALTER TABLE public.guest_review_assignments
  ADD CONSTRAINT guest_review_assignments_no_head_office_chk
  CHECK (property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_notification_endpoints
  DROP CONSTRAINT IF EXISTS guest_review_notification_endpoints_no_head_office_chk;
ALTER TABLE public.guest_review_notification_endpoints
  ADD CONSTRAINT guest_review_notification_endpoints_no_head_office_chk
  CHECK (property_id IS NULL OR property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_report_recipients
  DROP CONSTRAINT IF EXISTS guest_review_report_recipients_no_head_office_chk;
ALTER TABLE public.guest_review_report_recipients
  ADD CONSTRAINT guest_review_report_recipients_no_head_office_chk
  CHECK (property_id IS NULL OR property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_daily_reports
  DROP CONSTRAINT IF EXISTS guest_review_daily_reports_no_head_office_chk;
ALTER TABLE public.guest_review_daily_reports
  ADD CONSTRAINT guest_review_daily_reports_no_head_office_chk
  CHECK (property_id IS NULL OR property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

ALTER TABLE public.guest_review_audit_events
  DROP CONSTRAINT IF EXISTS guest_review_audit_events_no_head_office_chk;
ALTER TABLE public.guest_review_audit_events
  ADD CONSTRAINT guest_review_audit_events_no_head_office_chk
  CHECK (property_id IS NULL OR property_id <> '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid);

CREATE OR REPLACE FUNCTION public.is_guest_review_portfolio_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role);
$$;

GRANT EXECUTE ON FUNCTION public.is_guest_review_portfolio_admin() TO authenticated;
