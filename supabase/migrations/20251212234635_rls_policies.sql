-- RLS Policies for Quiz Module
DROP POLICY IF EXISTS "Anyone can view running quizzes" ON quizzes;
CREATE POLICY "Anyone can view running quizzes" ON quizzes
  FOR SELECT USING (status = 'running' OR auth.uid() = created_by OR true);

DROP POLICY IF EXISTS "Authenticated can create quizzes" ON quizzes;
CREATE POLICY "Authenticated can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Creator can update quizzes" ON quizzes;
CREATE POLICY "Creator can update quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = created_by);

-- Quiz questions policies
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON quiz_questions;
CREATE POLICY "Anyone can view quiz questions" ON quiz_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can manage questions" ON quiz_questions;
CREATE POLICY "Authenticated can manage questions" ON quiz_questions
  FOR ALL USING (auth.role() = 'authenticated');

-- Quiz attempts policies
DROP POLICY IF EXISTS "Users can view own attempts" ON quiz_attempts;
CREATE POLICY "Users can view own attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own attempts" ON quiz_attempts;
CREATE POLICY "Users can create own attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own attempts" ON quiz_attempts;
CREATE POLICY "Users can update own attempts" ON quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Quiz answers policies
DROP POLICY IF EXISTS "Users can view own answers" ON quiz_answers;
CREATE POLICY "Users can view own answers" ON quiz_answers
  FOR SELECT USING (EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create own answers" ON quiz_answers;
CREATE POLICY "Users can create own answers" ON quiz_answers
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()));

-- HR Module Policies (allow authenticated users to view all)
DROP POLICY IF EXISTS "Authenticated can view departments" ON departments;
CREATE POLICY "Authenticated can view departments" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view designations" ON designations;
CREATE POLICY "Authenticated can view designations" ON designations
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view leave_types" ON leave_types;
CREATE POLICY "Authenticated can view leave_types" ON leave_types
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view holidays" ON holidays;
CREATE POLICY "Authenticated can view holidays" ON holidays
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view attendance" ON attendance;
CREATE POLICY "Authenticated can view attendance" ON attendance
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view leaves" ON leaves;
CREATE POLICY "Authenticated can view leaves" ON leaves
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view salary_components" ON salary_components;
CREATE POLICY "Authenticated can view salary_components" ON salary_components
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view payslips" ON payslips;
CREATE POLICY "Authenticated can view payslips" ON payslips
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view performance_reviews" ON performance_reviews;
CREATE POLICY "Authenticated can view performance_reviews" ON performance_reviews
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view goals" ON goals;
CREATE POLICY "Authenticated can view goals" ON goals
  FOR SELECT USING (auth.role() = 'authenticated');;
