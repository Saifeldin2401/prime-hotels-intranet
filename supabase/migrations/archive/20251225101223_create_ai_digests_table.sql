-- AI Manager Digests Table
-- Stores AI-generated summaries for managers

CREATE TABLE IF NOT EXISTS ai_manager_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Digest Content
    digest_type TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_type IN ('daily', 'weekly', 'monthly')),
    summary_text TEXT NOT NULL,
    
    -- Raw metrics for reference
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Period covered
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Index for fast lookups
    CONSTRAINT unique_user_period UNIQUE (user_id, digest_type, period_start)
);

-- Enable RLS
ALTER TABLE ai_manager_digests ENABLE ROW LEVEL SECURITY;

-- Managers can only see their own digests
CREATE POLICY "Users can view own digests" ON ai_manager_digests
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update
CREATE POLICY "Service can manage digests" ON ai_manager_digests
    FOR ALL USING (true) WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_ai_digests_user_created ON ai_manager_digests(user_id, created_at DESC);

COMMENT ON TABLE ai_manager_digests IS 'AI-generated summary digests for managers';;
