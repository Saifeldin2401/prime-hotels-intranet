-- Create comprehensive SOP system with quiz functionality
-- Migration: 20250211130000_create_complete_sop_system

-- SOP Documents Table
CREATE TABLE IF NOT EXISTS sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived')),
  category TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  requires_quiz BOOLEAN DEFAULT FALSE,
  passing_score INTEGER DEFAULT 70,
  quiz_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOP Assignments Table
CREATE TABLE IF NOT EXISTS sop_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id UUID REFERENCES sop_documents(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sop_document_id, assigned_to_user_id)
);

-- SOP Reading Logs Table
CREATE TABLE IF NOT EXISTS sop_reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id UUID REFERENCES sop_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(sop_document_id, user_id)
);

-- SOP Quiz Questions Table
CREATE TABLE IF NOT EXISTS sop_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id UUID REFERENCES sop_documents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'fill_blank')),
  options JSONB, -- For MCQ: ["Option 1", "Option 2", "Option 3", "Option 4"]
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOP Quiz Attempts Table
CREATE TABLE IF NOT EXISTS sop_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id UUID REFERENCES sop_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score DECIMAL NOT NULL,
  total_points INTEGER NOT NULL,
  percentage DECIMAL NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL, -- Store user answers: [{ question_id, answer, correct }]
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sop_documents_status ON sop_documents(status);
CREATE INDEX IF NOT EXISTS idx_sop_documents_property ON sop_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_department ON sop_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_sop_assignments_sop ON sop_assignments(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_assignments_user ON sop_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_sop_reading_logs_sop ON sop_reading_logs(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_reading_logs_user ON sop_reading_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_questions_sop ON sop_quiz_questions(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_questions_order ON sop_quiz_questions(sop_document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_sop ON sop_quiz_attempts(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_user ON sop_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_user_sop ON sop_quiz_attempts(user_id, sop_document_id);

-- Enable RLS
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sop_documents
CREATE POLICY "Published SOPs are viewable by all authenticated users" ON sop_documents FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "Regional admin/HR can manage all SOPs" ON sop_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can manage property SOPs" ON sop_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND (up.property_id = sop_documents.property_id OR sop_documents.property_id IS NULL)));

-- RLS Policies for sop_assignments
CREATE POLICY "Users can view own assignments" ON sop_assignments FOR SELECT TO authenticated USING (assigned_to_user_id = auth.uid());
CREATE POLICY "Regional admin/HR can manage all assignments" ON sop_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can manage property assignments" ON sop_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN user_properties emp_up ON emp_up.user_id = sop_assignments.assigned_to_user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND up.property_id = emp_up.property_id));

-- RLS Policies for sop_reading_logs
CREATE POLICY "Users can view own reading logs" ON sop_reading_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own reading logs" ON sop_reading_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reading logs" ON sop_reading_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Regional admin/HR can view all reading logs" ON sop_reading_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));

-- RLS Policies for sop_quiz_questions
CREATE POLICY "Regional admin/HR can manage quiz questions" ON sop_quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can manage property quiz questions" ON sop_quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN sop_documents sd ON sd.id = sop_quiz_questions.sop_document_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND (sd.property_id = up.property_id OR sd.property_id IS NULL)));
CREATE POLICY "Users can view quiz questions for accessible SOPs" ON sop_quiz_questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sop_documents sd WHERE sd.id = sop_quiz_questions.sop_document_id AND sd.status = 'published'));

-- RLS Policies for sop_quiz_attempts
CREATE POLICY "Users can view own quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own quiz attempts" ON sop_quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Regional admin/HR can view all quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can view property quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN user_properties emp_up ON emp_up.user_id = sop_quiz_attempts.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND up.property_id = emp_up.property_id));
CREATE POLICY "Department heads can view department quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_departments ud ON ud.user_id = ur.user_id JOIN user_departments emp_ud ON emp_ud.user_id = sop_quiz_attempts.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'department_head' AND ud.department_id = emp_ud.department_id));

-- Triggers
CREATE TRIGGER update_sop_documents_updated_at BEFORE UPDATE ON sop_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sop_quiz_questions_updated_at BEFORE UPDATE ON sop_quiz_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-mark SOP as read when quiz is passed
CREATE OR REPLACE FUNCTION mark_sop_read_on_quiz_pass() RETURNS TRIGGER AS $$ BEGIN IF NEW.passed = TRUE AND NEW.completed_at IS NOT NULL THEN INSERT INTO sop_reading_logs (sop_document_id, user_id, read_at, completed) VALUES (NEW.sop_document_id, NEW.user_id, NEW.completed_at, TRUE) ON CONFLICT (sop_document_id, user_id) DO UPDATE SET read_at = NEW.completed_at, completed = TRUE; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER auto_mark_sop_read_on_quiz_pass AFTER INSERT OR UPDATE ON sop_quiz_attempts FOR EACH ROW EXECUTE FUNCTION mark_sop_read_on_quiz_pass();
