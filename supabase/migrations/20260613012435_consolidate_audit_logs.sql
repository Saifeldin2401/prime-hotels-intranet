-- ============================================================
-- Migration: consolidate_audit_logs → system_events
-- Consolidates 9 audit/activity log tables into one unified
-- system_events table with backward-compatible views.
--
-- Source tables & row counts at migration time:
--   audit_logs              65 rows  ← has data, DROP commented out
--   security_audit_logs      1 row   ← has data, DROP commented out
--   pii_access_logs          0 rows
--   activity_log             0 rows
--   sop_access_logs          0 rows
--   sop_view_history         0 rows
--   media_access_logs        0 rows
--   document_views           0 rows
--   document_download_logs   0 rows
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. CREATE system_events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text        NOT NULL,
  -- 'audit' | 'security' | 'pii_access' | 'activity'
  -- 'sop_access' | 'sop_view' | 'media_access'
  -- 'doc_view' | 'doc_download'
  actor_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type   text,
  entity_id     uuid,
  property_id   uuid,
  department_id uuid,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_system_events_type_created
  ON public.system_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_actor_created
  ON public.system_events (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_entity
  ON public.system_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_system_events_created
  ON public.system_events (created_at DESC);

-- ─────────────────────────────────────────────
-- 3. ENABLE RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- HR/admin/compliance can read all events
CREATE POLICY "system_events_admin_read"
  ON public.system_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'corporate_admin', 'regional_admin',
          'regional_hr', 'compliance_officer'
        )
    )
  );

-- Staff can read their own events
CREATE POLICY "system_events_own_read"
  ON public.system_events
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- Authenticated users can insert their own events
-- (service-role bypasses RLS; DB functions use SECURITY DEFINER)
CREATE POLICY "system_events_insert_own"
  ON public.system_events
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ─────────────────────────────────────────────
-- 4. MIGRATE DATA from old tables → system_events
-- ─────────────────────────────────────────────

-- 4a. audit_logs (65 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  ip_address, user_agent, metadata, created_at
)
SELECT
  id,
  'audit',
  user_id,
  entity_type,
  entity_id,
  CASE WHEN ip_address IS NOT NULL THEN ip_address::inet ELSE NULL END,
  user_agent,
  jsonb_build_object(
    'action',  action,
    'details', COALESCE(details, '{}'::jsonb)
  ),
  COALESCE(created_at, now())
FROM public.audit_logs
ON CONFLICT (id) DO NOTHING;

-- 4b. security_audit_logs (1 row)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  ip_address, user_agent, metadata, created_at
)
SELECT
  id,
  'security',
  user_id,
  table_name,
  record_id,
  ip_address,
  user_agent,
  jsonb_build_object(
    'security_event_type', event_type,
    'user_role',  user_role,
    'action',     action,
    'old_data',   COALESCE(old_data, '{}'::jsonb),
    'new_data',   COALESCE(new_data, '{}'::jsonb),
    'severity',   severity,
    'extra',      COALESCE(metadata, '{}'::jsonb)
  ),
  COALESCE(created_at, now())
FROM public.security_audit_logs
ON CONFLICT (id) DO NOTHING;

-- 4c. pii_access_logs (0 rows — included for completeness)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  metadata, created_at
)
SELECT
  id,
  'pii_access',
  actor_id,
  'user',
  target_user_id,
  jsonb_build_object(
    'fields_accessed', fields_accessed,
    'reason',          reason
  ),
  COALESCE(created_at, now())
FROM public.pii_access_logs
ON CONFLICT (id) DO NOTHING;

-- 4d. activity_log (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  property_id, department_id, metadata, created_at
)
SELECT
  id,
  'activity',
  user_id,
  target_type,
  target_id,
  property_id,
  department_id,
  jsonb_build_object(
    'action_type', action_type,
    'target_name', target_name,
    'extra',       COALESCE(metadata, '{}'::jsonb)
  ),
  COALESCE(created_at, now())
FROM public.activity_log
ON CONFLICT (id) DO NOTHING;

