ALTER TABLE training_assignment_rules
ADD COLUMN job_title_id UUID REFERENCES job_titles(id) ON DELETE CASCADE;
