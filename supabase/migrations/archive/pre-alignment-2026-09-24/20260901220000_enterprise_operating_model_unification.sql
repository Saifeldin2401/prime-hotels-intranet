-- ============================================================================
-- Migration: 20260901220000_enterprise_operating_model_unification.sql
-- Purpose:   Idempotent BASELINE RECONCILIATION for the Enterprise Operating
--            Model schema (tenant lifecycle + entitlements, Competency
--            Framework, Instructor-Led Training sessions, Supervisor Practical
--            Assessments, Employee Transfer Logs, and the organization archive
--            export RPC) which was applied to the live project
--            (dhbfaclkfysqwfppuxxa) OUT OF BAND and is unrecorded in
--            supabase_migrations.schema_migrations.
--
-- Guarantees:
--   * Running this against the CURRENT live DB is a complete no-op -- every
--     statement is CREATE ... IF NOT EXISTS / CREATE OR REPLACE /
--     ADD COLUMN IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE POLICY /
--     CREATE INDEX IF NOT EXISTS, and every enum is guarded.
--   * Replaying migration history on a fresh DB reproduces the live schema
--     for every object this migration touches.
--
-- The one deliberate change from the live snapshot: export_organization_archive
-- is (re)created WITH `SET search_path = public`, closing the mutable
-- search_path finding on that SECURITY DEFINER function.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tenant_lifecycle_status AS ENUM (
    'prospect', 'trial', 'onboarding', 'active', 'suspended', 'renewal', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_delivery_mode AS ENUM ('in_person', 'virtual', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_attendance_status AS ENUM (
    'registered', 'attended', 'excused', 'no_show', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Tenant lifecycle & entitlement columns on organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_status tenant_lifecycle_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_hotels INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_learners INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_ai_credits_monthly INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS ai_credits_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ---------------------------------------------------------------------------
-- 3. Competency Framework
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
    DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL DEFAULT 'hospitality_core',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.competency_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES public.competencies(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  title_ar TEXT,
  behavioral_indicators TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (competency_id, level_number)
);

CREATE TABLE IF NOT EXISTS public.course_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.competencies(id) ON DELETE CASCADE,
  target_level INTEGER NOT NULL DEFAULT 1 CHECK (target_level BETWEEN 1 AND 5),
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id, competency_id)
);

CREATE TABLE IF NOT EXISTS public.user_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.competencies(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
    DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 5),
  assessed_score NUMERIC DEFAULT 0,
  last_assessed_at TIMESTAMPTZ DEFAULT now(),
  assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  evidence_type TEXT DEFAULT 'assessment',
  evidence_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, competency_id)
);