-- 4e. sop_access_logs (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  ip_address, user_agent, metadata, created_at
)
SELECT
  id,
  'sop_access',
  user_id,
  'sop',
  document_id,
  CASE WHEN ip_address IS NOT NULL THEN ip_address::inet ELSE NULL END,
  user_agent,
  jsonb_build_object(
    'action',     action,
    'version_id', version_id,
    'extra',      COALESCE(metadata, '{}'::jsonb)
  ),
  created_at
FROM public.sop_access_logs
ON CONFLICT (id) DO NOTHING;

-- 4f. sop_view_history (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  metadata, created_at
)
SELECT
  id,
  'sop_view',
  user_id,
  'sop',
  document_id,
  jsonb_build_object(
    'view_duration_seconds', view_duration_seconds,
    'scroll_depth_percent',  scroll_depth_percent
  ),
  viewed_at
FROM public.sop_view_history
ON CONFLICT (id) DO NOTHING;

-- 4g. media_access_logs (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  ip_address, user_agent, metadata, created_at
)
SELECT
  id,
  'media_access',
  accessed_by,
  'media',
  media_asset_id,
  ip_address,
  user_agent,
  jsonb_build_object(
    'access_type', access_type,
    'request_id',  request_id,
    'extra',       COALESCE(metadata, '{}'::jsonb)
  ),
  accessed_at
FROM public.media_access_logs
ON CONFLICT (id) DO NOTHING;

-- 4h. document_views (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  metadata, created_at
)
SELECT
  id,
  'doc_view',
  user_id,
  'document',
  document_id,
  '{}'::jsonb,
  viewed_at
FROM public.document_views
ON CONFLICT (id) DO NOTHING;

-- 4i. document_download_logs (0 rows)
INSERT INTO public.system_events (
  id, event_type, actor_id, entity_type, entity_id,
  ip_address, metadata, created_at
)
SELECT
  id,
  'doc_download',
  user_id,
  'document',
  document_id,
  ip_address,
  '{}'::jsonb,
  downloaded_at
FROM public.document_download_logs
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. BACKWARD-COMPATIBLE VIEWS
--    Using security_invoker = true (Postgres 15+) so RLS
--    from system_events is honoured by the view.
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW public.audit_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  (metadata->>'action')::text                           AS action,
  entity_type,
  entity_id,
  actor_id                                               AS user_id,
  ip_address::text                                       AS ip_address,
  user_agent,
  (metadata->'details')                                  AS details,
  created_at
FROM public.system_events
WHERE event_type = 'audit';

CREATE OR REPLACE VIEW public.security_audit_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  (metadata->>'security_event_type')::text              AS event_type,
  actor_id                                               AS user_id,
  (metadata->>'user_role')::text                         AS user_role,
  ip_address,
  user_agent,
  entity_type                                            AS table_name,
  entity_id                                              AS record_id,
  (metadata->>'action')::text                            AS action,
  (metadata->'old_data')                                 AS old_data,
  (metadata->'new_data')                                 AS new_data,
  (metadata->>'severity')::text                          AS severity,
  (metadata->'extra')                                    AS metadata,
  created_at
FROM public.system_events
WHERE event_type = 'security';

CREATE OR REPLACE VIEW public.pii_access_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  actor_id,
  entity_id                                              AS target_user_id,
  ARRAY(SELECT jsonb_array_elements_text(metadata->'fields_accessed'))
                                                         AS fields_accessed,
  (metadata->>'reason')::text                            AS reason,
  created_at
FROM public.system_events
WHERE event_type = 'pii_access';

CREATE OR REPLACE VIEW public.activity_log_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  actor_id                                               AS user_id,
  (metadata->>'action_type')::text                       AS action_type,
  entity_type                                            AS target_type,
  entity_id                                              AS target_id,
  (metadata->>'target_name')::text                       AS target_name,
  (metadata->'extra')                                    AS metadata,
  property_id,
  department_id,
  created_at
FROM public.system_events
WHERE event_type = 'activity';

CREATE OR REPLACE VIEW public.sop_access_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  entity_id                                              AS document_id,
  (metadata->>'version_id')::uuid                        AS version_id,
  actor_id                                               AS user_id,
  (metadata->>'action')::text                            AS action,
  ip_address::text                                       AS ip_address,
  user_agent,
  (metadata->'extra')                                    AS metadata,
  created_at
