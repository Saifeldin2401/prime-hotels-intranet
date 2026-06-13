-- Add approver_role to document_approvals
DO $$ BEGIN
    ALTER TABLE document_approvals 
    ADD COLUMN IF NOT EXISTS approver_role app_role;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
