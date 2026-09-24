CREATE POLICY "Approvers can view leave requests in scope" ON public.leave_requests
FOR SELECT
USING (public.can_approve_leave(auth.uid(), property_id, department_id));