FROM public.system_events
WHERE event_type = 'sop_access';

CREATE OR REPLACE VIEW public.sop_view_history_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  actor_id                                               AS user_id,
  entity_id                                              AS document_id,
  (metadata->>'view_duration_seconds')::integer          AS view_duration_seconds,
  (metadata->>'scroll_depth_percent')::integer           AS scroll_depth_percent,
  created_at                                             AS viewed_at
FROM public.system_events
WHERE event_type = 'sop_view';

CREATE OR REPLACE VIEW public.media_access_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  entity_id                                              AS media_asset_id,
  actor_id                                               AS accessed_by,
  created_at                                             AS accessed_at,
  (metadata->>'access_type')::text                       AS access_type,
  ip_address,
  user_agent,
  (metadata->>'request_id')::text                        AS request_id,
  (metadata->'extra')                                    AS metadata
FROM public.system_events
WHERE event_type = 'media_access';

CREATE OR REPLACE VIEW public.document_views_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  entity_id                                              AS document_id,
  actor_id                                               AS user_id,
  created_at                                             AS viewed_at
FROM public.system_events
WHERE event_type = 'doc_view';

CREATE OR REPLACE VIEW public.document_download_logs_v
  WITH (security_invoker = true)
AS
SELECT
  id,
  entity_id                                              AS document_id,
  actor_id                                               AS user_id,
  created_at                                             AS downloaded_at,
  ip_address
FROM public.system_events
WHERE event_type = 'doc_download';

-- ─────────────────────────────────────────────
-- 6. UPDATE DB FUNCTIONS that INSERT into old tables
-- ─────────────────────────────────────────────

-- 6a. log_audit_event (callable version — inserts single row)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid,
  p_old_values   jsonb DEFAULT NULL,
  p_new_values   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id, metadata
  ) VALUES (
    'audit',
    auth.uid(),
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'action',  p_action,
      'details', jsonb_build_object('old', p_old_values, 'new', p_new_values)
    )
  );
END;
$$;

