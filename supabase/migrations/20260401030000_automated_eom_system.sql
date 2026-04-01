-- Migration: Automated Employee of the Month System
-- Created: April 2026
-- Description: Adds tables and functions for automated EOM selection based on performance metrics

-- ============================================
-- 1. EOM AUTOMATION CONFIGURATION TABLE
-- ============================================
-- Per-property settings for automated EOM selection
CREATE TABLE IF NOT EXISTS eom_automation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Automation toggle
    is_enabled BOOLEAN DEFAULT false,
    
    -- Weight configuration (must sum to 100)
    task_completion_weight INTEGER DEFAULT 40 CHECK (task_completion_weight >= 0 AND task_completion_weight <= 100),
    training_completion_weight INTEGER DEFAULT 30 CHECK (training_completion_weight >= 0 AND training_completion_weight <= 100),
    sop_compliance_weight INTEGER DEFAULT 20 CHECK (sop_compliance_weight >= 0 AND sop_compliance_weight <= 100),
    attendance_weight INTEGER DEFAULT 10 CHECK (attendance_weight >= 0 AND attendance_weight <= 100),
    
    -- Threshold settings
    min_attendance_rate INTEGER DEFAULT 80 CHECK (min_attendance_rate >= 0 AND min_attendance_rate <= 100),
    min_task_completion_rate INTEGER DEFAULT 70 CHECK (min_task_completion_rate >= 0 AND min_task_completion_rate <= 100),
    
    -- Auto-announcement settings
    auto_announce BOOLEAN DEFAULT false, -- If false, requires HR approval
    announcement_day INTEGER DEFAULT 1 CHECK (announcement_day >= 1 AND announcement_day <= 28), -- Day of month to announce
    
    -- Eligibility rules
    exclude_recent_winners BOOLEAN DEFAULT true,
    exclusion_months INTEGER DEFAULT 3, -- Can't win if won in last N months
    min_employment_days INTEGER DEFAULT 30, -- Must be employed for at least N days
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id),
    
    UNIQUE(property_id)
);

-- Enable RLS
ALTER TABLE eom_automation_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY eom_automation_config_view ON eom_automation_config
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY eom_automation_config_manage ON eom_automation_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN profiles p ON p.id = auth.uid()
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- ============================================
-- 2. EOM SCORING HISTORY TABLE
-- ============================================
-- Stores monthly score calculations for all eligible employees
CREATE TABLE IF NOT EXISTS eom_scoring_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    
    -- Raw metric scores (0-100)
    task_completion_rate INTEGER,
    training_completion_rate INTEGER,
    sop_compliance_rate INTEGER,
    attendance_rate INTEGER,
    
    -- Weighted scores
    task_completion_score DECIMAL(5,2),
    training_completion_score DECIMAL(5,2),
    sop_compliance_score DECIMAL(5,2),
    attendance_score DECIMAL(5,2),
    
    -- Final calculated score
    total_score DECIMAL(5,2) NOT NULL,
    
    -- Ranking
    rank INTEGER NOT NULL,
    
    -- Eligibility flag
    is_eligible BOOLEAN DEFAULT true,
    ineligibility_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(property_id, user_id, month, year)
);

-- Enable RLS
ALTER TABLE eom_scoring_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY eom_scoring_history_view ON eom_scoring_history
    FOR SELECT TO authenticated
    USING (
        -- Users can see their own scores
        user_id = auth.uid()
        OR
        -- HR/Admin can see all scores for their properties
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- ============================================
-- 3. EOM AUTO-SELECTION LOG
-- ============================================
-- Tracks automated selections pending approval or already announced
CREATE TABLE IF NOT EXISTS eom_auto_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    
    -- Selection details
    total_score DECIMAL(5,2) NOT NULL,
    selection_reason_en TEXT NOT NULL,
    selection_reason_ar TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'announced')),
    
    -- Approval tracking
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Link to actual employee_of_the_month record once announced
    announced_eom_id UUID REFERENCES employee_of_the_month(id),
    announced_at TIMESTAMPTZ,
    
    -- Scoring details reference
    scoring_history_id UUID REFERENCES eom_scoring_history(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(property_id, month, year)
);

