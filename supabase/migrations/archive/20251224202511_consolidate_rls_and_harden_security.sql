-- ============================================
-- SECURITY HARDENING & RLS CONSOLIDATION
-- 1. Profiles: Ensure Read-All (Directory), but Write-Safe
-- 2. Tasks/Requests: Remove duplicate policies
-- 3. Storage: Lock down 'Public' reads
-- ============================================

-- ----------------------------------------------------------------
-- 1. PROFILES (Directory Mode)
-- ----------------------------------------------------------------
-- Drop ANY existing profile policies to start clean
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_manage_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- Policy 1: Authentication Users can SEE everyone (Directory)
CREATE POLICY "profiles_read_all" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Users can UPDATE themselves
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (id = auth.uid());

-- Policy 3: Admins/HR can MANAGE everyone
CREATE POLICY "profiles_manage_admin" ON profiles
FOR ALL USING (
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr'])
);

-- ----------------------------------------------------------------
-- 2. STORAGE (Lock Down Documents)
-- ----------------------------------------------------------------
-- Drop insecure public policies
DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read maintenance" ON storage.objects;
DROP POLICY IF EXISTS "Resumes Public Access" ON storage.objects; -- Was ALL access!

-- Create SCURE policies for documents bucket
CREATE POLICY "documents_read_authenticated" ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- 3. TASKS & REQUESTS (Consolidate Duplicates)
-- ----------------------------------------------------------------
-- Drop old overlapping policies on tasks
DROP POLICY IF EXISTS "tasks_select_by_property" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Recreate UNIFIED Tasks Policies
-- Select: Own, Assigned, or Management View
CREATE POLICY "tasks_select_unified" ON tasks
FOR SELECT USING (
  created_by_id = auth.uid() OR
  assigned_to_id = auth.uid() OR
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']) OR
  (auth_has_role(auth.uid(), 'property_manager') AND check_property_access(property_id)) OR
  (auth_has_role(auth.uid(), 'department_head') AND check_property_access(property_id) AND department_id IN (SELECT department_id FROM user_departments WHERE user_id = auth.uid()))
);

-- Manage: Admin/Manager or Creator/Assignee (Update status)
CREATE POLICY "tasks_manage_unified" ON tasks
FOR ALL USING (
  created_by_id = auth.uid() OR -- Creator can edit/delete
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']) OR
  (auth_has_role(auth.uid(), 'property_manager') AND check_property_access(property_id))
);

-- Note: Assignee can only UPDATE specific fields? For now, allowing update access if assigned.
CREATE POLICY "tasks_update_assigned" ON tasks
FOR UPDATE USING (assigned_to_id = auth.uid());

-- ----------------------------------------------------------------
-- 4. HARDEN SECURITY DEFINER FUNCTIONS (Search Path)
-- ----------------------------------------------------------------
-- Helper to secure function safely
CREATE OR REPLACE FUNCTION can_approve_leave(request_id uuid, approver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- HARDENED
AS $$
DECLARE
  approver_role TEXT;
  approver_properties UUID[];
  approver_departments UUID[];
  req_prop_id UUID;
  req_dept_id UUID;
BEGIN
  -- Get Request Context
  SELECT property_id, department_id INTO req_prop_id, req_dept_id
  FROM leave_requests WHERE id = request_id;

  -- Get Role (Deterministic Sort)
  SELECT role::text INTO approver_role
  FROM public.user_roles -- Fully qualified
  WHERE user_id = approver_id
  ORDER BY 
    CASE role
        WHEN 'regional_admin' THEN 1
        WHEN 'regional_hr' THEN 2
        WHEN 'property_manager' THEN 3
        WHEN 'property_hr' THEN 4
        WHEN 'department_head' THEN 5
        ELSE 10
    END
  LIMIT 1;

  IF approver_role IN ('regional_admin', 'regional_hr') THEN
    RETURN TRUE;
  END IF;

  IF approver_role IN ('property_manager', 'property_hr', 'department_head') THEN
     -- Check Property Access
    IF NOT EXISTS (SELECT 1 FROM user_properties WHERE user_id = approver_id AND property_id = req_prop_id) THEN
      RETURN FALSE;
    END IF;

    -- Check Department Access for Dept Heads
    IF approver_role = 'department_head' THEN
       IF NOT EXISTS (SELECT 1 FROM user_departments WHERE user_id = approver_id AND department_id = req_dept_id) THEN
         RETURN FALSE;
       END IF;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;;
