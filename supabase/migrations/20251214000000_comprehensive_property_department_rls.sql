-- Migration: Comprehensive Property & Department RLS Policies
-- Purpose: Ensure all tables with property_id/department_id enforce proper scoping
-- Date: 2025-12-14

-- ============================================================================
-- HELPER FUNCTION: Get user's assigned properties
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_properties(user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(property_id), ARRAY[]::UUID[])
  FROM public.user_properties
  WHERE user_id = $1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get user's assigned departments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_departments(user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(department_id), ARRAY[]::UUID[])
  FROM public.user_departments
  WHERE user_id = $1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user is regional admin or higher
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_regional_admin_or_higher(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = $1
    AND role IN ('regional_admin', 'regional_hr')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user can approve leave in this property/department
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_approve_leave(
  approver_id UUID,
  request_property_id UUID,
  request_department_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  approver_role TEXT;
  approver_properties UUID[];
  approver_departments UUID[];
BEGIN
  -- Get approver's role (get first role, typically users have one primary role)
  SELECT role INTO approver_role
  FROM public.user_roles
  WHERE user_id = approver_id
  LIMIT 1;

  -- Regional admins can approve anything
  IF approver_role IN ('regional_admin', 'regional_hr') THEN
    RETURN TRUE;
  END IF;

  -- Property-level roles must be in the same property
  IF approver_role IN ('property_manager', 'property_hr', 'department_head') THEN
    SELECT get_user_properties(approver_id) INTO approver_properties;
    
    -- Check if approver is assigned to this property
    IF NOT (request_property_id = ANY(approver_properties)) THEN
      RETURN FALSE;
    END IF;

    -- Department heads must also be in the same department
    IF approver_role = 'department_head' THEN
      SELECT get_user_departments(approver_id) INTO approver_departments;
      RETURN request_department_id = ANY(approver_departments);
    END IF;

    RETURN TRUE;
  END IF;

  -- Staff cannot approve
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- RLS POLICIES: TASKS
-- ============================================================================

-- Drop existing property isolation policy if it exists
DROP POLICY IF EXISTS "property_isolation_tasks" ON public.tasks;

-- SELECT: Users can view tasks in their properties (or all if regional admin)
CREATE POLICY "tasks_select_by_property"
ON public.tasks
FOR SELECT
USING (
  is_regional_admin_or_higher(auth.uid())
  OR property_id = ANY(get_user_properties(auth.uid()))
);

-- INSERT: Users can create tasks in their assigned properties only
CREATE POLICY "tasks_insert_scoped"
ON public.tasks
FOR INSERT
WITH CHECK (
  property_id = ANY(get_user_properties(auth.uid()))
  AND (
    department_id IS NULL
    OR department_id = ANY(get_user_departments(auth.uid()))
  )
);

-- UPDATE: Users can update tasks in their properties
CREATE POLICY "tasks_update_scoped"
ON public.tasks
FOR UPDATE
USING (
  is_regional_admin_or_higher(auth.uid())
  OR property_id = ANY(get_user_properties(auth.uid()))
);

-- DELETE: Only admins and managers can delete tasks
CREATE POLICY "tasks_delete_managers"
ON public.tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('property_manager', 'regional_admin')
  )
);

-- ============================================================================
-- RLS POLICIES: MAINTENANCE TICKETS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view maintenance tickets for their property" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users can create maintenance tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.maintenance_tickets;

-- SELECT: View tickets in assigned properties
CREATE POLICY "maintenance_select_by_property"
ON public.maintenance_tickets
FOR SELECT
USING (
  is_regional_admin_or_higher(auth.uid())
  OR property_id = ANY(get_user_properties(auth.uid()))
);

-- INSERT: Create tickets with property context
CREATE POLICY "maintenance_insert_scoped"
ON public.maintenance_tickets
FOR INSERT
WITH CHECK (
  property_id = ANY(get_user_properties(auth.uid()))
);

-- UPDATE: Update own tickets or if maintenance role
CREATE POLICY "maintenance_update_scoped"
ON public.maintenance_tickets
FOR UPDATE
USING (
  reporter_id = auth.uid()
  OR assigned_to_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('property_manager', 'regional_admin')
  )
);

-- ============================================================================
-- RLS POLICIES: LEAVE REQUESTS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update their pending requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "property_isolation_leave_requests" ON public.leave_requests;

-- SELECT: View own requests or property requests if manager/HR
CREATE POLICY "leave_select_scoped"
ON public.leave_requests
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_regional_admin_or_higher(auth.uid())
  OR (
    property_id = ANY(get_user_properties(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('property_hr', 'property_manager', 'department_head')
    )
  )
);

-- INSERT: Create leave requests with user's property/department
CREATE POLICY "leave_insert_scoped"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND property_id = ANY(get_user_properties(auth.uid()))
  AND (
    department_id IS NULL
    OR department_id = ANY(get_user_departments(auth.uid()))
 )
);

