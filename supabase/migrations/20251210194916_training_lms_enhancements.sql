-- Add new columns to existing tables
ALTER TABLE training_content_blocks
  ADD COLUMN IF NOT EXISTS content_url TEXT,
  ADD COLUMN IF NOT EXISTS content_data JSONB,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;

ALTER TABLE training_assignments
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_enroll BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_type TEXT CHECK (recurring_type IN ('none', 'monthly', 'quarterly')),
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- Quiz attempts table (new)
CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  answers JSONB,
  UNIQUE(user_id, module_id, attempt_number)
);

-- Enhanced certificates with verification
ALTER TABLE training_certificates
  ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES training_quiz_attempts(id) ON DELETE SET NULL;

-- Training paths (new)
CREATE TABLE IF NOT EXISTS training_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  path_type TEXT NOT NULL CHECK (path_type IN ('new_hire', 'department', 'leadership', 'custom')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_path_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES training_paths(id) ON DELETE CASCADE,
  module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  UNIQUE(path_id, module_id)
);

CREATE TABLE IF NOT EXISTS user_path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  path_id UUID REFERENCES training_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);

-- Enable RLS on new tables
ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_path_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_path_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "quiz_attempts_own" ON training_quiz_attempts FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "quiz_attempts_view" ON training_quiz_attempts FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'regional_admin') OR
  public.has_role(auth.uid(), 'regional_hr') OR
  public.has_role(auth.uid(), 'property_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

CREATE POLICY "paths_view" ON training_paths FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "paths_manage" ON training_paths FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'regional_admin') OR
  public.has_role(auth.uid(), 'regional_hr') OR
  public.has_role(auth.uid(), 'property_manager')
);

CREATE POLICY "path_modules_view" ON training_path_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "path_modules_manage" ON training_path_modules FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'regional_admin') OR
  public.has_role(auth.uid(), 'regional_hr') OR
  public.has_role(auth.uid(), 'property_manager')
);

CREATE POLICY "user_path_enrollments_own" ON user_path_enrollments FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_path_enrollments_view" ON user_path_enrollments FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'regional_admin') OR
  public.has_role(auth.uid(), 'regional_hr') OR
  public.has_role(auth.uid(), 'property_manager')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user_module ON training_quiz_attempts(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_deadline ON training_assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_training_certificates_verification ON training_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_user_path_enrollments_user ON user_path_enrollments(user_id);;
