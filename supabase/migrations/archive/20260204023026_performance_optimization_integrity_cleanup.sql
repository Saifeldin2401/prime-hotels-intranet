-- Cleanup Duplicate Indexes found in Phase 2
DROP INDEX IF EXISTS idx_job_postings_department;
DROP INDEX IF EXISTS idx_job_postings_property;
DROP INDEX IF EXISTS idx_knowledge_related_articles_doc;

-- Add Missing Indexes for Learning Certificates System
CREATE INDEX IF NOT EXISTS idx_certificate_history_performed_by ON certificate_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_certificates_quiz_attempt_id ON certificates(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_certificates_revoked_by ON certificates(revoked_by);
;
