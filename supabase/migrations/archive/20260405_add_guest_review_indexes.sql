BEGIN;

-- Add missing FK indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_review_raw_snapshots_review_id 
  ON public.guest_review_raw_snapshots(review_id);
  
CREATE INDEX IF NOT EXISTS idx_guest_review_raw_snapshots_source_id 
  ON public.guest_review_raw_snapshots(source_id);

CREATE INDEX IF NOT EXISTS idx_property_review_owner_mappings_primary 
  ON public.property_review_owner_mappings(primary_profile_id) 
  WHERE primary_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_review_owner_mappings_backup 
  ON public.property_review_owner_mappings(backup_profile_id) 
  WHERE backup_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_review_responses_posted_by 
  ON public.guest_review_responses(posted_by) 
  WHERE posted_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_review_responses_last_edited_by 
  ON public.guest_review_responses(last_edited_by) 
  WHERE last_edited_by IS NOT NULL;

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_guest_reviews_sla_monitoring 
  ON public.guest_reviews(property_id, status, response_sla_due_at) 
  WHERE status IN ('assigned', 'acknowledged', 'response_pending', 'escalated');

CREATE INDEX IF NOT EXISTS idx_guest_reviews_severity_alert 
  ON public.guest_reviews(property_id, severity, status) 
  WHERE severity IN ('high', 'critical');

COMMIT;
