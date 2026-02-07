-- Add entity_type and entity_id to temporary_approvers for approval-specific delegation
-- When set, delegation applies only to the specific approval (entity_type + entity_id)
-- When null, delegation is scope-based (property/department/all) as before

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE public.temporary_approvers 
    ADD COLUMN entity_type TEXT;
    
    COMMENT ON COLUMN public.temporary_approvers.entity_type IS 'Type of entity being delegated (e.g., leave_request, document_approval). When set, delegation is specific to this entity. When null, delegation is scope-based.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE public.temporary_approvers 
    ADD COLUMN entity_id UUID;
    
    COMMENT ON COLUMN public.temporary_approvers.entity_id IS 'ID of the specific entity being delegated. When set with entity_type, delegation applies only to this specific approval.';
  END IF;

  -- Add constraint: if entity_type is set, entity_id must also be set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'temporary_approvers' AND constraint_name = 'temporary_approvers_entity_check'
  ) THEN
    ALTER TABLE public.temporary_approvers
    ADD CONSTRAINT temporary_approvers_entity_check 
    CHECK (
      (entity_type IS NULL AND entity_id IS NULL) OR
      (entity_type IS NOT NULL AND entity_id IS NOT NULL)
    );
  END IF;

  -- Add index for efficient lookups
  CREATE INDEX IF NOT EXISTS idx_temporary_approvers_entity 
  ON public.temporary_approvers(entity_type, entity_id) 
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
END $$;

