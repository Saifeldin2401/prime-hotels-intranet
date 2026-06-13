-- ============================================================================
-- Achievement System Migration
-- ============================================================================
-- Creates proper user_achievements table for gamification
-- Replaces mock certificates-as-achievements approach

-- Achievement types enum
DO $$ BEGIN
    CREATE TYPE achievement_type AS ENUM (
        'training_master',      -- Completed 10+ trainings
        'perfect_completion',   -- 100% score on assessment
        'safety_champion',      -- Completed all safety trainings
        'top_performer',        -- Highest score in department
        'zero_incident',        -- Month without incidents
        'fast_responder',       -- Sub-2hr average response time
        'knowledge_sharer',     -- Created 5+ knowledge articles
        'team_player',          -- Helped 10+ colleagues
        'early_bird',           -- Completed training before deadline
        'streak_master'         -- 7-day learning streak
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type achievement_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'award',
    color TEXT DEFAULT 'gold',
    points INTEGER DEFAULT 10,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- Achievement definitions reference table
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_type achievement_type NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'award',
    color TEXT DEFAULT 'gold',
    points INTEGER DEFAULT 10,
    criteria JSONB NOT NULL, -- Defines how to earn this achievement
    is_active BOOLEAN DEFAULT true
);

-- Insert default achievement definitions
INSERT INTO achievement_definitions (achievement_type, title, description, icon, color, points, criteria) VALUES
('training_master', 'Training Master', 'Complete 10 or more training modules', 'graduation-cap', 'blue', 50, '{"training_count": 10}'),
('perfect_completion', 'Perfect Score', 'Achieve 100% on any training assessment', 'target', 'gold', 100, '{"score_percentage": 100}'),
('safety_champion', 'Safety Champion', 'Complete all safety-related training', 'shield-check', 'green', 75, '{"category": "safety", "completion": "all"}'),
('top_performer', 'Top Performer', 'Rank in top 10% of department for training scores', 'trophy', 'purple', 150, '{"rank_percentage": 10}'),
('zero_incident', 'Zero Incident Month', 'Complete a month with no safety incidents', 'check-circle', 'emerald', 200, '{"incident_free_days": 30}'),
('fast_responder', 'Fast Responder', 'Average response time under 2 hours', 'zap', 'orange', 50, '{"max_hours": 2}'),
('knowledge_sharer', 'Knowledge Sharer', 'Create 5 or more knowledge base articles', 'book-open', 'indigo', 75, '{"article_count": 5}'),
('team_player', 'Team Player', 'Help 10+ colleagues complete their training', 'users', 'pink', 100, '{"help_count": 10}'),
('early_bird', 'Early Bird', 'Complete training 3+ days before deadline', 'sunrise', 'amber', 25, '{"days_early": 3}'),
('streak_master', 'Streak Master', 'Maintain a 7-day learning streak', 'flame', 'red', 50, '{"streak_days": 7}')
ON CONFLICT (achievement_type) DO NOTHING;

-- RLS Policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view all achievements (for leaderboard)
CREATE POLICY "Users can view all achievements"
    ON user_achievements FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can only insert their own achievements (system will do this)
CREATE POLICY "Users can earn achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievement(
    p_user_id UUID,
    p_achievement_type achievement_type
) RETURNS BOOLEAN AS $$
DECLARE
    v_definition RECORD;
    v_already_has BOOLEAN;
    v_qualifies BOOLEAN := false;
    v_training_count INTEGER;
    v_avg_score DECIMAL;
    v_response_time DECIMAL;
BEGIN
    -- Check if user already has this achievement
    SELECT EXISTS(
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_type = p_achievement_type
    ) INTO v_already_has;
    
    IF v_already_has THEN
        RETURN false;
    END IF;
    
    -- Get achievement definition
    SELECT * INTO v_definition 
    FROM achievement_definitions 
    WHERE achievement_type = p_achievement_type AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check qualification based on type
    CASE p_achievement_type
        WHEN 'training_master' THEN
            SELECT COUNT(*) INTO v_training_count
            FROM training_progress
            WHERE user_id = p_user_id AND status = 'completed';
            v_qualifies := v_training_count >= (v_definition.criteria->>'training_count')::INTEGER;
            
        WHEN 'perfect_completion' THEN
            SELECT EXISTS(
                SELECT 1 FROM training_progress
                WHERE user_id = p_user_id AND score = 100
            ) INTO v_qualifies;
            
        WHEN 'fast_responder' THEN
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) INTO v_response_time
            FROM tasks
            WHERE created_by = p_user_id AND status = 'completed' AND completed_at IS NOT NULL;
            v_qualifies := v_response_time IS NOT NULL AND v_response_time <= (v_definition.criteria->>'max_hours')::INTEGER;
            
        WHEN 'streak_master' THEN
            -- Will be handled by streak calculation function
            v_qualifies := false; -- Requires separate check
            
        ELSE
            v_qualifies := false;
    END CASE;
    
    IF v_qualifies THEN
        INSERT INTO user_achievements (
            user_id, achievement_type, title, description, icon, color, points
        ) VALUES (
            p_user_id, 
            p_achievement_type, 
            v_definition.title, 
            v_definition.description,
            v_definition.icon,
            v_definition.color,
            v_definition.points
        );
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-check achievements on training completion
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_training()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Check training master
        PERFORM check_and_award_achievement(NEW.user_id, 'training_master');
        
        -- Check perfect completion
        IF NEW.score = 100 THEN
            PERFORM check_and_award_achievement(NEW.user_id, 'perfect_completion');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_achievements ON training_progress;
CREATE TRIGGER trg_check_achievements
    AFTER UPDATE ON training_progress
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_achievements_on_training();

-- View for achievement leaderboard
CREATE OR REPLACE VIEW achievement_leaderboard AS
SELECT 
    user_id,
    COUNT(*) as total_achievements,
    SUM(points) as total_points,
    MAX(earned_at) as last_achievement_at
FROM user_achievements
GROUP BY user_id
ORDER BY total_points DESC;

-- Comments
COMMENT ON TABLE user_achievements IS 'Stores earned achievements for each user';
COMMENT ON TABLE achievement_definitions IS 'Defines available achievements and their criteria';
COMMENT ON FUNCTION check_and_award_achievement IS 'Checks if user qualifies for achievement and awards it';

-- ============================================================================
-- End of Achievement System Migration
-- ============================================================================
