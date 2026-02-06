-- HR core tables: attendance, shifts, performance reviews, goals, payslips
-- Created: 2026-02-06
-- Note: Must run before 20260206120000_remove_super_admin_enum.sql

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in)
);

-- Shifts table
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL DEFAULT 'Shift',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  break_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (break_duration_minutes >= 0)
);

-- Performance reviews table
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_period TEXT NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 5),
  rating INTEGER,
  strengths TEXT,
  areas_for_improvement TEXT,
  comments TEXT,
  goals TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payslips table
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 1900),
  basic_salary NUMERIC(12, 2),
  gross_salary NUMERIC(12, 2),
  deductions NUMERIC(12, 2),
  net_salary NUMERIC(12, 2),
  components JSONB,
  status TEXT,
  period_start DATE,
  period_end DATE,
  payment_date DATE,
  currency TEXT,
  is_published BOOLEAN DEFAULT false,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start),
  UNIQUE(employee_id, month, year)
);

-- Indexes
CREATE INDEX attendance_employee_date_idx ON attendance(employee_id, date);
CREATE INDEX attendance_employee_check_in_idx ON attendance(employee_id, check_in);

CREATE INDEX shifts_user_start_idx ON shifts(user_id, start_time);
CREATE INDEX shifts_department_start_idx ON shifts(department_id, start_time);
CREATE INDEX shifts_property_start_idx ON shifts(property_id, start_time);

CREATE INDEX performance_reviews_employee_date_idx ON performance_reviews(employee_id, review_date);

CREATE INDEX goals_employee_status_idx ON goals(employee_id, status);
CREATE INDEX goals_employee_target_idx ON goals(employee_id, target_date);

CREATE INDEX payslips_employee_period_idx ON payslips(employee_id, period_end);
CREATE INDEX payslips_employee_month_idx ON payslips(employee_id, year, month);

-- updated_at triggers
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Self-access policies (no app_role casts so they survive the role enum migration)
CREATE POLICY "attendance_select_self" ON attendance
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "attendance_insert_self" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "attendance_update_self" ON attendance
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "shifts_select_self" ON shifts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "performance_reviews_select_self" ON performance_reviews
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR reviewer_id = auth.uid());

CREATE POLICY "goals_select_self" ON goals
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "goals_insert_self" ON goals
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "goals_update_self" ON goals
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "payslips_select_self" ON payslips
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());