-- UPDATE: Update own pending requests OR approve if authorized
CREATE POLICY "leave_update_scoped"
ON public.leave_requests
FOR UPDATE
USING (
  -- Own pending requests
  (user_id = auth.uid() AND status = 'pending')
  -- OR can approve this request
  OR can_approve_leave(auth.uid(), property_id, department_id)
)
WITH CHECK (
  -- Own pending requests
  (user_id = auth.uid() AND status = 'pending')
  -- OR can approve this request
  OR can_approve_leave(auth.uid(), property_id, department_id)
);

-- ============================================================================
-- RLS POLICIES: MESSAGES
-- ============================================================================

-- SELECT: View messages in assigned properties/departments
CREATE POLICY "messages_select_scoped"
ON public.messages
FOR SELECT
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR is_regional_admin_or_higher(auth.uid())
  OR (
    property_id IS NOT NULL
    AND property_id = ANY(get_user_properties(auth.uid()))
  )
  OR (
    department_id IS NOT NULL
    AND department_id = ANY(get_user_departments(auth.uid()))
  )
);

-- INSERT: Create messages with proper scoping
CREATE POLICY "messages_insert_scoped"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    property_id IS NULL
    OR property_id = ANY(get_user_properties(auth.uid()))
  )
  AND (
    department_id IS NULL
    OR department_id = ANY(get_user_departments(auth.uid()))
  )
);

-- UPDATE: Update own messages
CREATE POLICY "messages_update_own"
ON public.messages
FOR UPDATE
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: SOP DOCUMENTS
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Published SOPs are viewable by all authenticated users" ON public.sop_documents;

-- SELECT: View published SOPs in assigned properties/departments
CREATE POLICY "sop_select_scoped"
ON public.sop_documents
FOR SELECT
USING (
  status = 'published'
  AND (
    is_regional_admin_or_higher(auth.uid())
    OR property_id IS NULL
    OR property_id = ANY(get_user_properties(auth.uid()))
  )
  AND (
    department_id IS NULL
    OR department_id = ANY(get_user_departments(auth.uid()))
  )
);

-- INSERT: Create SOPs with property/department context
CREATE POLICY "sop_insert_scoped"
ON public.sop_documents
FOR INSERT
WITH CHECK (
  (
    property_id IS NULL
    OR property_id = ANY(get_user_properties(auth.uid()))
  )
  AND (
    department_id IS NULL
    OR department_id = ANY(get_user_departments(auth.uid()))
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('property_manager', 'department_head', 'regional_admin')
  )
);

-- UPDATE: Update own SOPs or if admin
CREATE POLICY "sop_update_scoped"
ON public.sop_documents
FOR UPDATE
USING (
  created_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'regional_admin'
  )
);

-- ============================================================================
-- RLS POLICIES: JOB POSTINGS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view open job postings" ON public.job_postings;
DROP POLICY IF EXISTS "Authenticated users can view job postings" ON public.job_postings;

-- SELECT: Public can view open postings, authenticated users see property-scoped
CREATE POLICY "job_postings_select_scoped"
ON public.job_postings
FOR SELECT
USING (
  status = 'open'
  AND (
    auth.uid() IS NULL  -- Public
    OR is_regional_admin_or_higher(auth.uid())
    OR property_id = ANY(get_user_properties(auth.uid()))
  )
);

-- INSERT: Create postings with property/department
CREATE POLICY "job_postings_insert_scoped"
ON public.job_postings
FOR INSERT
WITH CHECK (
  property_id = ANY(get_user_properties(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('property_hr', 'property_manager', 'regional_hr')
  )
);

-- ============================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_dept ON public.tasks(property_id, department_id);

-- Maintenance Tickets
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON public.maintenance_tickets(property_id);

-- Leave Requests
CREATE INDEX IF NOT EXISTS idx_leave_property_id ON public.leave_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_leave_department_id ON public.leave_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_property_dept ON public.leave_requests(property_id, department_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON public.messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_department_id ON public.messages(department_id);

-- SOP Documents
CREATE INDEX IF NOT EXISTS idx_sop_property_id ON public.sop_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_sop_department_id ON public.sop_documents(department_id);

-- Job Postings
CREATE INDEX IF NOT EXISTS idx_job_postings_property_id ON public.job_postings(property_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_department_id ON public.job_postings(department_id);

-- Shifts
CREATE INDEX IF NOT EXISTS idx_shifts_property_id ON public.shifts(property_id);
CREATE INDEX IF NOT EXISTS idx_shifts_department_id ON public.shifts(department_id);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_certificates_property_id ON public.certificates(property_id);
CREATE INDEX IF NOT EXISTS idx_certificates_department_id ON public.certificates(department_id);

-- ============================================================================
-- REFRESH SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
