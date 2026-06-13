-- Apply unified entity_status enum to status columns

ALTER TABLE tasks
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'todo'::entity_status;

ALTER TABLE maintenance_tickets
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'open'::entity_status;

ALTER TABLE leave_requests
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'pending'::entity_status;

ALTER TABLE job_postings
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'draft'::entity_status;
;
