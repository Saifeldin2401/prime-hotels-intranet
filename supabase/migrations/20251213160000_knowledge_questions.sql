-- Interactive Knowledge Questions System
-- Migration: Create tables for structured, reusable questions with tracking

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Question types
CREATE TYPE question_type AS ENUM (
    'mcq',           -- Multiple choice (single answer)
    'mcq_multi',     -- Multiple choice (multiple answers)
    'true_false',    -- True/False toggle
    'fill_blank',    -- Fill in the blank
    'scenario'       -- Multi-step scenario
);

-- Difficulty levels
CREATE TYPE question_difficulty AS ENUM (
    'easy',
    'medium',
    'hard',
    'expert'
);

-- Question status
CREATE TYPE question_status AS ENUM (
    'draft',
    'pending_review',
    'published',
    'archived'
);

-- Usage context types
CREATE TYPE question_usage_type AS ENUM (
    'sop_inline',      -- Embedded in SOP viewer
    'lesson',          -- Part of a microlearning lesson
    'quiz',            -- Standalone quiz
    'certification',   -- Certification exam
    'assessment',      -- Pre/post assessment
    'daily_challenge'  -- Dashboard daily quiz
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Main questions table
CREATE TABLE IF NOT EXISTS knowledge_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    question_text TEXT NOT NULL,
    question_text_ar TEXT,
    question_type question_type NOT NULL DEFAULT 'mcq',
    difficulty_level question_difficulty NOT NULL DEFAULT 'medium',
    
    -- Answers & Feedback
    correct_answer TEXT, -- For fill_blank and true_false (stores 'true'/'false')
    explanation TEXT,
    explanation_ar TEXT,
    hint TEXT,
    hint_ar TEXT,
    
    -- Linking to SOPs
    linked_sop_id UUID REFERENCES sop_documents(id) ON DELETE SET NULL,
    linked_sop_section TEXT, -- Section identifier within the SOP
    category_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    estimated_time_seconds INTEGER DEFAULT 30,
    points INTEGER DEFAULT 1,
    
    -- AI Generation Metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_model_used TEXT,
    ai_confidence_score DECIMAL(3,2),
    ai_prompt_used TEXT,
    
    -- Workflow Status
    status question_status NOT NULL DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    
    -- Review Tracking
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Standard Audit Fields
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_points CHECK (points > 0),
    CONSTRAINT valid_time CHECK (estimated_time_seconds > 0)
);

-- Comment on table
COMMENT ON TABLE knowledge_questions IS 'Reusable, trackable questions linked to SOPs and training';

-- ============================================================================
-- MCQ OPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    
    -- Content
    option_text TEXT NOT NULL,
    option_text_ar TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    
    -- Per-option feedback (for rich feedback)
    feedback TEXT,
    feedback_ar TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient option lookup
CREATE INDEX idx_question_options_question ON knowledge_question_options(question_id);

COMMENT ON TABLE knowledge_question_options IS 'Answer options for MCQ questions';

-- ============================================================================
-- QUESTION USAGES (Many-to-Many Linking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_question_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    
    -- Where the question is used
    usage_type question_usage_type NOT NULL,
    usage_entity_id UUID NOT NULL, -- The SOP, lesson, quiz, etc.
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    weight DECIMAL(3,2) DEFAULT 1.0, -- For weighted scoring
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    UNIQUE(question_id, usage_type, usage_entity_id)
);

-- Indexes
CREATE INDEX idx_question_usages_question ON knowledge_question_usages(question_id);
CREATE INDEX idx_question_usages_entity ON knowledge_question_usages(usage_type, usage_entity_id);

COMMENT ON TABLE knowledge_question_usages IS 'Links questions to SOPs, lessons, quizzes, etc.';

-- ============================================================================
-- USER ATTEMPTS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    
    -- Session grouping (for quizzes)
    session_id UUID,
    
    -- Answer data
    selected_answer TEXT, -- Option ID for MCQ, 'true'/'false' for T/F, text for fill_blank
    selected_options UUID[], -- For multi-select MCQs
    is_correct BOOLEAN,
    partial_score DECIMAL(3,2), -- For partial credit (0.0 to 1.0)
    
    -- Context
    context_type question_usage_type,
    context_entity_id UUID,
    
    -- Performance metrics
    time_spent_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    hint_used BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_attempts_user ON knowledge_question_attempts(user_id);
CREATE INDEX idx_attempts_question ON knowledge_question_attempts(question_id);
CREATE INDEX idx_attempts_session ON knowledge_question_attempts(session_id);
CREATE INDEX idx_attempts_created ON knowledge_question_attempts(created_at);
CREATE INDEX idx_attempts_context ON knowledge_question_attempts(context_type, context_entity_id);

COMMENT ON TABLE knowledge_question_attempts IS 'Tracks user answers for analytics and progress';

-- ============================================================================
-- VERSION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_question_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    
    -- Version data
    version_number INTEGER NOT NULL,
    data_snapshot JSONB NOT NULL, -- Full question + options at this version
    
    -- Change tracking
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_reason TEXT,
    
    -- Ensure unique versions per question
    UNIQUE(question_id, version_number)
);

CREATE INDEX idx_versions_question ON knowledge_question_versions(question_id);

COMMENT ON TABLE knowledge_question_versions IS 'Audit trail of question changes for compliance';

