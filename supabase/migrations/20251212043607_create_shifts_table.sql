-- Create shifts table for employee scheduling
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  shift_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  department_id UUID REFERENCES departments(id),
  property_id UUID REFERENCES properties(id),
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  break_duration_minutes INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_department_id ON shifts(department_id);
CREATE INDEX IF NOT EXISTS idx_shifts_property_id ON shifts(property_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_shifts_user_time ON shifts(user_id, start_time);

-- Create RLS policies
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Users can view their own shifts
CREATE POLICY "Users can view their own shifts" ON shifts
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins and managers can view all shifts
CREATE POLICY "Admins and managers can view all shifts" ON shifts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Only managers and admins can create shifts
CREATE POLICY "Managers can create shifts" ON shifts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Users can update their own shifts (limited), managers can update all
CREATE POLICY "Update own shifts" ON shifts
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Only managers can delete shifts
CREATE POLICY "Managers can delete shifts" ON shifts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shifts_updated_at_trigger
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_shifts_updated_at();;
