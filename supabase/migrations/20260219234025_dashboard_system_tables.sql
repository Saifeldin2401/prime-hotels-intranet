-- Dashboard System Tables - Full Integration
-- Creates all necessary tables for the premium dashboard to function

-- ===========================================
-- 1. NOTIFICATIONS SYSTEM
-- ===========================================

-- Drop existing table if recreating
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

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Indexes
CREATE INDEX idx_kudos_recipient_id ON kudos(recipient_id);
CREATE INDEX idx_kudos_giver_id ON kudos(giver_id);
CREATE INDEX idx_kudos_created_at ON kudos(created_at DESC);
CREATE INDEX idx_kudos_public ON kudos(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public kudos"
    ON kudos FOR SELECT
    TO authenticated
    USING (is_public = true);

CREATE POLICY "Users can view own kudos"
    ON kudos FOR SELECT
    TO authenticated
    USING (recipient_id = auth.uid() OR giver_id = auth.uid());

CREATE POLICY "Authenticated users can create kudos"
    ON kudos FOR INSERT
    TO authenticated
    WITH CHECK (giver_id = auth.uid());

CREATE POLICY "Users can update own kudos"
    ON kudos FOR UPDATE
    TO authenticated
    USING (giver_id = auth.uid());

-- Kudos likes table
DROP TABLE IF EXISTS kudos_likes CASCADE;

CREATE TABLE kudos_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id UUID NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(kudos_id, user_id)
);

CREATE INDEX idx_kudos_likes_kudos_id ON kudos_likes(kudos_id);
CREATE INDEX idx_kudos_likes_user_id ON kudos_likes(user_id);

ALTER TABLE kudos_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view kudos likes"
    ON kudos_likes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can like kudos"
    ON kudos_likes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Function to like/unlike kudos
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
        DELETE FROM kudos_likes 
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid();
        
        UPDATE kudos SET likes_count = likes_count - 1 
        WHERE id = kudos_uuid;
        
        RETURN false;
    ELSE
        INSERT INTO kudos_likes (kudos_id, user_id)
        VALUES (kudos_uuid, auth.uid());
        
        UPDATE kudos SET likes_count = likes_count + 1 
        WHERE id = kudos_uuid;
        
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Indexes
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_property_id ON events(property_id);
CREATE INDEX idx_events_public ON events(is_public) WHERE is_public = true;
CREATE INDEX idx_events_date_range ON events(start_date, end_date);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public events"
    ON events FOR SELECT
    TO authenticated
    USING (is_public = true);

CREATE POLICY "Users can view events they attend"
    ON events FOR SELECT
    TO authenticated
    USING (auth.uid() = ANY(attendees));

CREATE POLICY "Users can create events"
    ON events FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own events"
    ON events FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- Function to get events for date range
CREATE OR REPLACE FUNCTION get_events_for_range(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    property_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    event_start TIMESTAMPTZ,
    event_end TIMESTAMPTZ,
    all_day BOOLEAN,
    location TEXT,
    event_type TEXT,
    property_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.start_date,
        e.end_date,
        e.all_day,
        e.location,
        e.type,
        e.property_id
    FROM events e
    WHERE e.start_date >= start_date 
      AND e.start_date <= end_date
      AND e.is_public = true
      AND (property_filter IS NULL OR e.property_id = property_filter)
    ORDER BY e.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    shift_type TEXT DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'training', 'meeting')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shift_date, start_time)
);

-- Indexes
CREATE INDEX idx_user_shifts_user_id ON user_shifts(user_id);
CREATE INDEX idx_user_shifts_date ON user_shifts(shift_date);
CREATE INDEX idx_user_shifts_user_date ON user_shifts(user_id, shift_date);
CREATE INDEX idx_user_shifts_property ON user_shifts(property_id);

-- Enable RLS
ALTER TABLE user_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own shifts"
    ON user_shifts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Managers can view property shifts"
    ON user_shifts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN user_properties up ON ur.user_id = up.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('property_manager', 'department_head', 'property_hr', 'regional_admin')
            AND up.property_id = user_shifts.property_id
        )
    );

CREATE POLICY "HR can manage shifts"
    ON user_shifts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin')
        )
    );

-- Function to get next shift for user
CREATE OR REPLACE FUNCTION get_next_shift(user_uuid UUID)
RETURNS TABLE (
    shift_id UUID,
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    department_name TEXT,
    property_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.shift_date,
        us.start_time,
        us.end_time,
        d.name,
        p.name
    FROM user_shifts us
    LEFT JOIN departments d ON us.department_id = d.id
    LEFT JOIN properties p ON us.property_id = p.id
    WHERE us.user_id = user_uuid
      AND us.shift_date >= CURRENT_DATE
      AND us.status IN ('scheduled', 'confirmed')
    ORDER BY us.shift_date, us.start_time
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Enable RLS
ALTER TABLE user_vacation_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vacation balance"
    ON user_vacation_balance FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "HR can view all vacation balances"
    ON user_vacation_balance FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin')
        )
    );