-- ============================================================================
-- QUIZ SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- What quiz
    quiz_type question_usage_type NOT NULL,
    quiz_entity_id UUID, -- The quiz/lesson/certification ID
    
    -- Session data
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Results
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2),
    passed BOOLEAN,
    
    -- Settings used
    time_limit_seconds INTEGER,
    passing_score DECIMAL(5,2)
);

CREATE INDEX idx_sessions_user ON knowledge_quiz_sessions(user_id);
CREATE INDEX idx_sessions_quiz ON knowledge_quiz_sessions(quiz_type, quiz_entity_id);

COMMENT ON TABLE knowledge_quiz_sessions IS 'Tracks quiz/exam sessions for scoring';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_question_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_updated
    BEFORE UPDATE ON knowledge_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_question_timestamp();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_question_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if content changed (not just status)
    IF OLD.question_text IS DISTINCT FROM NEW.question_text 
       OR OLD.correct_answer IS DISTINCT FROM NEW.correct_answer
       OR OLD.explanation IS DISTINCT FROM NEW.explanation THEN
        NEW.version = OLD.version + 1;
        
        -- Store version snapshot
        INSERT INTO knowledge_question_versions (question_id, version_number, data_snapshot, changed_by, change_reason)
        VALUES (
            OLD.id,
            OLD.version,
            jsonb_build_object(
                'question_text', OLD.question_text,
                'question_type', OLD.question_type,
                'correct_answer', OLD.correct_answer,
                'explanation', OLD.explanation,
                'difficulty_level', OLD.difficulty_level
            ),
            NEW.reviewed_by,
            'Content updated'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_version_increment
    BEFORE UPDATE ON knowledge_questions
    FOR EACH ROW
    EXECUTE FUNCTION increment_question_version();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_question_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Questions: Published visible to all, drafts only to creators/reviewers
CREATE POLICY "Published questions visible to all" ON knowledge_questions
    FOR SELECT USING (status = 'published');

CREATE POLICY "Draft questions visible to creators" ON knowledge_questions
    FOR SELECT USING (created_by = auth.uid() OR reviewed_by = auth.uid());

CREATE POLICY "Authenticated users can create questions" ON knowledge_questions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update own questions" ON knowledge_questions
    FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('regional_admin', 'regional_hr', 'property_hr')
    ));

-- Options: Follow parent question visibility
CREATE POLICY "Options follow question visibility" ON knowledge_question_options
    FOR SELECT USING (
        question_id IN (SELECT id FROM knowledge_questions WHERE status = 'published')
        OR question_id IN (SELECT id FROM knowledge_questions WHERE created_by = auth.uid())
    );

CREATE POLICY "Full access to question options" ON knowledge_question_options
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Usages: Visible if question is visible
CREATE POLICY "Usages follow question visibility" ON knowledge_question_usages
    FOR SELECT USING (
        question_id IN (SELECT id FROM knowledge_questions WHERE status = 'published')
    );

CREATE POLICY "HR can manage usages" ON knowledge_question_usages
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('regional_admin', 'regional_hr', 'property_hr', 'property_manager')
    ));

-- Attempts: Users see own attempts
CREATE POLICY "Users see own attempts" ON knowledge_question_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create attempts" ON knowledge_question_attempts
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Versions: Readable by HR/admins
CREATE POLICY "HR can view versions" ON knowledge_question_versions
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('regional_admin', 'regional_hr', 'property_hr')
    ));

-- Sessions: Users see own sessions
CREATE POLICY "Users see own sessions" ON knowledge_quiz_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create sessions" ON knowledge_quiz_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON knowledge_quiz_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- SAMPLE DATA FUNCTION (for testing)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sample_questions(sop_id UUID, created_by_id UUID)
RETURNS void AS $$
DECLARE
    q1_id UUID;
    q2_id UUID;
    q3_id UUID;
BEGIN
    -- Sample MCQ
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        explanation, hint, linked_sop_id, status, created_by
    ) VALUES (
        'What is the first step when entering a guest room for cleaning?',
        'mcq', 'easy',
        'Always knock and announce before entering to respect guest privacy.',
        'Think about guest privacy...',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q1_id;
    
    INSERT INTO knowledge_question_options (question_id, option_text, is_correct, display_order, feedback) VALUES
        (q1_id, 'Start vacuuming immediately', false, 1, 'Incorrect. You must announce yourself first.'),
        (q1_id, 'Knock and announce "Housekeeping"', true, 2, 'Correct! Always announce before entering.'),
        (q1_id, 'Check the minibar', false, 3, 'Incorrect. Minibar check comes later in the process.'),
        (q1_id, 'Open all windows', false, 4, 'Incorrect. Entry protocol comes first.');
    
    -- Sample True/False
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        correct_answer, explanation, linked_sop_id, status, created_by
    ) VALUES (
        'Guests can request late checkout directly at the front desk.',
        'true_false', 'easy',
        'true',
        'Yes, late checkout requests are handled at the front desk based on availability.',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q2_id;
    
    -- Sample Fill in Blank
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        correct_answer, explanation, hint, linked_sop_id, status, created_by
    ) VALUES (
        'The standard checkout time is _____ AM.',
        'fill_blank', 'easy',
        '11',
        'Standard checkout is 11 AM unless late checkout is arranged.',
        'Think about late morning...',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q3_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_sample_questions IS 'Creates sample questions for testing - call with SOP ID and user ID';