-- 6b. log_audit_event (trigger version — used on INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.log_audit_event_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  uuid  := auth.uid();
  v_action    text;
  v_changes   jsonb;
  v_record_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_action    := 'create';
    v_changes   := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action    := 'update';
    v_changes   := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    v_record_id := NEW.id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action    := 'delete';
    v_changes   := to_jsonb(OLD);
    v_record_id := OLD.id;
  END IF;

  IF v_record_id IS NOT NULL THEN
    INSERT INTO public.system_events (
      event_type, actor_id, entity_type, entity_id, metadata
    ) VALUES (
      'audit',
      v_actor_id,
      TG_TABLE_NAME,
      v_record_id,
      jsonb_build_object('action', v_action, 'details', v_changes)
    );
  END IF;

  RETURN NULL;
END;
$$;

-- 6c. log_security_audit_event_v2 (callable — now writes to system_events)
CREATE OR REPLACE FUNCTION public.log_security_audit_event_v2(
  p_action      text,
  p_entity_type text  DEFAULT NULL,
  p_entity_id   uuid  DEFAULT NULL,
  p_description text  DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL,
  p_ip_address  text  DEFAULT NULL,
  p_user_agent  text  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid  := auth.uid();
  v_role    text  := auth.role();
  v_allowed boolean := false;
BEGIN
  IF v_role = 'authenticated' THEN
    v_allowed := true;
  ELSIF v_role = 'anon' THEN
    IF p_action IN (
      'security.event', 'user.login_attempt', 'password.breach_detected',
      'session.binding_failed', 'password.breached_detected'
    ) THEN
      -- Rate limit anon callers
      BEGIN
        IF NOT check_rate_limit(
          'audit_log_anon:' || COALESCE(p_ip_address, 'unknown'), 15, 300
        ) THEN
          RAISE EXCEPTION 'Rate limit exceeded for unauthenticated audit logging';
        END IF;
      EXCEPTION WHEN undefined_function THEN
        NULL;
      END;
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Unauthorized: Event type % not allowed for role %', p_action, v_role;
  END IF;

  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id,
    ip_address, user_agent, metadata
  ) VALUES (
    'audit',
    v_user_id,
    p_entity_type,
    p_entity_id,
    CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::inet ELSE NULL END,
    p_user_agent,
    jsonb_build_object(
      'action',      p_action,
      'details',     jsonb_build_object(
        'description', p_description,
        'metadata',    COALESCE(p_metadata, '{}')
      )
    )
  );
END;
$$;

-- 6d. log_security_event (callable — was writing to security_audit_logs)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_table_name text  DEFAULT NULL,
  p_record_id  uuid  DEFAULT NULL,
  p_action     text  DEFAULT NULL,
  p_old_data   jsonb DEFAULT NULL,
  p_new_data   jsonb DEFAULT NULL,
  p_severity   text  DEFAULT 'info',
  p_metadata   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id,
    ip_address, user_agent, metadata
  ) VALUES (
    'security',
    auth.uid(),
    p_table_name,
    p_record_id,
    NULL,
    NULL,
    jsonb_build_object(
      'security_event_type', p_event_type,
      'user_role', (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
      'action',    p_action,
      'old_data',  COALESCE(p_old_data, '{}'),
      'new_data',  COALESCE(p_new_data, '{}'),
      'severity',  p_severity,
      'extra',     COALESCE(p_metadata, '{}')
    )
  );
END;
$$;

-- 6e. log_activity (was writing to activity_log)
CREATE OR REPLACE FUNCTION public.log_activity(
  action      text,
  target_type text  DEFAULT NULL,
  target_id   uuid  DEFAULT NULL,
  target_name text  DEFAULT NULL,
  meta        jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id        uuid;
  user_property uuid;
  user_dept     uuid;
BEGIN
  SELECT property_id INTO user_property
  FROM public.user_properties
  WHERE user_id = auth.uid()
  LIMIT 1;

  SELECT department_id INTO user_dept
  FROM public.user_departments
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id,
    property_id, department_id, metadata
  ) VALUES (
    'activity',
    auth.uid(),
    target_type,
    target_id,
    user_property,
    user_dept,
    jsonb_build_object(
      'action_type', action,
      'target_name', target_name,
      'extra',       COALESCE(meta, '{}')
    )
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 6f. log_sop_access (trigger — was writing to sop_access_logs)
CREATE OR REPLACE FUNCTION public.log_sop_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id,
    ip_address, user_agent, metadata
  ) VALUES (
    'sop_access',
    auth.uid(),
    'sop',
    NEW.id,
    (current_setting('request.headers', true)::json->>'x-forwarded-for')::inet,
    current_setting('request.headers', true)::json->>'user-agent',
    jsonb_build_object(
      'action',     'view',
      'version_id', NEW.current_version_id,
      'extra',      '{}'::jsonb
    )
  );
  RETURN NEW;
END;
$$;

-- 6g. log_document_view (callable — was writing to document_views)
CREATE OR REPLACE FUNCTION public.log_document_view(
  p_document_id uuid,
  p_user_id     uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view_id uuid;
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id, metadata
  ) VALUES (
    'doc_view',
    p_user_id,
    'document',
    p_document_id,
    '{}'::jsonb
  )
  RETURNING id INTO v_view_id;

  RETURN v_view_id;
END;
$$;

-- 6h. log_document_download (callable — was writing to document_download_logs)
CREATE OR REPLACE FUNCTION public.log_document_download(
  p_document_id uuid,
  p_user_id     uuid,
  p_ip_address  inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id, ip_address, metadata
  ) VALUES (
    'doc_download',
    p_user_id,
    'document',
    p_document_id,
    p_ip_address,
    '{}'::jsonb
  )
  RETURNING id INTO v_log_id;

  PERFORM public.increment_document_download_count(p_document_id);

  RETURN v_log_id;
END;
$$;

-- 6i. log_pii_access (callable — was writing to pii_access_logs)
--   Note: the DB function signature uses different column names than the
--   actual pii_access_logs table. Preserved as-is for compatibility.
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_target_user_id  uuid,
  p_fields_accessed text[],
  p_reason          text  DEFAULT NULL,
  p_resource_type   text  DEFAULT 'profile',
  p_resource_id     uuid  DEFAULT NULL,
  p_access_type     text  DEFAULT 'read'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id, metadata
  ) VALUES (
    'pii_access',
    auth.uid(),
    'user',
    p_target_user_id,
    jsonb_build_object(
      'fields_accessed', to_jsonb(p_fields_accessed),
      'reason',          p_reason,
      'resource_type',   p_resource_type,
      'resource_id',     p_resource_id,
      'access_type',     p_access_type
    )
  );
