-- Create announcement_acknowledgments table
CREATE TABLE IF NOT EXISTS announcement_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- Create announcement_comments table
CREATE TABLE IF NOT EXISTS announcement_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE announcement_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

-- Acknowledgments: users can acknowledge announcements they can view
CREATE POLICY "Users can view acknowledgments" ON announcement_acknowledgments FOR SELECT USING (true);
CREATE POLICY "Users can acknowledge announcements" ON announcement_acknowledgments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own acknowledgment" ON announcement_acknowledgments FOR DELETE USING (auth.uid() = user_id);

-- Comments: users can comment on announcements they can view
CREATE POLICY "Users can view comments" ON announcement_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON announcement_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON announcement_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON announcement_comments FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcement_ack_announcement ON announcement_acknowledgments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_ack_user ON announcement_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement ON announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user ON announcement_comments(user_id);;