-- Enable RLS
ALTER TABLE eom_auto_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY eom_auto_selections_view ON eom_auto_selections
    FOR SELECT TO authenticated
    USING (
        -- Selected user can see their selection
        user_id = auth.uid()
        OR
        -- HR/Admin can see all for their properties
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

CREATE POLICY eom_auto_selections_manage ON eom_auto_selections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- ============================================
-- 4. FUNCTION: Calculate Employee EOM Score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_eom_score(
    p_user_id UUID,
    p_property_id UUID,
    p_month INTEGER,
    p_year INTEGER,
    p_config eom_automation_config
) RETURNS TABLE (
    task_completion_rate INTEGER,
    training_completion_rate INTEGER,
    sop_compliance_rate INTEGER,
    attendance_rate INTEGER,
    total_score DECIMAL,
    is_eligible BOOLEAN,
    ineligibility_reason TEXT
) AS $$
DECLARE
    v_task_total INTEGER;
    v_task_completed INTEGER;
    v_training_total INTEGER;
    v_training_completed INTEGER;
    v_sop_total INTEGER;
    v_sop_acknowledged INTEGER;
    v_user_count INTEGER;
    v_attendance_total INTEGER;
    v_attendance_present INTEGER;
    v_employed_since TIMESTAMPTZ;
    v_recent_wins INTEGER;
BEGIN
    -- Calculate Task Completion Rate (for the month)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed', 'done'))
    INTO v_task_total, v_task_completed
    FROM tasks
    WHERE assigned_to_id = p_user_id
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND is_deleted = false;
    
    task_completion_rate := CASE 
        WHEN v_task_total > 0 THEN (v_task_completed * 100 / v_task_total)
        ELSE 0
    END;
    
    -- Calculate Training Completion Rate
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_training_total, v_training_completed
    FROM learning_assignments
    WHERE target_type = 'user'
    AND target_id = p_user_id
    AND (is_deleted IS NULL OR is_deleted = false);
    
    training_completion_rate := CASE 
        WHEN v_training_total > 0 THEN (v_training_completed * 100 / v_training_total)
        ELSE 0
    END;
    
    -- Calculate SOP Compliance Rate
    SELECT COUNT(DISTINCT d.id), COUNT(DISTINCT da.document_id)
    INTO v_sop_total, v_sop_acknowledged
    FROM documents d
    JOIN user_departments ud ON ud.department_id = d.department_id
    LEFT JOIN document_acknowledgments da ON da.document_id = d.id AND da.user_id = p_user_id
    WHERE ud.user_id = p_user_id
    AND d.status = 'PUBLISHED';
    
    sop_compliance_rate := CASE 
        WHEN v_sop_total > 0 THEN (v_sop_acknowledged * 100 / v_sop_total)
        ELSE 0
    END;
    
    -- Calculate Attendance Rate
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('present', 'checked_in', 'completed'))
    INTO v_attendance_total, v_attendance_present
    FROM attendance
    WHERE employee_id = p_user_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year;
    
    attendance_rate := CASE 
        WHEN v_attendance_total > 0 THEN (v_attendance_present * 100 / v_attendance_total)
        ELSE 100 -- Default to 100% if no attendance records
    END;
    
    -- Calculate weighted total score
    total_score := (
        (task_completion_rate * p_config.task_completion_weight / 100.0) +
        (training_completion_rate * p_config.training_completion_weight / 100.0) +
        (sop_compliance_rate * p_config.sop_compliance_weight / 100.0) +
        (attendance_rate * p_config.attendance_weight / 100.0)
    )::DECIMAL(5,2);
    
    -- Check eligibility
    is_eligible := true;
    ineligibility_reason := NULL;
    
    -- Check minimum attendance rate
    IF attendance_rate < p_config.min_attendance_rate THEN
        is_eligible := false;
        ineligibility_reason := 'Attendance rate below minimum requirement';
    END IF;
    
    -- Check minimum task completion rate
    IF task_completion_rate < p_config.min_task_completion_rate THEN
        is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Task completion rate below minimum requirement';
    END IF;
    
    -- Check employment duration
    SELECT created_at INTO v_employed_since
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_employed_since > (now() - (p_config.min_employment_days || ' days')::INTERVAL) THEN
        is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Employment duration too short';
    END IF;
    
    -- Check recent wins
    IF p_config.exclude_recent_winners THEN
        SELECT COUNT(*) INTO v_recent_wins
        FROM employee_of_the_month
        WHERE user_id = p_user_id
        AND (year > p_year OR (year = p_year AND month >= p_month - p_config.exclusion_months));
        
        IF v_recent_wins > 0 THEN
            is_eligible := false;
            ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Recent winner (within ' || p_config.exclusion_months || ' months)';
        END IF;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNCTION: Run Monthly EOM Calculation
-- ============================================
CREATE OR REPLACE FUNCTION run_eom_calculation(
    p_property_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    total_score DECIMAL,
    rank INTEGER,
    is_eligible BOOLEAN
) AS $$
DECLARE
    v_config eom_automation_config%ROWTYPE;
    v_user_record RECORD;
    v_score_record RECORD;
    v_rank INTEGER := 0;
