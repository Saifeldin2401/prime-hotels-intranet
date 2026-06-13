BEGIN;

-- 1) Requests table
CREATE TABLE IF NOT EXISTS public.knowledge_content_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending',
    requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_content_requests_requester_id
    ON public.knowledge_content_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_kb_content_requests_status
    ON public.knowledge_content_requests(status);
CREATE INDEX IF NOT EXISTS idx_kb_content_requests_created_at
    ON public.knowledge_content_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_content_requests_property_id
    ON public.knowledge_content_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_kb_content_requests_department_id
    ON public.knowledge_content_requests(department_id);

-- 2) RLS policies
ALTER TABLE public.knowledge_content_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_content_requests_insert ON public.knowledge_content_requests;
CREATE POLICY knowledge_content_requests_insert
    ON public.knowledge_content_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS knowledge_content_requests_select ON public.knowledge_content_requests;
CREATE POLICY knowledge_content_requests_select
    ON public.knowledge_content_requests
    FOR SELECT
    TO authenticated
    USING (
        requester_id = auth.uid()
        OR has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
        OR has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_manager'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('department_head'::app_role)
    );

DROP POLICY IF EXISTS knowledge_content_requests_update ON public.knowledge_content_requests;
CREATE POLICY knowledge_content_requests_update
    ON public.knowledge_content_requests
    FOR UPDATE
    TO authenticated
    USING (
        has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
        OR has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_manager'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('department_head'::app_role)
    )
    WITH CHECK (
        has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
        OR has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_manager'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('department_head'::app_role)
    );

-- 3) RPC to create request + notify admins
CREATE OR REPLACE FUNCTION public.request_knowledge_content(
    p_title text,
    p_description text DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_department_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id uuid;
    v_requester uuid;
BEGIN
    v_requester := auth.uid();
    IF v_requester IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
        RAISE EXCEPTION 'Title is required';
    END IF;

    INSERT INTO public.knowledge_content_requests (
        title,
        description,
        requester_id,
        property_id,
        department_id,
        metadata
    ) VALUES (
        trim(p_title),
        NULLIF(trim(coalesce(p_description, '')), ''),
        v_requester,
        p_property_id,
        p_department_id,
        jsonb_build_object(
            'request_type', 'knowledge_content',
            'requested_title', trim(p_title),
            'requester_id', v_requester
        )
    )
    RETURNING id INTO v_request_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    SELECT DISTINCT
        ur.user_id,
        'request_submitted',
        'KB Content Request: ' || trim(p_title),
        COALESCE(NULLIF(trim(coalesce(p_description, '')), ''), 'A team member requested missing knowledge base content.'),
        '/knowledge',
        jsonb_build_object(
            'request_id', v_request_id,
            'request_type', 'knowledge_content',
            'requested_title', trim(p_title),
            'requester_id', v_requester
        )
    FROM public.user_roles ur
    WHERE ur.role IN ('corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head');

    RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_knowledge_content(text, text, uuid, uuid) TO authenticated;

COMMIT;;
