-- Create SOP quiz system tables
-- Migration: 20250211120000_create_sop_quiz_system

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

-- Add quiz configuration columns to sop_documents if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sop_documents' 
    AND column_name = 'requires_quiz'
  ) THEN
    ALTER TABLE sop_documents 
    ADD COLUMN requires_quiz BOOLEAN DEFAULT FALSE,
    ADD COLUMN passing_score INTEGER DEFAULT 70,
    ADD COLUMN quiz_enabled BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sop_quiz_questions_sop ON sop_quiz_questions(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_questions_order ON sop_quiz_questions(sop_document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_sop ON sop_quiz_attempts(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_user ON sop_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_quiz_attempts_user_sop ON sop_quiz_attempts(user_id, sop_document_id);

-- Enable Row Level Security
ALTER TABLE sop_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sop_quiz_questions

-- Regional admin and regional HR can manage all quiz questions
CREATE POLICY "Regional admin/HR can manage quiz questions"
  ON sop_quiz_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Property HR can manage quiz questions for their property's SOPs
CREATE POLICY "Property HR can manage property quiz questions"
  ON sop_quiz_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN sop_documents sd ON sd.id = sop_quiz_questions.sop_document_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'property_hr'
      AND (sd.property_id = up.property_id OR sd.property_id IS NULL)
    )
  );

-- All authenticated users can view quiz questions for SOPs they can access
CREATE POLICY "Users can view quiz questions for accessible SOPs"
  ON sop_quiz_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sop_documents sd
      WHERE sd.id = sop_quiz_questions.sop_document_id
      AND sd.status = 'published'
    )
  );

-- RLS Policies for sop_quiz_attempts

-- Users can view their own quiz attempts
CREATE POLICY "Users can view own quiz attempts"
  ON sop_quiz_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own quiz attempts
CREATE POLICY "Users can create own quiz attempts"
  ON sop_quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Regional admin and regional HR can view all quiz attempts
CREATE POLICY "Regional admin/HR can view all quiz attempts"
  ON sop_quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Property HR can view quiz attempts for their property's employees
CREATE POLICY "Property HR can view property quiz attempts"
  ON sop_quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN user_properties emp_up ON emp_up.user_id = sop_quiz_attempts.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'property_hr'
      AND up.property_id = emp_up.property_id
    )
  );

-- Department heads can view quiz attempts for their department employees
CREATE POLICY "Department heads can view department quiz attempts"
  ON sop_quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_departments ud ON ud.user_id = ur.user_id
      JOIN user_departments emp_ud ON emp_ud.user_id = sop_quiz_attempts.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'department_head'
      AND ud.department_id = emp_ud.department_id
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_sop_quiz_questions_updated_at
  BEFORE UPDATE ON sop_quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically mark SOP as read when quiz is passed
CREATE OR REPLACE FUNCTION mark_sop_read_on_quiz_pass()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark as read if quiz was passed and completed
  IF NEW.passed = TRUE AND NEW.completed_at IS NOT NULL THEN
    -- Insert or update reading log
    INSERT INTO sop_reading_logs (sop_document_id, user_id, read_at, completed)
    VALUES (NEW.sop_document_id, NEW.user_id, NEW.completed_at, TRUE)
    ON CONFLICT (sop_document_id, user_id) 
    DO UPDATE SET 
      read_at = NEW.completed_at,
      completed = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-mark SOP as read when quiz is passed
CREATE TRIGGER auto_mark_sop_read_on_quiz_pass
  AFTER INSERT OR UPDATE ON sop_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION mark_sop_read_on_quiz_pass();
