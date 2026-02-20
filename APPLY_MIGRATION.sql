-- =====================================================
-- DASHBOARD SYSTEM TABLES - FULL INTEGRATION
-- Run this in Supabase SQL Editor to make dashboard functional
-- =====================================================

-- ===========================================
-- 1. NOTIFICATIONS SYSTEM
-- ===========================================
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('announcement', 'training', 'document', 'message', 'alert', 'info', 'task', 'approval')),
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- ===========================================
-- 2. KUDOS / RECOGNITION SYSTEM
-- ===========================================
DROP TABLE IF EXISTS kudos CASCADE;

CREATE TABLE kudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'teamwork', 'innovation', 'customer_service', 'leadership', 'excellence')),
    likes_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kudos_recipient_id ON kudos(recipient_id);
CREATE INDEX idx_kudos_created_at ON kudos(created_at DESC);

ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public kudos"
    ON kudos FOR SELECT
    TO authenticated
    USING (is_public = true);

CREATE POLICY "Authenticated users can create kudos"
    ON kudos FOR INSERT
    TO authenticated
    WITH CHECK (giver_id = auth.uid());

-- Kudos likes table
DROP TABLE IF EXISTS kudos_likes CASCADE;

CREATE TABLE kudos_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id UUID NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(kudos_id, user_id)
);

ALTER TABLE kudos_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can like kudos"
    ON kudos_likes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 3. EVENTS / CALENDAR SYSTEM
-- ===========================================
DROP TABLE IF EXISTS events CASCADE;

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    type TEXT DEFAULT 'general' CHECK (type IN ('meeting', 'training', 'holiday', 'deadline', 'birthday', 'general')),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    attendees UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_public ON events(is_public) WHERE is_public = true;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public events"
    ON events FOR SELECT
    TO authenticated
    USING (is_public = true);

-- ===========================================
-- 4. USER SHIFTS / SCHEDULING
-- ===========================================
DROP TABLE IF EXISTS user_shifts CASCADE;

CREATE TABLE user_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type TEXT DEFAULT 'regular',
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shift_date, start_time)
);

CREATE INDEX idx_user_shifts_user_id ON user_shifts(user_id);
CREATE INDEX idx_user_shifts_date ON user_shifts(shift_date);

ALTER TABLE user_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts"
    ON user_shifts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ===========================================
-- 5. VACATION / PTO TRACKING
-- ===========================================
DROP TABLE IF EXISTS user_vacation_balance CASCADE;

CREATE TABLE user_vacation_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    total_days INTEGER NOT NULL DEFAULT 25,
    used_days DECIMAL(5,2) DEFAULT 0,
    pending_days DECIMAL(5,2) DEFAULT 0,
    carried_over DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, year)
);

ALTER TABLE user_vacation_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vacation balance"
    ON user_vacation_balance FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ===========================================
-- 6. ACTIVITY LOG SYSTEM
-- ===========================================
DROP TABLE IF EXISTS activity_log CASCADE;

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    target_name TEXT,
    metadata JSONB DEFAULT '{}',
    property_id UUID REFERENCES properties(id),
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity"
    ON activity_log FOR SELECT
    TO authenticated
    USING (true);

