BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  CREATE TYPE public.guest_review_platform AS ENUM (
    'google',
    'booking',
    'expedia',
    'tripadvisor',
    'agoda',
    'hotels_com',
    'airbnb',
    'manual_import'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_status AS ENUM (
    'collected',
    'analyzed',
    'assigned',
    'acknowledged',
    'response_pending',
    'responded',
    'closed',
    'escalated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_assignment_status AS ENUM (
    'pending_ack',
    'acknowledged',
    'action_in_progress',
    'closed',
    'escalated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.review_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.review_sentiment AS ENUM (
    'positive',
    'neutral',
    'negative',
    'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_responsibility_code AS ENUM (
    'general_manager',
    'area_general_manager',
    'corporate_reputation_owner',
    'rooms_manager',
    'housekeeping_manager',
    'fnb_manager',
    'maintenance_manager',
    'it_manager'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_issue_category AS ENUM (
    'cleanliness',
    'staff_behavior',
    'room_issues',
    'maintenance',
    'food_beverage',
    'internet_tech',
    'check_in_out',
    'reservation_billing',
    'noise',
    'safety_security',
    'amenities',
    'location',
    'value',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_endpoint_channel AS ENUM (
    'slack',
    'email',
    'whatsapp',
    'sms'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_endpoint_scope AS ENUM (
    'property',
    'department',
    'global',
    'executive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_notification_status AS ENUM (
    'pending',
    'processing',
    'sent',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_source_health AS ENUM (
    'healthy',
    'degraded',
    'disabled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.guest_review_tone_profile AS ENUM (
    'luxury',
    'business',
    'casual_hospitality'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.guest_review_property_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  default_tone public.guest_review_tone_profile NOT NULL DEFAULT 'business',
  response_languages text[] NOT NULL DEFAULT ARRAY['en', 'ar']::text[],
  slack_alerts_enabled boolean NOT NULL DEFAULT true,
  email_alerts_enabled boolean NOT NULL DEFAULT true,
  executive_report_enabled boolean NOT NULL DEFAULT true,
  executive_report_recipients_enabled boolean NOT NULL DEFAULT true,
  report_deep_link_path text NOT NULL DEFAULT '/reviews?tab=executive',
  ai_response_instructions text,
  escalation_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

CREATE TABLE IF NOT EXISTS public.guest_review_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  platform public.guest_review_platform NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  listing_url text,
  polling_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  poll_frequency_hours integer NOT NULL DEFAULT 5,
  firecrawl_extract_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  firecrawl_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_secret_name text,
  health_status public.guest_review_source_health NOT NULL DEFAULT 'healthy',
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_polled_at timestamptz,
  last_success_at timestamptz,
  next_poll_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, platform, source_url)
);

CREATE TABLE IF NOT EXISTS public.guest_review_collection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.guest_review_sources(id) ON DELETE CASCADE,
  run_mode text NOT NULL DEFAULT 'scheduled' CHECK (run_mode IN ('scheduled', 'backfill', 'manual', 'import')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reviews_collected integer NOT NULL DEFAULT 0,
  reviews_new integer NOT NULL DEFAULT 0,
  reviews_updated integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  empty_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.guest_review_sources(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  platform public.guest_review_platform NOT NULL,
  source_review_id text,
  review_url text,
  source_listing_url text,
  reviewer_name text,
  reviewer_location text,
  reviewer_avatar_url text,
  reviewer_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_title text,
  review_text text NOT NULL,
  review_text_normalized text,
  review_language text,
  original_rating numeric(6,2),
  original_rating_scale numeric(6,2),
  rating_normalized_5 numeric(6,2),
  rating_normalized_10 numeric(6,2),
  sentiment public.review_sentiment,
  sentiment_score numeric(6,2),
  severity public.review_severity,
  vip_flag boolean NOT NULL DEFAULT false,
  critical_flag boolean NOT NULL DEFAULT false,
  ai_analysis_status text NOT NULL DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'completed', 'failed')),
  ai_analyzed_at timestamptz,
  summary_en text,
  summary_ar text,
  manager_brief_en text,
  manager_brief_ar text,
  positive_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.guest_review_status NOT NULL DEFAULT 'collected',
  published_at timestamptz,
  collected_at timestamptz NOT NULL DEFAULT now(),
  response_sla_due_at timestamptz,
  first_assigned_at timestamptz,
  first_acknowledged_at timestamptz,
  responded_at timestamptz,
  closed_at timestamptz,
  dedupe_hash text,
  external_posting_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_raw_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.guest_review_sources(id) ON DELETE SET NULL,
  source_url text,
  firecrawl_method text NOT NULL DEFAULT 'scrape' CHECK (firecrawl_method IN ('scrape', 'extract', 'import')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  category public.guest_review_issue_category NOT NULL,
  label text,
  polarity public.review_sentiment,
  severity public.review_severity NOT NULL DEFAULT 'medium',
  confidence numeric(5,2) NOT NULL DEFAULT 0.70,
  evidence_text text,
  issue_summary_en text,
  issue_summary_ar text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_review_owner_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  responsibility_code public.guest_review_responsibility_code NOT NULL,
  primary_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  backup_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, responsibility_code)
);

CREATE TABLE IF NOT EXISTS public.guest_review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  responsibility_code public.guest_review_responsibility_code NOT NULL,
  assignee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  backup_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issue_categories public.guest_review_issue_category[] NOT NULL DEFAULT '{}'::public.guest_review_issue_category[],
  issue_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status public.guest_review_assignment_status NOT NULL DEFAULT 'pending_ack',
  is_secondary boolean NOT NULL DEFAULT false,
  routing_reason text,
  escalation_level integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  started_at timestamptz,
  escalated_at timestamptz,
  closed_at timestamptz,
  last_notification_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  selected_tone public.guest_review_tone_profile NOT NULL DEFAULT 'business',
  draft_response_en text,
  draft_response_ar text,
  edited_response_en text,
  edited_response_ar text,
  internal_notes text,
  posted_externally boolean NOT NULL DEFAULT false,
  posted_at timestamptz,
  posted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  proof_url text,
  proof_note text,
  last_edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id)
);

CREATE TABLE IF NOT EXISTS public.guest_review_notification_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  responsibility_code public.guest_review_responsibility_code,
  scope public.guest_review_endpoint_scope NOT NULL DEFAULT 'property',
  channel public.guest_review_endpoint_channel NOT NULL,
  label text NOT NULL,
  secret_name text,
  recipients text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.guest_review_assignments(id) ON DELETE CASCADE,
  endpoint_id uuid REFERENCES public.guest_review_notification_endpoints(id) ON DELETE SET NULL,
  notification_kind text NOT NULL CHECK (
    notification_kind IN (
      'review_alert',
      'critical_alert',
      'escalation_alert',
      'daily_exec_digest',
      'source_degraded'
    )
  ),
  channel public.guest_review_endpoint_channel NOT NULL,
  status public.guest_review_notification_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  scope_level text NOT NULL DEFAULT 'group' CHECK (scope_level IN ('group', 'property', 'region')),
  recipient_type text NOT NULL DEFAULT 'custom' CHECK (recipient_type IN ('custom', 'corporate', 'area_gm', 'property_gm')),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  include_attachment boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  scope_level text NOT NULL DEFAULT 'group' CHECK (scope_level IN ('group', 'property', 'region')),
  title text NOT NULL,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_bucket text NOT NULL DEFAULT 'reports-exports',
  storage_path text,
  emailed_to text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_review_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.guest_review_assignments(id) ON DELETE CASCADE,
  response_id uuid REFERENCES public.guest_review_responses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_reviews_platform_source_review
  ON public.guest_reviews(platform, source_review_id)
  WHERE source_review_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_reviews_dedupe_hash
  ON public.guest_reviews(dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_review_sources_property_health
  ON public.guest_review_sources(property_id, health_status, polling_enabled);

CREATE INDEX IF NOT EXISTS idx_guest_review_sources_next_poll
  ON public.guest_review_sources(next_poll_at)
  WHERE is_active = true AND polling_enabled = true;

CREATE INDEX IF NOT EXISTS idx_guest_reviews_property_status
  ON public.guest_reviews(property_id, status, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_reviews_property_published
  ON public.guest_reviews(property_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_reviews_response_due
  ON public.guest_reviews(response_sla_due_at)
  WHERE status IN ('assigned', 'acknowledged', 'response_pending', 'escalated');

CREATE INDEX IF NOT EXISTS idx_guest_review_issues_review
  ON public.guest_review_issues(review_id, category);

CREATE INDEX IF NOT EXISTS idx_guest_review_assignments_open_due
  ON public.guest_review_assignments(property_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_guest_review_assignments_assignee
  ON public.guest_review_assignments(assignee_profile_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_guest_review_notification_queue_status
  ON public.guest_review_notification_queue(status, scheduled_for, created_at);

CREATE INDEX IF NOT EXISTS idx_guest_review_daily_reports_scope
  ON public.guest_review_daily_reports(report_date DESC, property_id, scope_level);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports-exports',
  'reports-exports',
  false,
  100 * 1024 * 1024,
  ARRAY['text/csv', 'application/json', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(storage.buckets.allowed_mime_types || EXCLUDED.allowed_mime_types)
  )
);

CREATE OR REPLACE FUNCTION public.is_guest_review_portfolio_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_guest_review_property_user(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      public.has_role_optimized('property_manager'::public.app_role)
      OR public.has_role_optimized('property_hr'::public.app_role)
    )
    AND public.has_property_access(auth.uid(), p_property_id)
$$;

CREATE OR REPLACE FUNCTION public.is_guest_review_mapped_owner(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_review_owner_mappings prom
    WHERE prom.property_id = p_property_id
      AND prom.is_active = true
      AND auth.uid() IN (prom.primary_profile_id, prom.backup_profile_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_guest_review_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_guest_review_portfolio_admin()
    OR public.is_guest_review_property_user(p_property_id)
    OR public.is_guest_review_mapped_owner(p_property_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_guest_review_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_guest_review_portfolio_admin()
    OR public.is_guest_review_property_user(p_property_id)
$$;

CREATE OR REPLACE FUNCTION public.can_act_on_guest_review_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guest_review_assignments gra
    WHERE gra.id = p_assignment_id
      AND (
        public.can_manage_guest_review_property(gra.property_id)
        OR auth.uid() IN (gra.assignee_profile_id, gra.backup_profile_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_act_on_guest_review_response(p_review_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guest_reviews gr
    WHERE gr.id = p_review_id
      AND (
        public.can_manage_guest_review_property(gr.property_id)
        OR EXISTS (
          SELECT 1
          FROM public.guest_review_assignments gra
          WHERE gra.review_id = gr.id
            AND auth.uid() IN (gra.assignee_profile_id, gra.backup_profile_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.guest_review_report_id_from_storage_path(storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
BEGIN
  parts := string_to_array(coalesce(storage_path, ''), '/');
  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  RETURN parts[2]::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.get_secure_guest_review_report_url(p_report_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.guest_review_daily_reports%ROWTYPE;
  v_signed text;
BEGIN
  SELECT *
  INTO v_report
  FROM public.guest_review_daily_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Guest review report not found';
  END IF;

  IF NOT (
    (v_report.property_id IS NULL AND public.is_guest_review_portfolio_admin())
    OR public.can_access_guest_review_property(v_report.property_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this guest review report';
  END IF;

  SELECT storage.create_signed_url(
    coalesce(nullif(v_report.storage_bucket, ''), 'reports-exports'),
    v_report.storage_path,
    3600
  )
  INTO v_signed;

  RETURN v_signed;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_secure_guest_review_report_url(uuid) TO authenticated;

ALTER TABLE public.guest_review_property_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_raw_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_review_owner_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_notification_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_review_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guest_review_property_settings_select ON public.guest_review_property_settings;
CREATE POLICY guest_review_property_settings_select
  ON public.guest_review_property_settings
  FOR SELECT
  TO authenticated
  USING (public.can_access_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_property_settings_manage ON public.guest_review_property_settings;
CREATE POLICY guest_review_property_settings_manage
  ON public.guest_review_property_settings
  FOR ALL
  TO authenticated
  USING (public.can_manage_guest_review_property(property_id))
  WITH CHECK (public.can_manage_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_sources_select ON public.guest_review_sources;
CREATE POLICY guest_review_sources_select
  ON public.guest_review_sources
  FOR SELECT
  TO authenticated
  USING (public.can_access_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_sources_manage ON public.guest_review_sources;
CREATE POLICY guest_review_sources_manage
  ON public.guest_review_sources
  FOR ALL
  TO authenticated
  USING (public.can_manage_guest_review_property(property_id))
  WITH CHECK (public.can_manage_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_collection_runs_select ON public.guest_review_collection_runs;
CREATE POLICY guest_review_collection_runs_select
  ON public.guest_review_collection_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guest_review_sources grs
      WHERE grs.id = guest_review_collection_runs.source_id
        AND public.can_access_guest_review_property(grs.property_id)
    )
  );

DROP POLICY IF EXISTS guest_reviews_select ON public.guest_reviews;
CREATE POLICY guest_reviews_select
  ON public.guest_reviews
  FOR SELECT
  TO authenticated
  USING (public.can_access_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_reviews_manage ON public.guest_reviews;
CREATE POLICY guest_reviews_manage
  ON public.guest_reviews
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_guest_review_property(property_id))
  WITH CHECK (public.can_manage_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_raw_snapshots_select ON public.guest_review_raw_snapshots;
CREATE POLICY guest_review_raw_snapshots_select
  ON public.guest_review_raw_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guest_reviews gr
      WHERE gr.id = guest_review_raw_snapshots.review_id
        AND public.can_access_guest_review_property(gr.property_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.guest_review_sources grs
      WHERE grs.id = guest_review_raw_snapshots.source_id
        AND public.can_access_guest_review_property(grs.property_id)
    )
  );

DROP POLICY IF EXISTS guest_review_issues_select ON public.guest_review_issues;
CREATE POLICY guest_review_issues_select
  ON public.guest_review_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guest_reviews gr
      WHERE gr.id = guest_review_issues.review_id
        AND public.can_access_guest_review_property(gr.property_id)
    )
  );

DROP POLICY IF EXISTS property_review_owner_mappings_select ON public.property_review_owner_mappings;
CREATE POLICY property_review_owner_mappings_select
  ON public.property_review_owner_mappings
  FOR SELECT
  TO authenticated
  USING (public.can_access_guest_review_property(property_id));

DROP POLICY IF EXISTS property_review_owner_mappings_manage ON public.property_review_owner_mappings;
CREATE POLICY property_review_owner_mappings_manage
  ON public.property_review_owner_mappings
  FOR ALL
  TO authenticated
  USING (public.can_manage_guest_review_property(property_id))
  WITH CHECK (public.can_manage_guest_review_property(property_id));

DROP POLICY IF EXISTS guest_review_assignments_select ON public.guest_review_assignments;
CREATE POLICY guest_review_assignments_select
  ON public.guest_review_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_guest_review_property(property_id)
    OR auth.uid() IN (assignee_profile_id, backup_profile_id)
  );

DROP POLICY IF EXISTS guest_review_assignments_manage ON public.guest_review_assignments;
CREATE POLICY guest_review_assignments_manage
  ON public.guest_review_assignments
  FOR UPDATE
  TO authenticated
  USING (public.can_act_on_guest_review_assignment(id))
  WITH CHECK (public.can_act_on_guest_review_assignment(id));

DROP POLICY IF EXISTS guest_review_responses_select ON public.guest_review_responses;
CREATE POLICY guest_review_responses_select
  ON public.guest_review_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guest_reviews gr
      WHERE gr.id = guest_review_responses.review_id
        AND public.can_access_guest_review_property(gr.property_id)
    )
  );

DROP POLICY IF EXISTS guest_review_responses_manage ON public.guest_review_responses;
CREATE POLICY guest_review_responses_manage
  ON public.guest_review_responses
  FOR ALL
  TO authenticated
  USING (public.can_act_on_guest_review_response(review_id))
  WITH CHECK (public.can_act_on_guest_review_response(review_id));

DROP POLICY IF EXISTS guest_review_notification_endpoints_select ON public.guest_review_notification_endpoints;
CREATE POLICY guest_review_notification_endpoints_select
  ON public.guest_review_notification_endpoints
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_access_guest_review_property(property_id)
    END
  );

DROP POLICY IF EXISTS guest_review_notification_endpoints_manage ON public.guest_review_notification_endpoints;
CREATE POLICY guest_review_notification_endpoints_manage
  ON public.guest_review_notification_endpoints
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_manage_guest_review_property(property_id)
    END
  )
  WITH CHECK (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_manage_guest_review_property(property_id)
    END
  );

DROP POLICY IF EXISTS guest_review_notification_queue_select ON public.guest_review_notification_queue;
CREATE POLICY guest_review_notification_queue_select
  ON public.guest_review_notification_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guest_reviews gr
      WHERE gr.id = guest_review_notification_queue.review_id
        AND public.can_access_guest_review_property(gr.property_id)
    )
    OR public.is_guest_review_portfolio_admin()
  );

DROP POLICY IF EXISTS guest_review_report_recipients_select ON public.guest_review_report_recipients;
CREATE POLICY guest_review_report_recipients_select
  ON public.guest_review_report_recipients
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_access_guest_review_property(property_id)
    END
  );

DROP POLICY IF EXISTS guest_review_report_recipients_manage ON public.guest_review_report_recipients;
CREATE POLICY guest_review_report_recipients_manage
  ON public.guest_review_report_recipients
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_manage_guest_review_property(property_id)
    END
  )
  WITH CHECK (
    CASE
      WHEN property_id IS NULL THEN public.is_guest_review_portfolio_admin()
      ELSE public.can_manage_guest_review_property(property_id)
    END
  );

DROP POLICY IF EXISTS guest_review_daily_reports_select ON public.guest_review_daily_reports;
CREATE POLICY guest_review_daily_reports_select
  ON public.guest_review_daily_reports
  FOR SELECT
  TO authenticated
  USING (
    (property_id IS NULL AND public.is_guest_review_portfolio_admin())
    OR public.can_access_guest_review_property(property_id)
  );

DROP POLICY IF EXISTS guest_review_audit_events_select ON public.guest_review_audit_events;
CREATE POLICY guest_review_audit_events_select
  ON public.guest_review_audit_events
  FOR SELECT
  TO authenticated
  USING (
    (property_id IS NULL AND public.is_guest_review_portfolio_admin())
    OR public.can_access_guest_review_property(property_id)
  );

DROP POLICY IF EXISTS reports_exports_select_guest_reviews ON storage.objects;
CREATE POLICY reports_exports_select_guest_reviews
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports-exports'
    AND EXISTS (
      SELECT 1
      FROM public.guest_review_daily_reports grdr
      WHERE grdr.id = public.guest_review_report_id_from_storage_path(name)
        AND (
          (grdr.property_id IS NULL AND public.is_guest_review_portfolio_admin())
          OR public.can_access_guest_review_property(grdr.property_id)
        )
    )
  );

DROP TRIGGER IF EXISTS update_guest_review_property_settings_updated_at ON public.guest_review_property_settings;
CREATE TRIGGER update_guest_review_property_settings_updated_at
  BEFORE UPDATE ON public.guest_review_property_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_sources_updated_at ON public.guest_review_sources;
CREATE TRIGGER update_guest_review_sources_updated_at
  BEFORE UPDATE ON public.guest_review_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_reviews_updated_at ON public.guest_reviews;
CREATE TRIGGER update_guest_reviews_updated_at
  BEFORE UPDATE ON public.guest_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_review_owner_mappings_updated_at ON public.property_review_owner_mappings;
CREATE TRIGGER update_property_review_owner_mappings_updated_at
  BEFORE UPDATE ON public.property_review_owner_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_assignments_updated_at ON public.guest_review_assignments;
CREATE TRIGGER update_guest_review_assignments_updated_at
  BEFORE UPDATE ON public.guest_review_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_responses_updated_at ON public.guest_review_responses;
CREATE TRIGGER update_guest_review_responses_updated_at
  BEFORE UPDATE ON public.guest_review_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_notification_endpoints_updated_at ON public.guest_review_notification_endpoints;
CREATE TRIGGER update_guest_review_notification_endpoints_updated_at
  BEFORE UPDATE ON public.guest_review_notification_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_notification_queue_updated_at ON public.guest_review_notification_queue;
CREATE TRIGGER update_guest_review_notification_queue_updated_at
  BEFORE UPDATE ON public.guest_review_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_review_report_recipients_updated_at ON public.guest_review_report_recipients;
CREATE TRIGGER update_guest_review_report_recipients_updated_at
  BEFORE UPDATE ON public.guest_review_report_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.guest_review_property_settings (property_id)
SELECT p.id
FROM public.properties p
ON CONFLICT (property_id) DO NOTHING;

INSERT INTO public.property_review_owner_mappings (property_id, responsibility_code)
SELECT
  p.id,
  responsibility_code
FROM public.properties p
CROSS JOIN unnest(ARRAY[
  'general_manager'::public.guest_review_responsibility_code,
  'area_general_manager'::public.guest_review_responsibility_code,
  'corporate_reputation_owner'::public.guest_review_responsibility_code,
  'rooms_manager'::public.guest_review_responsibility_code,
  'housekeeping_manager'::public.guest_review_responsibility_code,
  'fnb_manager'::public.guest_review_responsibility_code,
  'maintenance_manager'::public.guest_review_responsibility_code,
  'it_manager'::public.guest_review_responsibility_code
]) AS responsibility_code
ON CONFLICT (property_id, responsibility_code) DO NOTHING;

INSERT INTO public.notification_email_templates (
  template_key,
  business_domain,
  notification_type,
  subject_template,
  html_template,
  text_template,
  from_name,
  from_email,
  is_active,
  metadata
)
VALUES
(
  'review_negative_alert',
  'operations',
  'system',
  'Guest Review Alert - {{property_name}} - {{platform}} - {{rating_display}}',
  '<h1>Guest Review Alert</h1><p><strong>{{property_name}}</strong> received a new guest review on <strong>{{platform}}</strong>.</p><p><strong>Rating:</strong> {{rating_display}}</p><p><strong>Assigned to:</strong> {{assignee_name}}</p><p><strong>Required action:</strong> Review the complaint, acknowledge ownership, and confirm the public response inside PHG Connect.</p><p><strong>Summary:</strong> {{summary_en}}</p><p><a href="{{action_url}}">Open review workspace</a></p>',
  'Guest Review Alert\n\nProperty: {{property_name}}\nPlatform: {{platform}}\nRating: {{rating_display}}\nAssigned to: {{assignee_name}}\nSummary: {{summary_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Operations',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_critical_vip_alert',
  'operations',
  'escalation_alert',
  'Critical Guest Review - Immediate Action Required - {{property_name}}',
  '<h1>Critical Guest Review</h1><p><strong>{{property_name}}</strong> has received a critical or VIP review that requires immediate action.</p><p><strong>Platform:</strong> {{platform}}</p><p><strong>Rating:</strong> {{rating_display}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Issues:</strong> {{issue_categories}}</p><p><strong>Manager brief:</strong> {{manager_brief_en}}</p><p><a href="{{action_url}}">Open critical review</a></p>',
  'Critical Guest Review\n\nProperty: {{property_name}}\nPlatform: {{platform}}\nRating: {{rating_display}}\nSeverity: {{severity}}\nIssues: {{issue_categories}}\nBrief: {{manager_brief_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Operations',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_escalation_alert',
  'management',
  'escalation_alert',
  'Guest Review Escalation - {{property_name}} - Level {{escalation_level}}',
  '<h1>Guest Review Escalation</h1><p>A guest review has breached its response SLA and was escalated.</p><p><strong>Property:</strong> {{property_name}}</p><p><strong>Escalation level:</strong> {{escalation_level}}</p><p><strong>Next owner:</strong> {{assignee_name}}</p><p><strong>Review summary:</strong> {{summary_en}}</p><p><a href="{{action_url}}">Open escalated review</a></p>',
  'Guest Review Escalation\n\nProperty: {{property_name}}\nEscalation level: {{escalation_level}}\nNext owner: {{assignee_name}}\nSummary: {{summary_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Management',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_daily_exec_digest',
  'management',
  'system',
  'Daily Guest Review Executive Digest - {{report_date}}',
  '<h1>Daily Guest Review Executive Digest</h1><p>Attached is the executive digest for {{report_date}}.</p><p><strong>Total reviews:</strong> {{total_reviews}}</p><p><strong>Average rating:</strong> {{average_rating}}</p><p><strong>Negative reviews:</strong> {{negative_reviews}}</p><p><strong>SLA compliance:</strong> {{sla_compliance}}</p><p><a href="{{action_url}}">Open executive dashboard</a></p>',
  'Daily Guest Review Executive Digest\n\nDate: {{report_date}}\nTotal reviews: {{total_reviews}}\nAverage rating: {{average_rating}}\nNegative reviews: {{negative_reviews}}\nSLA compliance: {{sla_compliance}}\n\nOpen: {{action_url}}',
  'PHG Connect Executive Reporting',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
)
ON CONFLICT (template_key) DO UPDATE
SET
  business_domain = EXCLUDED.business_domain,
  notification_type = EXCLUDED.notification_type,
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  from_name = EXCLUDED.from_name,
  from_email = EXCLUDED.from_email,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" is required for guest review cron automation.';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public._reset_edge_http_cron_job_guest_reviews(
  p_job_name text,
  p_schedule text,
  p_function_slug text,
  p_timeout_ms integer DEFAULT 45000,
  p_body jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
  v_url text;
  v_command text;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  v_url := format('https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/%s', p_function_slug);

  v_command := format(
$cmd$
select net.http_post(
  url:=%L,
  headers:=jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
  ),
  timeout_milliseconds:=%s%s
) as request_id;
$cmd$,
    v_url,
    p_timeout_ms,
    CASE
      WHEN p_body IS NULL THEN ''
      ELSE format(', body:=%L::jsonb', p_body::text)
    END
  );

  PERFORM cron.schedule(p_job_name, p_schedule, v_command);
END
$$;

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-collector-0005-ksa',
  '5 21 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-collector-0500-ksa',
  '0 2 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-collector-1000-ksa',
  '0 7 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-collector-1500-ksa',
  '0 12 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-collector-2000-ksa',
  '0 17 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-notifier-retry',
  '*/10 * * * *',
  'guest-review-notifier',
  45000,
  '{"batch_size":50}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-sla-monitor',
  '0 * * * *',
  'guest-review-sla-monitor',
  45000,
  '{"timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews(
  'guest-review-daily-report',
  '0 4 * * *',
  'guest-review-daily-report',
  60000,
  '{"timezone":"Asia/Riyadh"}'::jsonb
);

DROP FUNCTION public._reset_edge_http_cron_job_guest_reviews(text, text, text, integer, jsonb);

COMMIT;
NOTIFY pgrst, 'reload schema';
