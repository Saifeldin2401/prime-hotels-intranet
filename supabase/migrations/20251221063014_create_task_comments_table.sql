-- Create task_comments table for task discussions
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task comments
CREATE POLICY "Users can view comments on tasks they have access to"
    ON public.task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id
            AND (
                t.assigned_to_id = auth.uid()
                OR t.created_by_id = auth.uid()
                OR has_property_access(auth.uid(), t.property_id)
            )
        )
    );

CREATE POLICY "Users can create comments on tasks they have access to"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id
            AND (
                t.assigned_to_id = auth.uid()
                OR t.created_by_id = auth.uid()
                OR has_property_access(auth.uid(), t.property_id)
            )
        )
    );

CREATE POLICY "Users can update their own comments"
    ON public.task_comments FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON public.task_comments FOR DELETE
    USING (author_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON public.task_comments(author_id);;
