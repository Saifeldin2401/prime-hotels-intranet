-- Migration: Enforce Foreign Key Constraints for Job Titles

-- 1. Profiles Table
-- Ensure all current data is valid before adding constraint (we already manually fixed this, but good practice in a script)
UPDATE profiles 
SET job_title = NULL 
WHERE job_title NOT IN (SELECT title FROM job_titles);

ALTER TABLE profiles
ADD CONSTRAINT profiles_job_title_fkey
FOREIGN KEY (job_title)
REFERENCES job_titles(title)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- 2. Onboarding Templates Table
UPDATE onboarding_templates
SET job_title = NULL
WHERE job_title NOT IN (SELECT title FROM job_titles);

ALTER TABLE onboarding_templates
ADD CONSTRAINT onboarding_templates_job_title_fkey
FOREIGN KEY (job_title)
REFERENCES job_titles(title)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- 3. Job Postings Table
-- Assuming 'title' is the column name based on checking earlier
UPDATE job_postings
SET title = NULL
WHERE title NOT IN (SELECT title FROM job_titles);

ALTER TABLE job_postings
ADD CONSTRAINT job_postings_title_fkey
FOREIGN KEY (title)
REFERENCES job_titles(title)
ON UPDATE CASCADE
ON DELETE SET NULL;
