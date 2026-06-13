-- Speed up common inbox queries (assignee + status)

CREATE INDEX IF NOT EXISTS idx_requests_assignee_status_created_at
  ON public.requests (current_assignee_id, status, created_at DESC);
