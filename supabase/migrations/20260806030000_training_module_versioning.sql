-- Publishing a module edit rewrote it live in place with no history at all -- no record of
-- what a learner actually certified against, which is exactly what an audit asks for.
-- training_module_versions stores a full JSONB snapshot (module metadata + ordered content
-- blocks) each time a module is published, auto-incrementing per module.

CREATE TABLE IF NOT EXISTS public.training_module_versions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id  uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
    version_number      integer NOT NULL,
    snapshot            jsonb NOT NULL,
    published_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (training_module_id, version_number)
);

COMMENT ON TABLE public.training_module_versions IS
    'Immutable snapshot of a training module (metadata + content blocks) taken each time it is published.';

CREATE INDEX IF NOT EXISTS idx_training_module_versions_module ON public.training_module_versions (training_module_id, version_number DESC);

ALTER TABLE public.training_module_versions ENABLE ROW LEVEL SECURITY;

-- Same authoring/admin roles that can already edit the module itself.
CREATE POLICY training_module_versions_select ON public.training_module_versions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_modules m
        WHERE m.id = training_module_id
          AND (m.created_by = auth.uid() OR m.updated_by = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
    )
);

REVOKE ALL ON public.training_module_versions FROM PUBLIC;
GRANT SELECT ON public.training_module_versions TO authenticated;

-- Snapshotting is done through this function (not direct inserts) so version_number is
-- always correctly sequential and the snapshot always matches the module's real current state.
CREATE OR REPLACE FUNCTION public.snapshot_training_module_version(p_module_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_next_version integer;
    v_module jsonb;
    v_blocks jsonb;
    v_version_id uuid;
BEGIN
    -- Caller must be able to manage this module.
    IF NOT EXISTS (
        SELECT 1 FROM public.training_modules m
        WHERE m.id = p_module_id
          AND (m.created_by = auth.uid() OR m.updated_by = auth.uid()
               OR EXISTS (
                   SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = auth.uid()
                     AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager'])
               ))
    ) THEN
        RAISE EXCEPTION 'Not authorized to version this module';
    END IF;

    SELECT to_jsonb(m) INTO v_module FROM public.training_modules m WHERE m.id = p_module_id;
    IF v_module IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b."order"), '[]'::jsonb)
    INTO v_blocks
    FROM public.training_content_blocks_v b
    WHERE b.training_module_id = p_module_id AND b.is_deleted = false;

    SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.training_module_versions
    WHERE training_module_id = p_module_id;

    INSERT INTO public.training_module_versions (training_module_id, version_number, snapshot, published_by)
    VALUES (
        p_module_id,
        v_next_version,
        jsonb_build_object('module', v_module, 'blocks', v_blocks),
        auth.uid()
    )
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$function$;

COMMENT ON FUNCTION public.snapshot_training_module_version IS
    'Captures a full snapshot of a training module and its content blocks as the next version. Called on publish.';

REVOKE EXECUTE ON FUNCTION public.snapshot_training_module_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.snapshot_training_module_version(uuid) TO authenticated;
