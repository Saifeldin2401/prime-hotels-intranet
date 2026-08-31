-- ============================================================================
-- Migration: Enterprise Operating Model Unification
-- Description: Adds tenant lifecycle & entitlement fields, Competency Framework,
--              ILT Sessions, Practical Supervisor Checklists, Transfer Logs, and
--              Organization Archive Export RPC.
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE tenant_lifecycle_status AS ENUM (
      'prospect', 'trial', 'onboarding', 'active', 'suspended', 'renewal', 'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS lifecycle_status tenant_lifecycle_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_hotels INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_learners INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_ai_credits_monthly INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS ai_credits_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE TABLE IF NOT EXISTS competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL DEFAULT 'hospitality_core',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS competency_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  title_ar TEXT,
  behavioral_indicators TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competency_id, level_number)
);

CREATE TABLE IF NOT EXISTS course_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  target_level INTEGER NOT NULL DEFAULT 1 CHECK (target_level BETWEEN 1 AND 5),
  weight NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, competency_id)
);

CREATE TABLE IF NOT EXISTS user_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 5),
  assessed_score NUMERIC(5,2) DEFAULT 0,
  last_assessed_at TIMESTAMPTZ DEFAULT now(),
  assessed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evidence_type TEXT DEFAULT 'assessment',
  evidence_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, competency_id)
);

DO $$ BEGIN
    CREATE TYPE session_delivery_mode AS ENUM ('in_person', 'virtual', 'hybrid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_attendance_status AS ENUM ('registered', 'attended', 'excused', 'no_show', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  delivery_mode session_delivery_mode DEFAULT 'in_person',
  location_venue TEXT,
  virtual_meeting_url TEXT,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER DEFAULT 25,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status session_attendance_status DEFAULT 'registered',
  score_percentage NUMERIC(5,2),
  feedback_comments TEXT,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS practical_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  passing_score_percentage NUMERIC(5,2) DEFAULT 80.0,
  rubric_criteria JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES practical_assessments(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  score_achieved NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_passed BOOLEAN NOT NULL DEFAULT false,
  rubric_evaluations JSONB DEFAULT '{}',
  evaluator_feedback TEXT,
  learner_acknowledged_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id REFERENCES profiles(id) ON DELETE CASCADE,
  previous_hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  new_hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  previous_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  new_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  previous_role TEXT,
  new_role TEXT,
  transferred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  transfer_effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retained_certificates_count INTEGER DEFAULT 0,
  assigned_delta_courses_count INTEGER DEFAULT 0,
  waived_obsolete_courses_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