END;
$$;

-- 6j. get_secure_media_url — update the access log INSERT inside the function
CREATE OR REPLACE FUNCTION public.get_secure_media_url(
  p_media_asset_id uuid,
  p_expiry_seconds integer DEFAULT 3600
)
RETURNS TABLE (signed_url text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_asset      RECORD;
  v_signed_url TEXT;
BEGIN
  SELECT
    ma.id, ma.storage_bucket, ma.storage_path,
    ma.uploaded_by, ma.property_id, ma.is_public, ma.mime_type
  INTO v_asset
  FROM public.media_assets ma
  WHERE ma.id = p_media_asset_id
    AND ma.is_archived = false;

  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Media asset not found or archived';
  END IF;

  IF NOT (
    v_asset.is_public
    OR v_asset.uploaded_by = auth.uid()
    OR v_asset.property_id IS NULL
    OR public.has_property_access(auth.uid(), v_asset.property_id)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this media asset';
  END IF;

  SELECT storage.create_signed_url(
    v_asset.storage_bucket,
    v_asset.storage_path,
    p_expiry_seconds
  ) INTO v_signed_url;

  IF v_signed_url IS NULL OR length(trim(v_signed_url)) = 0 THEN
    RAISE EXCEPTION 'Failed to generate secure URL';
  END IF;

  INSERT INTO public.system_events (
    event_type, actor_id, entity_type, entity_id, metadata
  ) VALUES (
    'media_access',
    auth.uid(),
    'media',
    p_media_asset_id,
    jsonb_build_object(
      'access_type',     'download',
      'expiry_seconds',  p_expiry_seconds,
      'mime_type',       v_asset.mime_type,
      'extra',           '{}'::jsonb
    )
  );

  RETURN QUERY SELECT v_signed_url, now() + (p_expiry_seconds || ' seconds')::interval;
END;
$$;

-- 6k. cleanup_old_audit_logs — target system_events instead
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.system_events
  WHERE event_type = 'audit'
    AND created_at < now() - INTERVAL '3 years';
END;
$$;

-- 6l. cleanup_old_pii_access_logs — target system_events instead
CREATE OR REPLACE FUNCTION public.cleanup_old_pii_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.system_events
  WHERE event_type = 'pii_access'
    AND created_at < now() - INTERVAL '7 years';
END;
$$;

-- 6m. get_document_viewers_by_department — rewritten to query system_events
CREATE OR REPLACE FUNCTION public.get_document_viewers_by_department(
  p_document_id uuid
)
RETURNS TABLE (department_name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(d.name, 'Unknown') AS department_name,
    COUNT(DISTINCT se.actor_id) AS count
  FROM public.system_events se
  LEFT JOIN public.user_departments ud ON ud.user_id = se.actor_id
  LEFT JOIN public.departments d ON d.id = ud.department_id
  WHERE se.event_type = 'doc_view'
    AND se.entity_id = p_document_id
  GROUP BY d.name
  ORDER BY count DESC
  LIMIT 20;
$$;

-- ─────────────────────────────────────────────
-- 7. DROP EMPTY TABLES (0 rows)
--    Tables with data are commented out — do not drop.
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.pii_access_logs        CASCADE;
DROP TABLE IF EXISTS public.activity_log           CASCADE;
DROP TABLE IF EXISTS public.sop_access_logs        CASCADE;
DROP TABLE IF EXISTS public.sop_view_history       CASCADE;
DROP TABLE IF EXISTS public.media_access_logs      CASCADE;
DROP TABLE IF EXISTS public.document_views         CASCADE;
DROP TABLE IF EXISTS public.document_download_logs CASCADE;

-- audit_logs          (65 rows) — DO NOT DROP, data preserved in system_events
-- DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- security_audit_logs  (1 row) — DO NOT DROP, data preserved in system_events
-- DROP TABLE IF EXISTS public.security_audit_logs CASCADE;
