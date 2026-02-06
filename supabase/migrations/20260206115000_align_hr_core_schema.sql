-- Align HR core schema to app expectations (non-destructive)
-- Created: 2026-02-06

-- Attendance
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Goals
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Performance reviews
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS review_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Payslips
ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill publish status for legacy data
UPDATE payslips
SET is_published = (status = 'published')
WHERE is_published IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS attendance_employee_date_idx ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS attendance_employee_check_in_idx ON attendance(employee_id, check_in);

CREATE INDEX IF NOT EXISTS shifts_user_start_idx ON shifts(user_id, start_time);
CREATE INDEX IF NOT EXISTS shifts_department_start_idx ON shifts(department_id, start_time);
CREATE INDEX IF NOT EXISTS shifts_property_start_idx ON shifts(property_id, start_time);

CREATE INDEX IF NOT EXISTS performance_reviews_employee_date_idx ON performance_reviews(employee_id, review_date);

CREATE INDEX IF NOT EXISTS goals_employee_status_idx ON goals(employee_id, status);
CREATE INDEX IF NOT EXISTS goals_employee_target_idx ON goals(employee_id, target_date);

CREATE INDEX IF NOT EXISTS payslips_employee_period_idx ON payslips(employee_id, period_end);
CREATE INDEX IF NOT EXISTS payslips_employee_month_idx ON payslips(employee_id, year, month);

-- updated_at triggers (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_updated_at') THEN
    CREATE TRIGGER update_attendance_updated_at
      BEFORE UPDATE ON attendance
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shifts_updated_at') THEN
    CREATE TRIGGER update_shifts_updated_at
      BEFORE UPDATE ON shifts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_performance_reviews_updated_at') THEN
    CREATE TRIGGER update_performance_reviews_updated_at
      BEFORE UPDATE ON performance_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_goals_updated_at') THEN
    CREATE TRIGGER update_goals_updated_at
      BEFORE UPDATE ON goals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payslips_updated_at') THEN
    CREATE TRIGGER update_payslips_updated_at
      BEFORE UPDATE ON payslips
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
