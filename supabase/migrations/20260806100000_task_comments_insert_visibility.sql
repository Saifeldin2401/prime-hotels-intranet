-- task_comments_insert_policy only checked author_id = auth.uid() and that the task row
-- exists -- it never confirmed the caller can actually SEE that task (unlike the SELECT
-- policy, which correctly restricts to the task's creator/assignee/watchers). A user who knows
-- or guesses a task_id they have no access to could still insert a comment on it via a direct
-- API call. Align the INSERT check with the SELECT policy's visibility rule.

DROP POLICY IF EXISTS task_comments_insert_policy ON public.task_comments;
CREATE POLICY task_comments_insert_policy ON public.task_comments
FOR INSERT
WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.id = task_comments.task_id
          AND (
              auth.uid() = tasks.created_by_id
              OR auth.uid() = tasks.assigned_to_id
              OR EXISTS (
                  SELECT 1 FROM public.task_watchers
                  WHERE task_watchers.task_id = tasks.id
                    AND task_watchers.user_id = auth.uid()
              )
          )
    )
);