-- ===========================================
-- 7. DATABASE FUNCTIONS
-- ===========================================

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle kudos like
CREATE OR REPLACE FUNCTION toggle_kudos_like(kudos_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    already_liked BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM kudos_likes 
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid()
    ) INTO already_liked;
    
    IF already_liked THEN
        DELETE FROM kudos_likes WHERE kudos_id = kudos_uuid AND user_id = auth.uid();
        UPDATE kudos SET likes_count = likes_count - 1 WHERE id = kudos_uuid;
        RETURN false;
    ELSE
        INSERT INTO kudos_likes (kudos_id, user_id) VALUES (kudos_uuid, auth.uid());
        UPDATE kudos SET likes_count = likes_count + 1 WHERE id = kudos_uuid;
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get events for range
CREATE OR REPLACE FUNCTION get_events_for_range(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    property_filter UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, title TEXT, description TEXT, event_start TIMESTAMPTZ, event_end TIMESTAMPTZ, all_day BOOLEAN, location TEXT, event_type TEXT, property_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.description, e.start_date, e.end_date, e.all_day, e.location, e.type, e.property_id
    FROM events e
    WHERE e.start_date >= start_date AND e.start_date <= end_date
      AND e.is_public = true
      AND (property_filter IS NULL OR e.property_id = property_filter)
    ORDER BY e.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next shift
CREATE OR REPLACE FUNCTION get_next_shift(user_uuid UUID)
RETURNS TABLE (shift_id UUID, shift_date DATE, start_time TIME, end_time TIME, department_name TEXT, property_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT us.id, us.shift_date, us.start_time, us.end_time, d.name, p.name
    FROM user_shifts us
    LEFT JOIN departments d ON us.department_id = d.id
    LEFT JOIN properties p ON us.property_id = p.id
    WHERE us.user_id = user_uuid AND us.shift_date >= CURRENT_DATE AND us.status IN ('scheduled', 'confirmed')
    ORDER BY us.shift_date, us.start_time LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get vacation balance
CREATE OR REPLACE FUNCTION get_vacation_balance(user_uuid UUID, year_filter INTEGER DEFAULT NULL)
RETURNS TABLE (total_days INTEGER, used_days DECIMAL, pending_days DECIMAL, remaining_days DECIMAL) AS $$
DECLARE target_year INTEGER := COALESCE(year_filter, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
    RETURN QUERY
    SELECT vb.total_days, vb.used_days, vb.pending_days, (vb.total_days + vb.carried_over - vb.used_days - vb.pending_days)::DECIMAL
    FROM user_vacation_balance vb
    WHERE vb.user_id = user_uuid AND vb.year = target_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(action TEXT, target_type TEXT DEFAULT NULL, target_id UUID DEFAULT NULL, target_name TEXT DEFAULT NULL, meta JSONB DEFAULT '{}')
RETURNS UUID AS $$
DECLARE new_id UUID; user_property UUID; user_department UUID;
BEGIN
    SELECT property_id INTO user_property FROM user_properties WHERE user_id = auth.uid() LIMIT 1;
    SELECT department_id INTO user_department FROM user_departments WHERE user_id = auth.uid() LIMIT 1;
    INSERT INTO activity_log (user_id, action_type, target_type, target_id, target_name, metadata, property_id, department_id)
    VALUES (auth.uid(), action, target_type, target_id, target_name, meta, user_property, user_department)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_uuid UUID)
RETURNS TABLE (pending_tasks BIGINT, completed_training BIGINT, in_progress_training BIGINT, unread_announcements BIGINT, pending_approvals BIGINT, unread_notifications BIGINT, next_shift_date DATE, next_shift_start TIME, vacation_remaining DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM tasks WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')), 0),
        COALESCE((SELECT COUNT(*) FROM training_progress WHERE user_id = user_uuid AND status = 'completed'), 0),
        COALESCE((SELECT COUNT(*) FROM training_progress WHERE user_id = user_uuid AND status = 'in_progress'), 0),
        COALESCE((SELECT COUNT(*) FROM announcements a WHERE a.created_at > now() - interval '30 days' AND NOT EXISTS (SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid)), 0),
        COALESCE((SELECT COUNT(*) FROM approval_requests WHERE current_approver_id = user_uuid AND status = 'pending'), 0),
        COALESCE((SELECT COUNT(*) FROM notifications WHERE user_id = user_uuid AND read_at IS NULL), 0),
        (SELECT shift_date FROM user_shifts WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE ORDER BY shift_date, start_time LIMIT 1),
        (SELECT start_time FROM user_shifts WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE ORDER BY shift_date, start_time LIMIT 1),
        COALESCE((SELECT (total_days + carried_over - used_days - pending_days) FROM user_vacation_balance WHERE user_id = user_uuid AND year = EXTRACT(YEAR FROM CURRENT_DATE)), 25);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 8. SEED SAMPLE DATA
-- ===========================================

-- Add welcome notification for all users
INSERT INTO notifications (user_id, type, title, message, link)
SELECT id, 'info', 'Welcome to the new Dashboard!', 'Check out our newly redesigned dashboard with enhanced features.', '/dashboard'
FROM auth.users
ON CONFLICT DO NOTHING;

-- Add sample event
INSERT INTO events (title, description, start_date, all_day, type, is_public, created_by)
SELECT 'Team Meeting', 'Weekly department sync', now() + interval '1 day', true, 'meeting', true, id
FROM auth.users LIMIT 1
ON CONFLICT DO NOTHING;

-- Add payday event
INSERT INTO events (title, description, start_date, all_day, type, is_public, created_by)
SELECT 'Payday', 'Monthly salary payment', date_trunc('month', now()) + interval '1 month - 1 day', true, 'holiday', true, id
FROM auth.users LIMIT 1
ON CONFLICT DO NOTHING;

-- Initialize vacation balance for all users
INSERT INTO user_vacation_balance (user_id, year, total_days, used_days, pending_days, carried_over)
SELECT id, 2026, 25, 0, 0, 0 FROM auth.users
ON CONFLICT DO NOTHING;

-- ===========================================
-- DONE! Dashboard is now fully functional.
-- ===========================================