BEGIN
    -- Get config for property
    SELECT * INTO v_config
    FROM eom_automation_config
    WHERE property_id = p_property_id;
    
    IF NOT FOUND OR NOT v_config.is_enabled THEN
        RAISE EXCEPTION 'EOM automation not enabled for this property';
    END IF;
    
    -- Clear previous scoring history for this month
    DELETE FROM eom_scoring_history
    WHERE property_id = p_property_id
    AND month = p_month
    AND year = p_year;
    
    -- Calculate scores for all active users in property
    FOR v_user_record IN 
        SELECT p.id, p.full_name
        FROM profiles p
        JOIN user_properties up ON up.user_id = p.id
        WHERE up.property_id = p_property_id
        AND p.is_active = true
    LOOP
        SELECT * INTO v_score_record
        FROM calculate_eom_score(
            v_user_record.id, 
            p_property_id, 
            p_month, 
            p_year, 
            v_config
        );
        
        -- Insert scoring history
        INSERT INTO eom_scoring_history (
            property_id, user_id, month, year,
            task_completion_rate, training_completion_rate, 
            sop_compliance_rate, attendance_rate,
            task_completion_score, training_completion_score,
            sop_compliance_score, attendance_score,
            total_score, rank, is_eligible, ineligibility_reason
        ) VALUES (
            p_property_id, v_user_record.id, p_month, p_year,
            v_score_record.task_completion_rate,
            v_score_record.training_completion_rate,
            v_score_record.sop_compliance_rate,
            v_score_record.attendance_rate,
            (v_score_record.task_completion_rate * v_config.task_completion_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.training_completion_rate * v_config.training_completion_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.sop_compliance_rate * v_config.sop_compliance_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.attendance_rate * v_config.attendance_weight / 100.0)::DECIMAL(5,2),
            v_score_record.total_score,
            0, -- Will update later
            v_score_record.is_eligible,
            v_score_record.ineligibility_reason
        );
    END LOOP;
    
    -- Update rankings (only for eligible employees)
    UPDATE eom_scoring_history
    SET rank = subquery.rank
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
        FROM eom_scoring_history
        WHERE property_id = p_property_id
        AND month = p_month
        AND year = p_year
        AND is_eligible = true
    ) subquery
    WHERE eom_scoring_history.id = subquery.id;
    
    -- Return results
    RETURN QUERY
    SELECT 
        esh.user_id,
        p.full_name::TEXT,
        esh.total_score,
        esh.rank,
        esh.is_eligible
    FROM eom_scoring_history esh
    JOIN profiles p ON p.id = esh.user_id
    WHERE esh.property_id = p_property_id
    AND esh.month = p_month
    AND esh.year = p_year
    ORDER BY esh.rank ASC, esh.total_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNCTION: Generate Auto-Selection
