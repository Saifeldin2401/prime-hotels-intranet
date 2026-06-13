-- Add foreign key constraint for linked_sop_id to documents table
ALTER TABLE knowledge_questions
ADD CONSTRAINT knowledge_questions_linked_sop_id_fkey
FOREIGN KEY (linked_sop_id)
REFERENCES documents(id)
ON DELETE SET NULL;
