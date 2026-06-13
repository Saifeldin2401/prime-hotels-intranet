-- Refine and Standardize RLS Policies (2025-12-16)

-- Drop existing inconsistent policies
DROP POLICY IF EXISTS "Property Managers can view tasks for their property" ON tasks;
DROP POLICY IF EXISTS "Regional Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks created by them" ON tasks;

DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Ensure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_properties ENABLE ROW LEVEL SECURITY;

-- 1. Tasks Policies
-- (Columns: created_by_id, assigned_to_id, property_id)

CREATE POLICY "tasks_select_policy" ON tasks FOR SELECT
USING (
  (assigned_to_id = auth.uid()) OR 
  (created_by_id = auth.uid()) OR 
  has_property_access(auth.uid(), property_id) OR
  (
    has_role(auth.uid(), 'department_head') AND 
    department_id IN (SELECT department_id FROM user_departments WHERE user_id = auth.uid())
  )
);

CREATE POLICY "tasks_insert_policy" ON tasks FOR INSERT
WITH CHECK (
  auth.uid() = created_by_id
);

CREATE POLICY "tasks_update_policy" ON tasks FOR UPDATE
USING (
  (assigned_to_id = auth.uid()) OR 
  (created_by_id = auth.uid()) OR 
  has_property_access(auth.uid(), property_id)
);

CREATE POLICY "tasks_delete_policy" ON tasks FOR DELETE
USING (
  (created_by_id = auth.uid()) OR 
  has_property_access(auth.uid(), property_id)
);

-- 2. Maintenance Tickets Policies
-- (Columns: reported_by, assigned_to, property_id)

DROP POLICY IF EXISTS "maintenance_tickets_select" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_insert" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_update" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_select_policy" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_insert_policy" ON maintenance_tickets;
DROP POLICY IF EXISTS "maintenance_tickets_update_policy" ON maintenance_tickets;


CREATE POLICY "maintenance_tickets_select_policy" ON maintenance_tickets FOR SELECT
USING (
  has_property_access(auth.uid(), property_id) OR
  (reported_by = auth.uid()) OR
  (assigned_to = auth.uid())
);

CREATE POLICY "maintenance_tickets_insert_policy" ON maintenance_tickets FOR INSERT
WITH CHECK (
  auth.uid() = reported_by
);

CREATE POLICY "maintenance_tickets_update_policy" ON maintenance_tickets FOR UPDATE
USING (
  has_property_access(auth.uid(), property_id) OR
  (reported_by = auth.uid()) OR
  (assigned_to = auth.uid())
);

-- 3. Leave Requests Policies
-- (Columns: requester_id, property_id)

DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete_policy" ON leave_requests;

CREATE POLICY "leave_requests_select_policy" ON leave_requests FOR SELECT
USING (
  (requester_id = auth.uid()) OR 
  has_property_access(auth.uid(), property_id) OR
  (
    has_role(auth.uid(), 'department_head') AND 
    department_id IN (SELECT department_id FROM user_departments WHERE user_id = auth.uid())
  )
);

CREATE POLICY "leave_requests_insert_policy" ON leave_requests FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
);

CREATE POLICY "leave_requests_update_policy" ON leave_requests FOR UPDATE
USING (
  (requester_id = auth.uid() AND status = 'pending') OR 
  has_property_access(auth.uid(), property_id) OR
  (
    has_role(auth.uid(), 'department_head') AND 
    department_id IN (SELECT department_id FROM user_departments WHERE user_id = auth.uid())
  )
);

CREATE POLICY "leave_requests_delete_policy" ON leave_requests FOR DELETE
USING (
  (requester_id = auth.uid() AND status = 'pending') OR 
  has_property_access(auth.uid(), property_id)
);

-- 4. Profiles and User Properties
DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON profiles;

CREATE POLICY "profiles_read_all_authenticated" ON profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "user_properties_select" ON user_properties;
DROP POLICY IF EXISTS "user_properties_select_own_or_admin" ON user_properties;

CREATE POLICY "user_properties_select_own_or_admin" ON user_properties FOR SELECT
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'regional_admin') OR
  has_role(auth.uid(), 'regional_hr') OR
  has_role(auth.uid(), 'property_manager')
);