-- ============================================
CREATE OR REPLACE FUNCTION generate_eom_auto_selection(
    p_property_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS UUID AS $$
DECLARE
    v_winner RECORD;
    v_config eom_automation_config%ROWTYPE;
    v_selection_id UUID;
    v_reason_en TEXT;
    v_reason_ar TEXT;
BEGIN
    -- Ensure calculation is done
    PERFORM run_eom_calculation(p_property_id, p_month, p_year);
    
    -- Get the winner (rank 1, eligible)
    SELECT esh.*, p.full_name, p.job_title
    INTO v_winner
    FROM eom_scoring_history esh
    JOIN profiles p ON p.id = esh.user_id
    WHERE esh.property_id = p_property_id
    AND esh.month = p_month
    AND esh.year = p_year
    AND esh.is_eligible = true
    AND esh.rank = 1
    ORDER BY esh.total_score DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No eligible employee found for Employee of the Month';
    END IF;
    
    -- Get config for auto-announce setting
    SELECT * INTO v_config
    FROM eom_automation_config
    WHERE property_id = p_property_id;
    
    -- Generate reasons
    v_reason_en := format(
        'Selected based on outstanding performance: %s%% task completion, %s%% training completion, %s%% SOP compliance, and %s%% attendance rate. Total score: %s/100.',
        v_winner.task_completion_rate,
        v_winner.training_completion_rate,
        v_winner.sop_compliance_rate,
        v_winner.attendance_rate,
        v_winner.total_score
    );
    
    v_reason_ar := format(
        'تم الاختيار بناءً على الأداء المتميز: %s%% إنجاز المهام، %s%% إنجاز التدريب، %s%% الالتزام بإجراءات التشغيل القياسية، و%s%% معدل الحضور. النتيجة الإجمالية: %s/100.',
        v_winner.task_completion_rate,
        v_winner.training_completion_rate,
        v_winner.sop_compliance_rate,
        v_winner.attendance_rate,
        v_winner.total_score
    );
    
    -- Insert or update auto-selection
    INSERT INTO eom_auto_selections (
        property_id, user_id, month, year,
        total_score, selection_reason_en, selection_reason_ar,
        status, scoring_history_id
    ) VALUES (
        p_property_id, v_winner.user_id, p_month, p_year,
        v_winner.total_score, v_reason_en, v_reason_ar,
        CASE WHEN v_config.auto_announce THEN 'announced' ELSE 'pending' END,
        v_winner.id
    )
    ON CONFLICT (property_id, month, year) 
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        total_score = EXCLUDED.total_score,
        selection_reason_en = EXCLUDED.selection_reason_en,
        selection_reason_ar = EXCLUDED.selection_reason_ar,
        status = CASE WHEN v_config.auto_announce THEN 'announced' ELSE 'pending' END,
        scoring_history_id = EXCLUDED.scoring_history_id,
        updated_at = now()
    RETURNING id INTO v_selection_id;
    
    -- If auto-announce is enabled, create the actual EOM record
    IF v_config.auto_announce THEN
        PERFORM announce_eom_from_selection(v_selection_id);
    END IF;
    
    RETURN v_selection_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION: Approve and Announce EOM Selection
-- ============================================
CREATE OR REPLACE FUNCTION approve_eom_selection(
    p_selection_id UUID,
    p_approved_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_selection eom_auto_selections%ROWTYPE;
    v_eom_id UUID;
BEGIN
    -- Get selection
    SELECT * INTO v_selection
    FROM eom_auto_selections
    WHERE id = p_selection_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selection not found';
    END IF;
    
    IF v_selection.status != 'pending' THEN
        RAISE EXCEPTION 'Selection is not pending approval';
    END IF;
    
    -- Update selection
    UPDATE eom_auto_selections
    SET status = 'approved',
        reviewed_by = p_approved_by,
        reviewed_at = now(),
        review_notes = p_notes,
        updated_at = now()
    WHERE id = p_selection_id;
    
    -- Create the actual announcement
    RETURN announce_eom_from_selection(p_selection_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCTION: Announce EOM from Selection
-- ============================================
CREATE OR REPLACE FUNCTION announce_eom_from_selection(
    p_selection_id UUID
) RETURNS UUID AS $$
DECLARE
    v_selection eom_auto_selections%ROWTYPE;
    v_eom_id UUID;
BEGIN
    SELECT * INTO v_selection
    FROM eom_auto_selections
    WHERE id = p_selection_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selection not found';
    END IF;
    
    -- Insert into employee_of_the_month
    INSERT INTO employee_of_the_month (
        property_id, user_id, month, year,
        reason_en, reason_ar, created_by
    ) VALUES (
        v_selection.property_id,
        v_selection.user_id,
        v_selection.month,
        v_selection.year,
        v_selection.selection_reason_en,
        v_selection.selection_reason_ar,
        v_selection.reviewed_by -- Or system user
    )
    ON CONFLICT (property_id, month, year)
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        reason_en = EXCLUDED.reason_en,
        reason_ar = EXCLUDED.reason_ar,
        updated_at = now()
    RETURNING id INTO v_eom_id;
    
    -- Update selection record
    UPDATE eom_auto_selections
    SET status = 'announced',
        announced_eom_id = v_eom_id,
        announced_at = now(),
        updated_at = now()
    WHERE id = p_selection_id;
    
    RETURN v_eom_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Update timestamp on config changes
CREATE OR REPLACE FUNCTION update_eom_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eom_automation_config_updated
    BEFORE UPDATE ON eom_automation_config
    FOR EACH ROW
    EXECUTE FUNCTION update_eom_config_timestamp();

-- Update timestamp on selection changes
CREATE OR REPLACE FUNCTION update_eom_selection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eom_auto_selections_updated
    BEFORE UPDATE ON eom_auto_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_eom_selection_timestamp();

-- ============================================
-- 10. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_eom_scoring_history_lookup 
    ON eom_scoring_history(property_id, month, year, rank);

CREATE INDEX IF NOT EXISTS idx_eom_scoring_history_user 
    ON eom_scoring_history(user_id, month, year);

CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_lookup 
    ON eom_auto_selections(property_id, month, year, status);

CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_status 
    ON eom_auto_selections(status, created_at);

-- ============================================
-- 11. DEFAULT CONFIG FOR EXISTING PROPERTIES
-- ============================================
INSERT INTO eom_automation_config (property_id, is_enabled)
SELECT id, false
FROM properties
ON CONFLICT (property_id) DO NOTHING;

-- ============================================
-- 12. ENABLE PG_CRON FOR SCHEDULED JOB (if available)
-- ============================================
-- Note: This will be set up via Edge Function scheduled invocation
-- as pg_cron may not be available on all Supabase plans

COMMENT ON TABLE eom_automation_config IS 'Configuration for automated Employee of the Month selection per property';
COMMENT ON TABLE eom_scoring_history IS 'Historical scoring data for EOM calculations';
COMMENT ON TABLE eom_auto_selections IS 'Pending and announced auto-selections for EOM';
