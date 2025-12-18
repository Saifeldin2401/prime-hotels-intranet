-- Add Missing Indexes for Performance (2025-12-16)

-- 1. Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON public.tasks (created_by_id);
-- (Other tasks indexes exist: assigned_to, status, property, department, due_date)


-- 2. Maintenance Tickets Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_tickets (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_by ON public.maintenance_tickets (reported_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON public.maintenance_tickets (assigned_to);


-- 3. Leave Requests Indexes
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requester_id ON public.leave_requests (requester_id);


-- 4. Compound indexes for common dashboard queries (Property + Status)
CREATE INDEX IF NOT EXISTS idx_tasks_property_status ON public.tasks (property_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_status ON public.maintenance_tickets (property_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_property_status ON public.leave_requests (property_id, status);