-- Function to get vacation balance
CREATE OR REPLACE FUNCTION get_vacation_balance(user_uuid UUID, year_filter INTEGER DEFAULT NULL)
RETURNS TABLE (
    total_days INTEGER,
    used_days DECIMAL,
    pending_days DECIMAL,
    remaining_days DECIMAL
) AS $$
DECLARE
    target_year INTEGER := COALESCE(year_filter, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
    RETURN QUERY
    SELECT 
        vb.total_days,
        vb.used_days,
        vb.pending_days,
        (vb.total_days + vb.carried_over - vb.used_days - vb.pending_days)::DECIMAL as remaining_days
    FROM user_vacation_balance vb
    WHERE vb.user_id = user_uuid AND vb.year = target_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. ACTIVITY LOG SYSTEM
-- ===========================================

DROP TABLE IF EXISTS activity_log CASCADE;

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'document_completed', 'training_completed', 'task_completed', 
        'maintenance_resolved', 'new_hire', 'leave_approved', 
        'certification_earned', 'kudos_received', 'login'
    )),
    target_type TEXT,
    target_id UUID,
    target_name TEXT,
    metadata JSONB DEFAULT '{}',
    property_id UUID REFERENCES properties(id),
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX idx_activity_log_property ON activity_log(property_id);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their properties"
    ON activity_log FOR SELECT
    TO authenticated
    USING (
        property_id IS NULL OR
        EXISTS (
            SELECT 1 FROM user_properties up
            WHERE up.user_id = auth.uid()
            AND up.property_id = activity_log.property_id
        )
    );

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    action TEXT,
    target_type TEXT DEFAULT NULL,
    target_id UUID DEFAULT NULL,
    target_name TEXT DEFAULT NULL,
    meta JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
    user_property UUID;
    user_department UUID;
BEGIN
    -- Get user's property and department
    SELECT property_id INTO user_property
    FROM user_properties 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    
    SELECT department_id INTO user_department
    FROM user_departments 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    
    INSERT INTO activity_log (
        user_id, action_type, target_type, target_id, 
        target_name, metadata, property_id, department_id
    ) VALUES (
        auth.uid(), action, target_type, target_id,
        target_name, meta, user_property, user_department
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. SEED SAMPLE DATA
-- ===========================================

-- Insert sample events
INSERT INTO events (title, description, start_date, end_date, type, is_public, created_by)
SELECT 
    'Team Meeting',
    'Weekly department sync',
    now() + interval '1 day',
    now() + interval '1 day 1 hour',
    'meeting',
    true,
    id
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, start_date, all_day, type, is_public, created_by)
SELECT 
    'Payday',
    'Monthly salary payment',
    date_trunc('month', now()) + interval '1 month - 1 day',
    true,
    'holiday',
    true,
    id
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed notification types for existing users
INSERT INTO notifications (user_id, type, title, message, link, created_at)
SELECT 
    id,
    'info',
    'Welcome to the new Dashboard!',
    'Check out our newly redesigned dashboard with enhanced features.',
    '/dashboard',
    now()
FROM auth.users
ON CONFLICT DO NOTHING;

-- ===========================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kudos_updated_at BEFORE UPDATE ON kudos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_shifts_updated_at BEFORE UPDATE ON user_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_vacation_balance_updated_at BEFORE UPDATE ON user_vacation_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 9. DASHBOARD STATS FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_uuid UUID)
RETURNS TABLE (
    pending_tasks BIGINT,
    completed_training BIGINT,
    in_progress_training BIGINT,
    unread_announcements BIGINT,
    pending_approvals BIGINT,
    unread_notifications BIGINT,
    next_shift_date DATE,
    next_shift_start TIME,
    vacation_remaining DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Tasks
        COALESCE((
            SELECT COUNT(*) FROM tasks 
            WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')
        ), 0),
        -- Training
        COALESCE((
            SELECT COUNT(*) FROM training_progress 
            WHERE user_id = user_uuid AND status = 'completed'
        ), 0),
        COALESCE((
            SELECT COUNT(*) FROM training_progress 
            WHERE user_id = user_uuid AND status = 'in_progress'
        ), 0),
        -- Announcements
        COALESCE((
            SELECT COUNT(*) FROM announcements a
            WHERE a.created_at > now() - interval '30 days'
            AND NOT EXISTS (
                SELECT 1 FROM announcement_reads ar 
                WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid
            )
        ), 0),
        -- Approvals
        COALESCE((
            SELECT COUNT(*) FROM approval_requests 
            WHERE current_approver_id = user_uuid AND status = 'pending'
        ), 0),
        -- Notifications
        COALESCE((
            SELECT COUNT(*) FROM notifications 
            WHERE user_id = user_uuid AND read_at IS NULL
        ), 0),
        -- Next shift
        (SELECT shift_date FROM user_shifts 
         WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
         ORDER BY shift_date, start_time LIMIT 1),
        (SELECT start_time FROM user_shifts 
         WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
         ORDER BY shift_date, start_time LIMIT 1),
        -- Vacation
        COALESCE((
            SELECT (total_days + carried_over - used_days - pending_days)
            FROM user_vacation_balance 
            WHERE user_id = user_uuid AND year = EXTRACT(YEAR FROM CURRENT_DATE)
        ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
