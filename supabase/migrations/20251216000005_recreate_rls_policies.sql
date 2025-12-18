/*
* Recreate RLS policies dropped during enum unification
* 
* Tables affected:
* - tasks
* - maintenance_tickets
* - leave_requests
* - job_postings
*/

-- Tasks Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks assigned to them" 
ON tasks FOR SELECT 
TO authenticated 
USING (auth.uid() = assigned_to_id);

CREATE POLICY "Users can view tasks created by them" 
ON tasks FOR SELECT 
TO authenticated 
USING (auth.uid() = created_by_id);

CREATE POLICY "Regional Admins can view all tasks" 
ON tasks FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'regional_admin'
  )
);

CREATE POLICY "Property Managers can view tasks for their property" 
ON tasks FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('property_manager', 'property_hr')
  ) AND 
  property_id IN (
    SELECT property_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create tasks" 
ON tasks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Users can update tasks assigned to them" 
ON tasks FOR UPDATE 
TO authenticated 
USING (auth.uid() = assigned_to_id OR auth.uid() = created_by_id);


-- Maintenance Tickets Policies
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets reported by them" 
ON maintenance_tickets FOR SELECT 
TO authenticated 
USING (auth.uid() = reported_by);

CREATE POLICY "Users can view tickets assigned to them" 
ON maintenance_tickets FOR SELECT 
TO authenticated 
USING (auth.uid() = assigned_to);

CREATE POLICY "Property Staff can view tickets for their property" 
ON maintenance_tickets FOR SELECT 
TO authenticated 
USING (
  property_id IN (
    SELECT property_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create tickets" 
ON maintenance_tickets FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Assigned users can update tickets" 
ON maintenance_tickets FOR UPDATE 
TO authenticated 
USING (auth.uid() = assigned_to OR auth.uid() = reported_by);


-- Leave Requests Policies
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leave requests" 
ON leave_requests FOR SELECT 
TO authenticated 
USING (auth.uid() = requester_id);

CREATE POLICY "Managers can view leave requests for their department" 
ON leave_requests FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('department_head', 'property_manager', 'property_hr', 'regional_admin')
  ) AND (
    department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid()) OR
    property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create leave requests" 
ON leave_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Managers can update leave requests" 
ON leave_requests FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('department_head', 'property_manager', 'property_hr', 'regional_admin')
  )
);


-- Job Postings Policies
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for published jobs" 
ON job_postings FOR SELECT 
TO authenticated 
USING (status = 'open' OR status = 'published');

CREATE POLICY "HR can manage job postings" 
ON job_postings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('regional_hr', 'property_hr', 'regional_admin')
  )
);
