-- Auto AI Triggers Migration
-- Automatically calls AI functions for smart automation

-- Function to call auto-triage edge function
CREATE OR REPLACE FUNCTION trigger_auto_triage_ticket()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
BEGIN
    -- Only trigger for new tickets that don't have explicit priority/category
    IF NEW.priority IS NULL OR NEW.priority = 'medium' THEN
        -- Call the edge function asynchronously via pg_net (if available)
        -- For now, we'll rely on frontend hooks
        -- The frontend useMaintenanceTickets hook will call this
        
        -- Mark ticket for AI processing
        NEW.ai_triage_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for maintenance tickets
DROP TRIGGER IF EXISTS auto_triage_on_insert ON maintenance_tickets;
CREATE TRIGGER auto_triage_on_insert
    BEFORE INSERT ON maintenance_tickets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_triage_ticket();

-- Add AI fields to maintenance_tickets if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_tickets' AND column_name = 'ai_triage_status') THEN
        ALTER TABLE maintenance_tickets ADD COLUMN ai_triage_status TEXT DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_tickets' AND column_name = 'ai_triage_notes') THEN
        ALTER TABLE maintenance_tickets ADD COLUMN ai_triage_notes TEXT DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_tickets' AND column_name = 'ai_triaged_at') THEN
        ALTER TABLE maintenance_tickets ADD COLUMN ai_triaged_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_tickets' AND column_name = 'estimated_hours') THEN
        ALTER TABLE maintenance_tickets ADD COLUMN estimated_hours NUMERIC DEFAULT NULL;
    END IF;
END $$;

-- Auto-analyze feedback on insert
CREATE OR REPLACE FUNCTION trigger_auto_analyze_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark feedback for AI analysis
    NEW.ai_analysis_status := 'pending';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add AI fields to feedback table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'ai_analysis_status') THEN
            ALTER TABLE feedback ADD COLUMN ai_analysis_status TEXT DEFAULT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'ai_sentiment') THEN
            ALTER TABLE feedback ADD COLUMN ai_sentiment TEXT DEFAULT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'ai_themes') THEN
            ALTER TABLE feedback ADD COLUMN ai_themes JSONB DEFAULT NULL;
        END IF;
        
        -- Create trigger
        DROP TRIGGER IF EXISTS auto_analyze_on_insert ON feedback;
        CREATE TRIGGER auto_analyze_on_insert
            BEFORE INSERT ON feedback
            FOR EACH ROW
            EXECUTE FUNCTION trigger_auto_analyze_feedback();
    END IF;
END $$;

COMMENT ON FUNCTION trigger_auto_triage_ticket() IS 'Marks new maintenance tickets for AI triage processing';
COMMENT ON FUNCTION trigger_auto_analyze_feedback() IS 'Marks new feedback for AI sentiment analysis';
