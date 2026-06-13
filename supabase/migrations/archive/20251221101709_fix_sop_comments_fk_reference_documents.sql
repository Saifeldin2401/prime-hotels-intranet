BEGIN;

-- Drop the restrictive existing foreign key
ALTER TABLE sop_comments DROP CONSTRAINT sop_comments_document_id_fkey;

-- Add new foreign key referencing the main documents table
ALTER TABLE sop_comments 
    ADD CONSTRAINT sop_comments_document_id_fkey 
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

COMMIT;;
