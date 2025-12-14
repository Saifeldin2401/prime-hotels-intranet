-- Interactive Learning System Schema
-- Migration: Create tables for quizzes, assignments, and progress tracking
-- Corrected RLS to use user_roles, user_departments, user_properties

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE learning_target_type AS ENUM (
        'user',
        'department',
        'role',
        'property',
        'everyone'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE learning_content_type AS ENUM (
        'quiz',
        'sop',
        'video',
        'external_link'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE learning_assignment_status AS ENUM (
        'assigned',
        'in_progress',
        'completed',
        'overdue',
        'excused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Quizzes (Groupings of questions)
CREATE TABLE IF NOT EXISTS learning_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Organization
    category_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
    
    -- Settings
    time_limit_minutes INTEGER, -- NULL for unlimited
    passing_score_percentage INTEGER DEFAULT 70,
    max_attempts INTEGER, -- NULL for unlimited
    randomize_questions BOOLEAN DEFAULT FALSE,
    show_feedback_during BOOLEAN DEFAULT TRUE,
    
    -- Status
    status question_status NOT NULL DEFAULT 'draft',
    
    -- Audit
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quiz Questions (Many-to-Many link)
CREATE TABLE IF NOT EXISTS learning_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES learning_quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    
    display_order INTEGER DEFAULT 0,
    points_override INTEGER, -- Optional override of question's default points
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON learning_quiz_questions(quiz_id);

-- 3. Assignments (Targeting)
CREATE TABLE IF NOT EXISTS learning_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target (Who)
    target_type learning_target_type NOT NULL,
    target_id TEXT, -- UUID for user/dept, string for role ('front_desk')
    
    -- Content (What)
    content_type learning_content_type NOT NULL,
    content_id UUID NOT NULL, -- ID of the quiz, SOP, etc.
    
    -- Rules (When)
    due_date TIMESTAMPTZ,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Meta
    priority TEXT DEFAULT 'normal', -- 'normal', 'high', 'compliance'
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_target ON learning_assignments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_assignments_content ON learning_assignments(content_type, content_id);

-- 4. Progress Tracking (User state)
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link
    assignment_id UUID REFERENCES learning_assignments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Content ref (redundant but useful for direct lookups without assignment)
    content_type learning_content_type NOT NULL,
    content_id UUID NOT NULL,
    
    -- State
    status learning_assignment_status NOT NULL DEFAULT 'assigned',
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    score_percentage DECIMAL(5,2),
    passed BOOLEAN,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Attempt ref
    last_session_id UUID REFERENCES knowledge_quiz_sessions(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, content_type, content_id) -- One active progress record per content per user
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON learning_progress(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE learning_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- Quizzes: Published viewable by all, drafts by creators/HR
DROP POLICY IF EXISTS "Published quizzes viewable by all" ON learning_quizzes;
CREATE POLICY "Published quizzes viewable by all" ON learning_quizzes
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Draft quizzes viewable by creators and HR" ON learning_quizzes;
CREATE POLICY "Draft quizzes viewable by creators and HR" ON learning_quizzes
    FOR ALL USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('regional_admin', 'regional_hr', 'property_hr', 'department_manager')
        )
    );

-- Quiz Questions: Follow quiz visibility
DROP POLICY IF EXISTS "Quiz questions viewable if quiz is viewable" ON learning_quiz_questions;
CREATE POLICY "Quiz questions viewable if quiz is viewable" ON learning_quiz_questions
    FOR SELECT USING (
        quiz_id IN (SELECT id FROM learning_quizzes)
    );
    
DROP POLICY IF EXISTS "HR can manage quiz questions" ON learning_quiz_questions;
CREATE POLICY "HR can manage quiz questions" ON learning_quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('regional_admin', 'regional_hr', 'property_hr', 'department_manager')
        )
    );

-- Assignments: Viewable by target users and HR
DROP POLICY IF EXISTS "Users see assignments targeting them" ON learning_assignments;
CREATE POLICY "Users see assignments targeting them" ON learning_assignments
    FOR SELECT USING (
        (target_type = 'user' AND target_id = auth.uid()::text) OR
        (target_type = 'department' AND target_id IN (
            SELECT department_id::text FROM user_departments WHERE user_id = auth.uid()
        )) OR
        (target_type = 'role' AND target_id IN (
            SELECT role::text FROM user_roles WHERE user_id = auth.uid()
        )) OR
        (target_type = 'property' AND target_id IN (
            SELECT property_id::text FROM user_properties WHERE user_id = auth.uid()
        )) OR
        (target_type = 'everyone')
    );

DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;
CREATE POLICY "HR can manage assignments" ON learning_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('regional_admin', 'regional_hr', 'property_hr', 'department_manager')
        )
    );

-- Progress: Users manage their own progress, HR views all
DROP POLICY IF EXISTS "Users manage own progress" ON learning_progress;
CREATE POLICY "Users manage own progress" ON learning_progress
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "HR can view all progress" ON learning_progress;
CREATE POLICY "HR can view all progress" ON learning_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('regional_admin', 'regional_hr', 'property_hr', 'department_manager')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on progress
DROP TRIGGER IF EXISTS update_learning_progress_modtime ON learning_progress;
CREATE TRIGGER update_learning_progress_modtime
    BEFORE UPDATE ON learning_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
