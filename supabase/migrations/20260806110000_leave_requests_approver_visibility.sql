-- leave_requests only had a SELECT policy for the requester themselves. The Approvals Center
-- (useLeaveRequests.ts -> usePendingLeaveRequests) fetches pending items via an embedded join
-- on this table; under RLS the embedded object comes back null for anyone but the requester,
-- and the code drops nulled rows -- so approvers never saw any pending leave requests, even
-- though approve_leave_request/reject_leave_request (SECURITY DEFINER, already gated by
-- can_approve_leave) would have worked fine if there were anything to click. This adds the
-- missing SELECT policy for users who actually have approval authority over the request.

CREATE POLICY "Approvers can view leave requests in scope" ON public.leave_requests
FOR SELECT
USING (public.can_approve_leave(auth.uid(), property_id, department_id));
