
-- Fix can_view_request function to use SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.can_view_request(request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM requests r
    JOIN profiles req ON req.id = r.requester_id
    WHERE r.id = request_id
      AND (
        r.requester_id = auth.uid() OR
        r.current_assignee_id = auth.uid() OR
        r.supervisor_id = auth.uid() OR
        req.reporting_to = auth.uid() OR
        public.is_hr(auth.uid()) OR
        public.is_admin(auth.uid())
      )
  );
$$;
;
