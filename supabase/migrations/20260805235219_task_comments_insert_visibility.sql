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
