-- Remove Duplicate Departments - Complete Version
-- Update ALL tables that reference departments

-- Update documents
UPDATE documents SET department_id = '00000000-0000-0000-0000-000000000003' WHERE department_id = 'ff96a9ed-355a-4647-83d5-3bdbe99bb337';
UPDATE documents SET department_id = '00000000-0000-0000-0000-000000000001' WHERE department_id = '7d9e787b-6166-4232-8388-461b5f2c0908';
UPDATE documents SET department_id = '00000000-0000-0000-0000-000000000002' WHERE department_id = '2436d662-1c88-445e-8465-794d8df8ceb4';
UPDATE documents SET department_id = '00000000-0000-0000-0000-000000000010' WHERE department_id = 'c9b76c1c-d71a-4898-89e7-19ceefef236c';
UPDATE documents SET department_id = '00000000-0000-0000-0000-000000000007' WHERE department_id = 'ede272f3-e9f0-40b0-b821-afdc9e4a6848';

-- Update job_titles
UPDATE job_titles SET department_id = '00000000-0000-0000-0000-000000000003' WHERE department_id = 'ff96a9ed-355a-4647-83d5-3bdbe99bb337';
UPDATE job_titles SET department_id = '00000000-0000-0000-0000-000000000001' WHERE department_id = '7d9e787b-6166-4232-8388-461b5f2c0908';
UPDATE job_titles SET department_id = '00000000-0000-0000-0000-000000000002' WHERE department_id = '2436d662-1c88-445e-8465-794d8df8ceb4';
UPDATE job_titles SET department_id = '00000000-0000-0000-0000-000000000010' WHERE department_id = 'c9b76c1c-d71a-4898-89e7-19ceefef236c';
UPDATE job_titles SET department_id = '00000000-0000-0000-0000-000000000007' WHERE department_id = 'ede272f3-e9f0-40b0-b821-afdc9e4a6848';

-- Update tasks
UPDATE tasks SET department_id = '00000000-0000-0000-0000-000000000003' WHERE department_id = 'ff96a9ed-355a-4647-83d5-3bdbe99bb337';
UPDATE tasks SET department_id = '00000000-0000-0000-0000-000000000001' WHERE department_id = '7d9e787b-6166-4232-8388-461b5f2c0908';
UPDATE tasks SET department_id = '00000000-0000-0000-0000-000000000002' WHERE department_id = '2436d662-1c88-445e-8465-794d8df8ceb4';
UPDATE tasks SET department_id = '00000000-0000-0000-0000-000000000010' WHERE department_id = 'c9b76c1c-d71a-4898-89e7-19ceefef236c';
UPDATE tasks SET department_id = '00000000-0000-0000-0000-000000000007' WHERE department_id = 'ede272f3-e9f0-40b0-b821-afdc9e4a6848';

-- Update training_modules
UPDATE training_modules SET department_id = '00000000-0000-0000-0000-000000000003' WHERE department_id = 'ff96a9ed-355a-4647-83d5-3bdbe99bb337';
UPDATE training_modules SET department_id = '00000000-0000-0000-0000-000000000001' WHERE department_id = '7d9e787b-6166-4232-8388-461b5f2c0908';
UPDATE training_modules SET department_id = '00000000-0000-0000-0000-000000000002' WHERE department_id = '2436d662-1c88-445e-8465-794d8df8ceb4';
UPDATE training_modules SET department_id = '00000000-0000-0000-0000-000000000010' WHERE department_id = 'c9b76c1c-d71a-4898-89e7-19ceefef236c';
UPDATE training_modules SET department_id = '00000000-0000-0000-0000-000000000007' WHERE department_id = 'ede272f3-e9f0-40b0-b821-afdc9e4a6848';

-- Update document_categories
UPDATE document_categories SET department_id = '00000000-0000-0000-0000-000000000003' WHERE department_id = 'ff96a9ed-355a-4647-83d5-3bdbe99bb337';
UPDATE document_categories SET department_id = '00000000-0000-0000-0000-000000000001' WHERE department_id = '7d9e787b-6166-4232-8388-461b5f2c0908';
UPDATE document_categories SET department_id = '00000000-0000-0000-0000-000000000002' WHERE department_id = '2436d662-1c88-445e-8465-794d8df8ceb4';
UPDATE document_categories SET department_id = '00000000-0000-0000-0000-000000000010' WHERE department_id = 'c9b76c1c-d71a-4898-89e7-19ceefef236c';
UPDATE document_categories SET department_id = '00000000-0000-0000-0000-000000000007' WHERE department_id = 'ede272f3-e9f0-40b0-b821-afdc9e4a6848';

-- Delete the duplicate departments
DELETE FROM departments WHERE id IN (
    'ff96a9ed-355a-4647-83d5-3bdbe99bb337',
    '7d9e787b-6166-4232-8388-461b5f2c0908',
    '2436d662-1c88-445e-8465-794d8df8ceb4',
    'c9b76c1c-d71a-4898-89e7-19ceefef236c',
    'ede272f3-e9f0-40b0-b821-afdc9e4a6848'
);;