-- ---------------------------------------------------------------------------
-- 4. Instructor-Led Training (ILT) sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
    DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  delivery_mode session_delivery_mode DEFAULT 'in_person',
  location_venue TEXT,
  virtual_meeting_url TEXT,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER DEFAULT 25,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_status session_attendance_status DEFAULT 'registered',
  score_percentage NUMERIC,
  feedback_comments TEXT,
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. Supervisor Practical Assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practical_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
    DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  passing_score_percentage NUMERIC DEFAULT 80.0,
  rubric_criteria JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.practical_assessments(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  score_achieved NUMERIC NOT NULL DEFAULT 0,
  is_passed BOOLEAN NOT NULL DEFAULT false,
  rubric_evaluations JSONB DEFAULT '{}',
  evaluator_feedback TEXT,
  learner_acknowledged_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Employee transfer audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  new_hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  previous_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  new_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  previous_role TEXT,
  new_role TEXT,
  transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transfer_effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retained_certificates_count INTEGER DEFAULT 0,
  assigned_delta_courses_count INTEGER DEFAULT 0,
  waived_obsolete_courses_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_competencies_org ON public.competencies (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_competencies_user ON public.user_competencies (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_org ON public.training_sessions (organization_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_hotel ON public.training_sessions (hotel_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_time ON public.training_sessions (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_practical_submissions_learner ON public.practical_submissions (learner_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfer_logs_user ON public.employee_transfer_logs (user_id);

-- ---------------------------------------------------------------------------
-- 8. Row Level Security -- tenant isolation via has_tenant_access()
-- ---------------------------------------------------------------------------
ALTER TABLE public.competencies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_levels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_competencies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_competencies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_attendees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_transfer_logs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competencies_tenant_isolation ON public.competencies;
CREATE POLICY competencies_tenant_isolation ON public.competencies
  FOR ALL USING (has_tenant_access(organization_id))
  WITH CHECK (has_tenant_access(organization_id));

DROP POLICY IF EXISTS competency_levels_tenant_isolation ON public.competency_levels;
CREATE POLICY competency_levels_tenant_isolation ON public.competency_levels
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.competencies c
    WHERE c.id = competency_levels.competency_id AND has_tenant_access(c.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competencies c
    WHERE c.id = competency_levels.competency_id AND has_tenant_access(c.organization_id)
  ));

DROP POLICY IF EXISTS course_competencies_tenant_isolation ON public.course_competencies;
CREATE POLICY course_competencies_tenant_isolation ON public.course_competencies
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_competencies.course_id AND has_tenant_access(c.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_competencies.course_id AND has_tenant_access(c.organization_id)
  ));

DROP POLICY IF EXISTS user_competencies_tenant_isolation ON public.user_competencies;
CREATE POLICY user_competencies_tenant_isolation ON public.user_competencies
  FOR ALL USING (has_tenant_access(organization_id) OR user_id = auth.uid())
  WITH CHECK (has_tenant_access(organization_id));

DROP POLICY IF EXISTS training_sessions_tenant_isolation ON public.training_sessions;
CREATE POLICY training_sessions_tenant_isolation ON public.training_sessions
  FOR ALL USING (has_tenant_access(organization_id))
  WITH CHECK (has_tenant_access(organization_id));

DROP POLICY IF EXISTS training_session_attendees_isolation ON public.training_session_attendees;
CREATE POLICY training_session_attendees_isolation ON public.training_session_attendees
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = training_session_attendees.session_id
      AND (has_tenant_access(ts.organization_id) OR training_session_attendees.user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = training_session_attendees.session_id AND has_tenant_access(ts.organization_id)
  ));

DROP POLICY IF EXISTS practical_assessments_tenant_isolation ON public.practical_assessments;
CREATE POLICY practical_assessments_tenant_isolation ON public.practical_assessments
  FOR ALL USING (has_tenant_access(organization_id))
  WITH CHECK (has_tenant_access(organization_id));

DROP POLICY IF EXISTS practical_submissions_isolation ON public.practical_submissions;
CREATE POLICY practical_submissions_isolation ON public.practical_submissions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.practical_assessments pa
    WHERE pa.id = practical_submissions.assessment_id
      AND (has_tenant_access(pa.organization_id) OR practical_submissions.learner_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practical_assessments pa
    WHERE pa.id = practical_submissions.assessment_id AND has_tenant_access(pa.organization_id)
  ));

DROP POLICY IF EXISTS employee_transfer_logs_isolation ON public.employee_transfer_logs;
CREATE POLICY employee_transfer_logs_isolation ON public.employee_transfer_logs
  FOR ALL USING (has_tenant_access(organization_id) OR user_id = auth.uid())
  WITH CHECK (has_tenant_access(organization_id));

-- ---------------------------------------------------------------------------
-- 9. Organization archive export RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_organization_archive(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT has_tenant_access(p_org_id) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to export this organization.';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'organization', (SELECT row_to_json(o) FROM organizations o WHERE o.id = p_org_id),
    'hotels', (SELECT jsonb_agg(row_to_json(h)) FROM hotels h WHERE h.organization_id = p_org_id AND h.is_deleted = false),
    'departments', (SELECT jsonb_agg(row_to_json(d)) FROM departments d WHERE d.organization_id = p_org_id AND d.is_active = true),
    'memberships', (SELECT jsonb_agg(row_to_json(om)) FROM organization_memberships om WHERE om.organization_id = p_org_id AND om.is_active = true),
    'courses', (SELECT jsonb_agg(row_to_json(c)) FROM courses c WHERE c.organization_id = p_org_id AND c.is_deleted = false),
    'assessments', (SELECT jsonb_agg(row_to_json(a)) FROM assessments a WHERE a.organization_id = p_org_id AND a.is_deleted = false),
    'certificates', (SELECT jsonb_agg(row_to_json(cert)) FROM certificates cert WHERE cert.organization_id = p_org_id),
    'documents', (SELECT jsonb_agg(row_to_json(doc)) FROM documents doc WHERE doc.organization_id = p_org_id AND doc.status = 'PUBLISHED')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.export_organization_archive(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.export_organization_archive(uuid) TO authenticated;

COMMIT;
